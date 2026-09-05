/**
 * RealtimeService — Gerenciador Central de Conexão SSE e Eventos Realtime do CENTRAL NOX V2.
 *
 * Características arquiteturais:
 * 1. Reference Counting: múltiplos ouvintes locais na mesma coleção compartilham 1 única subscrição PocketBase.
 * 2. PROIBIÇÃO ABSOLUTA de unsubscribe('*'): desassina no PB apenas quando ouvintes locais = 0.
 * 3. Normalização de eventos para formato interno RealtimeEvent:
 *    { domain, action: 'create' | 'update' | 'delete', recordId, payload, receivedAt }
 * 4. Estados de conexão auditáveis: ONLINE, RECONNECTING, OFFLINE.
 * 5. Backoff exponencial com teto e tolerância a falhas.
 * 6. RESYNC OBRIGATÓRIO pós-reconexão com listeners registrados.
 * 7. Deduplicação canônica por ID e ordenação determinística de timelines.
 * 8. Classificação de erros e telemetria mínima sem vazamento de dados sensíveis.
 * 9. Lifecycle limpo: encerramento no logout e reset de estado no login.
 */

import pb from '@/lib/pocketbase/client'
import {
  AppError,
  AuthenticationError,
  PermissionError,
  NetworkError,
} from '@/core/errors/AppErrors'

export type RealtimeAction = 'create' | 'update' | 'delete'

export type RealtimeStatus = 'ONLINE' | 'RECONNECTING' | 'OFFLINE'

export interface RealtimeEvent<T = Record<string, unknown>> {
  domain: string
  action: RealtimeAction
  recordId: string
  payload: T
  receivedAt: string
}

export type RealtimeListener<T = Record<string, unknown>> = (event: RealtimeEvent<T>) => void

export type ConnectionStateListener = (
  status: RealtimeStatus,
  details?: { attempt?: number; error?: string },
) => void

export type ResyncListener = (domain: string, lastSeenTimestamp?: string) => Promise<void> | void

export interface TelemetryLog {
  timestamp: string
  type: 'CONNECT' | 'DISCONNECT' | 'RECONNECT' | 'SUB_FAIL' | 'RESYNC_FAIL' | 'RESYNC_OK'
  domain?: string
  attempt?: number
  message?: string
}

interface CollectionSubscription {
  domain: string
  collectionName: string
  listeners: Set<RealtimeListener<any>>
  unsubscribePb?: () => Promise<void>
  isSubscribing: boolean
  lastSeenTimestamp?: string
}

export class RealtimeService {
  private static instance: RealtimeService | null = null

  private status: RealtimeStatus = 'OFFLINE'
  private connectionListeners: Set<ConnectionStateListener> = new Set()
  private resyncListeners: Set<ResyncListener> = new Set()
  private subscriptions: Map<string, CollectionSubscription> = new Map()
  private telemetryLogs: TelemetryLog[] = []
  private readonly maxTelemetryLogs = 100

  // Controle de reconexão
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly baseReconnectDelayMs = 1000
  private readonly maxReconnectDelayMs = 30000
  private reconnectTimer: any = null
  private isIntentionalDisconnect = false

  private constructor() {
    this.initNetworkMonitoring()
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService()
    }
    return RealtimeService.instance
  }

  private initNetworkMonitoring(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.logTelemetry({ type: 'CONNECT', message: 'Navegador online detectado.' })
        this.handleNetworkOnline()
      })
      window.addEventListener('offline', () => {
        this.logTelemetry({ type: 'DISCONNECT', message: 'Navegador offline detectado.' })
        this.setStatus('OFFLINE')
      })
    }
    // Estado inicial baseado na conectividade e auth
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.status = 'OFFLINE'
    } else if (pb.authStore.isValid) {
      this.status = 'ONLINE'
    } else {
      this.status = 'OFFLINE'
    }
  }

  // ============================================================================
  // STATUS E TELEMETRIA
  // ============================================================================

  public getStatus(): RealtimeStatus {
    return this.status
  }

  public onConnectionChange(listener: ConnectionStateListener): () => void {
    this.connectionListeners.add(listener)
    listener(this.status)
    return () => {
      this.connectionListeners.delete(listener)
    }
  }

  public onResync(listener: ResyncListener): () => void {
    this.resyncListeners.add(listener)
    return () => {
      this.resyncListeners.delete(listener)
    }
  }

  private setStatus(
    newStatus: RealtimeStatus,
    details?: { attempt?: number; error?: string },
  ): void {
    if (this.status === newStatus && !details) return
    this.status = newStatus
    this.connectionListeners.forEach((listener) => {
      try {
        listener(this.status, details)
      } catch (err) {
        console.warn('[RealtimeService] Erro em listener de conexao:', err)
      }
    })
  }

  private logTelemetry(entry: Omit<TelemetryLog, 'timestamp'>): void {
    const log: TelemetryLog = {
      ...entry,
      timestamp: new Date().toISOString(),
    }
    this.telemetryLogs.unshift(log)
    if (this.telemetryLogs.length > this.maxTelemetryLogs) {
      this.telemetryLogs.pop()
    }
  }

  public getTelemetryLogs(): readonly TelemetryLog[] {
    return this.telemetryLogs
  }

  // ============================================================================
  // SUBSCRIPTION COM REFERENCE COUNTING
  // ============================================================================

  /**
   * Assina uma coleção com reference counting.
   * Retorna uma função de cleanup exclusiva para este listener.
   * Quando o último listener da coleção desassinar, desfaz a subscrição PocketBase.
   */
  public subscribe<T = Record<string, unknown>>(
    collectionName: string,
    listener: RealtimeListener<T>,
    domain: string = collectionName,
  ): () => void {
    let sub = this.subscriptions.get(collectionName)

    if (!sub) {
      sub = {
        domain,
        collectionName,
        listeners: new Set(),
        isSubscribing: false,
      }
      this.subscriptions.set(collectionName, sub)
    }

    sub.listeners.add(listener as RealtimeListener<any>)

    // Se ainda não estiver conectado no PocketBase para esta coleção, conecta
    if (!sub.unsubscribePb && !sub.isSubscribing) {
      this.activatePocketBaseSubscription(sub)
    }

    // Retorna cleanup individual determinístico
    return () => {
      this.unsubscribe(collectionName, listener as RealtimeListener<any>)
    }
  }

  private unsubscribe(collectionName: string, listener: RealtimeListener<any>): void {
    const sub = this.subscriptions.get(collectionName)
    if (!sub) return

    sub.listeners.delete(listener)

    // Se não há mais ouvintes nesta coleção, encerra a subscrição do PB
    if (sub.listeners.size === 0) {
      if (sub.unsubscribePb) {
        sub.unsubscribePb().catch(() => {})
        sub.unsubscribePb = undefined
      }
      this.subscriptions.delete(collectionName)
    }
  }

  private async activatePocketBaseSubscription(sub: CollectionSubscription): Promise<void> {
    // Se o authStore do PocketBase for inválido, não tenta assinar coleções protegidas
    if (!pb.authStore.isValid && sub.collectionName.startsWith('nox_')) {
      return
    }

    sub.isSubscribing = true

    try {
      const unsubFn = await pb.collection(sub.collectionName).subscribe('*', (e: any) => {
        this.handleIncomingRawEvent(sub, e)
      })

      sub.unsubscribePb = unsubFn
      sub.isSubscribing = false
      this.setStatus('ONLINE')
      this.logTelemetry({
        type: 'CONNECT',
        domain: sub.domain,
        message: `Subscricao ativa na colecao ${sub.collectionName}`,
      })
    } catch (err: any) {
      sub.isSubscribing = false
      const classified = this.classifyError(err, sub.collectionName)

      this.logTelemetry({
        type: 'SUB_FAIL',
        domain: sub.domain,
        message: classified.message,
      })

      // Se for erro de autenticação/permissão, não entra em reconnect infinito
      if (classified instanceof AuthenticationError || classified instanceof PermissionError) {
        this.setStatus('OFFLINE', { error: classified.message })
        return
      }

      // Erro de rede ou transitório inicia reconnect com backoff
      this.scheduleReconnect()
    }
  }

  // ============================================================================
  // NORMALIZAÇÃO DE EVENTOS
  // ============================================================================

  private handleIncomingRawEvent(sub: CollectionSubscription, rawEvent: any): void {
    const rawAction = String(rawEvent?.action || '').toLowerCase()
    let action: RealtimeAction = 'update'
    if (rawAction === 'create') action = 'create'
    else if (rawAction === 'delete') action = 'delete'
    else if (rawAction === 'update') action = 'update'

    const record = rawEvent?.record || {}
    const recordId = String(record.id || rawEvent?.recordId || '')

    const normalized: RealtimeEvent<any> = {
      domain: sub.domain,
      action,
      recordId,
      payload: record,
      receivedAt: new Date().toISOString(),
    }

    // Atualiza marcador de último evento visto para ressincronização inteligente
    const recTimestamp = record.updated || record.created
    if (recTimestamp) {
      sub.lastSeenTimestamp = recTimestamp
    }

    // Notifica todos os ouvintes registrados
    sub.listeners.forEach((listener) => {
      try {
        listener(normalized)
      } catch (err) {
        console.warn(`[RealtimeService] Erro ao entregar evento de ${sub.domain}:`, err)
      }
    })
  }

  // ============================================================================
  // RECONEXÃO COM BACKOFF EXPONENCIAL E RESYNC
  // ============================================================================

  private scheduleReconnect(): void {
    if (this.isIntentionalDisconnect) return

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('OFFLINE', {
        attempt: this.reconnectAttempts,
        error: 'Limite de tentativas de reconexao atingido.',
      })
      this.logTelemetry({
        type: 'DISCONNECT',
        attempt: this.reconnectAttempts,
        message: 'Max tentativas atingidas. Operando em modo offline.',
      })
      return
    }

    this.setStatus('RECONNECTING', { attempt: this.reconnectAttempts + 1 })

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = Math.min(
      this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelayMs,
    )

    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(async () => {
      this.logTelemetry({
        type: 'RECONNECT',
        attempt: this.reconnectAttempts,
        message: `Tentativa ${this.reconnectAttempts} apos ${delay}ms`,
      })
      await this.attemptReconnect()
    }, delay)
  }

  private async attemptReconnect(): Promise<void> {
    try {
      // Revalida se o backend PocketBase está acessível com health check
      await pb.health.check()

      // Restaura todas as subscrições ativas
      for (const [, sub] of this.subscriptions.entries()) {
        if (sub.listeners.size > 0) {
          if (sub.unsubscribePb) {
            try {
              await sub.unsubscribePb()
            } catch {
              /* ignore */
            }
            sub.unsubscribePb = undefined
          }
          await this.activatePocketBaseSubscription(sub)
        }
      }

      this.reconnectAttempts = 0
      this.setStatus('ONLINE')
      this.logTelemetry({ type: 'CONNECT', message: 'Reconexao bem-sucedida.' })

      // Executa ressincronização obrigatória de dados
      await this.triggerResync()
    } catch (err: any) {
      this.logTelemetry({
        type: 'SUB_FAIL',
        attempt: this.reconnectAttempts,
        message: err?.message || 'Falha na checagem de saúde.',
      })
      this.scheduleReconnect()
    }
  }

  public async triggerResync(): Promise<void> {
    const promises: Promise<void>[] = []

    for (const [domain, sub] of this.subscriptions.entries()) {
      for (const resyncListener of this.resyncListeners) {
        try {
          const res = resyncListener(domain, sub.lastSeenTimestamp)
          if (res instanceof Promise) {
            promises.push(
              res.catch((err) => {
                this.logTelemetry({
                  type: 'RESYNC_FAIL',
                  domain,
                  message: err?.message,
                })
              }),
            )
          }
        } catch (err: any) {
          this.logTelemetry({
            type: 'RESYNC_FAIL',
            domain,
            message: err?.message,
          })
        }
      }
    }

    await Promise.all(promises)
    this.logTelemetry({ type: 'RESYNC_OK', message: 'Ressincronizacao concluida.' })
  }

  private handleNetworkOnline(): void {
    if (this.status === 'OFFLINE' || this.status === 'RECONNECTING') {
      this.reconnectAttempts = 0
      this.attemptReconnect().catch(() => {})
    }
  }

  // ============================================================================
  // LIFECYCLE DE AUTENTICAÇÃO (LOGIN / LOGOUT)
  // ============================================================================

  /**
   * Chamado quando o usuário realiza logout.
   * Cancela todas as subscrições ativas e reseta contadores.
   */
  public async handleLogout(): Promise<void> {
    this.isIntentionalDisconnect = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    for (const [, sub] of this.subscriptions.entries()) {
      if (sub.unsubscribePb) {
        try {
          await sub.unsubscribePb()
        } catch {
          /* ignore */
        }
        sub.unsubscribePb = undefined
      }
    }

    this.subscriptions.clear()
    this.reconnectAttempts = 0
    this.setStatus('OFFLINE')
    this.logTelemetry({ type: 'DISCONNECT', message: 'Logout: todas as subscricoes encerradas.' })
  }

  /**
   * Chamado quando um usuário autentica com sucesso.
   * Restaura o estado para ONLINE e permite novas assinaturas.
   */
  public handleLogin(): void {
    this.isIntentionalDisconnect = false
    this.reconnectAttempts = 0
    this.setStatus('ONLINE')
    this.logTelemetry({ type: 'CONNECT', message: 'Login autenticado: canal pronto.' })
  }

  // ============================================================================
  // UTILITÁRIOS: DEDUPLICAÇÃO CANÔNICA E ORDENAÇÃO
  // ============================================================================

  /**
   * Mescla um registro em uma coleção canônica garantindo:
   * 1. Sem duplicações por ID.
   * 2. Versão mais recente (por updated/created) prevalece.
   */
  public static mergeRecord<T extends { id: string; updated?: string; created?: string }>(
    existingList: T[],
    incomingRecord: T,
  ): T[] {
    const index = existingList.findIndex((item) => item.id === incomingRecord.id)

    if (index === -1) {
      return [incomingRecord, ...existingList]
    }

    const current = existingList[index]
    const currentTime = new Date(current.updated || current.created || 0).getTime()
    const incomingTime = new Date(incomingRecord.updated || incomingRecord.created || 0).getTime()

    // Só atualiza se o registro recebido for mais recente ou de mesmo timestamp
    if (incomingTime >= currentTime) {
      const copy = [...existingList]
      copy[index] = { ...current, ...incomingRecord }
      return copy
    }

    return existingList
  }

  /**
   * Remove registro por ID de forma imutável.
   */
  public static removeRecord<T extends { id: string }>(existingList: T[], idToRemove: string): T[] {
    return existingList.filter((item) => item.id !== idToRemove)
  }

  /**
   * Ordenação determinística de timeline (cronológica estável por data de envio/criação + id estável).
   */
  public static sortTimelineMessages<
    T extends { id: string; createdAt?: string; sentAt?: string; created?: string },
  >(messages: T[]): T[] {
    return [...messages].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.sentAt || a.created || 0).getTime()
      const timeB = new Date(b.createdAt || b.sentAt || b.created || 0).getTime()
      if (timeA !== timeB) return timeA - timeB
      return a.id.localeCompare(b.id)
    })
  }

  // ============================================================================
  // CLASSIFICAÇÃO DE ERROS
  // ============================================================================

  private classifyError(err: any, collection: string): AppError {
    const status = err?.status || err?.statusCode
    const msg = err?.message || 'Falha de comunicacao com o servidor realtime'

    if (status === 401) {
      return new AuthenticationError('Sessao expirada ou nao autenticada.')
    }
    if (status === 403) {
      return new PermissionError(`Sem permissao para assinar a colecao ${collection}.`)
    }
    return new NetworkError(msg)
  }

  // Diagnóstico interno (útil para testes e telemetria)
  public getActiveSubscriptionsCount(): number {
    let count = 0
    this.subscriptions.forEach((sub) => {
      if (sub.listeners.size > 0) count++
    })
    return count
  }

  public getListenersCountForCollection(collectionName: string): number {
    return this.subscriptions.get(collectionName)?.listeners.size || 0
  }
}

export const realtimeService = RealtimeService.getInstance()
export default realtimeService
