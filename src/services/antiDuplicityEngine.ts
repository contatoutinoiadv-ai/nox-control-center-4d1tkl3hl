/**
 * MOTOR DE ANTIDUPLICIDADE NOX (V2)
 *
 * Sistema robusto de detecção e bloqueio ativo para impedir entrada de
 * publicações e tarefas em duplicidade.
 *
 * Características:
 * - Publicações: identificação por fingerprint combinando número do processo normalizado,
 *   hash criptográfico do teor normalizado (sem ruídos de espaçamento/caixa),
 *   data de disponibilização ISO e destinatários normalizados.
 * - Tarefas: identificação por publicação de origem + tipo/regra + responsável + processo.
 * - Bloqueio ativo: rejeição preventiva na entrada com quarentena / erro explícito "DUPLICATA".
 * - Auditoria operacional dedicada: armazena tentativas bloqueadas com origem, contagem e detalhes,
 *   sem poluir a auditoria jurídica do processo.
 */

export interface PublicationFingerprintInput {
  numeroProcesso: string
  teor: string
  dataDisponibilizacao: string
  destinatario?: string
  tribunal?: string
  orgaoJulgador?: string
}

export interface TaskFingerprintInput {
  communicationId?: string
  processNumber?: string
  title: string
  responsible?: string
  legalRuleOrType?: string
}

export interface AntiDuplicityAttemptLog {
  id: string
  timestamp: string
  entityType: 'PUBLICACAO' | 'TAREFA' | 'IMPORTACAO_CSV'
  fingerprint: string
  identifier: string // ex: numeroProcesso ou taskId
  source: string // ex: 'CSV_INGESTION', 'DJEN_LIVE', 'TASK_CREATE', 'LEX_TEMPUS'
  reason: 'DUPLICATA'
  details: string
  blockedCount: number
}

// Normaliza texto removendo acentos, pontuação excessiva e espaços duplicados
export function normalizeTextForDeduplication(text: string): string {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ') // condensa espaços
    .replace(/[^\w\s]/gi, '') // remove pontuação
    .trim()
}

// Hash determinístico (FNV-1a 32/64 bit simplificado para hashing rápido de texto)
export function computeContentHash(content: string): string {
  let hash = 2166136261
  const clean = content.trim()
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

// Extrai números CNJ para evitar variações de máscara "0019469-63.2016.8.12.0001" vs "00194696320168120001"
export function normalizeProcessNumber(processo: string): string {
  if (!processo) return ''
  const digits = processo.replace(/\D/g, '')
  if (digits.length === 20) {
    // Formata padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
    return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`
  }
  return digits || processo.trim().toUpperCase()
}

// Gera fingerprint canônico da publicação
export function generatePublicationFingerprint(pub: PublicationFingerprintInput): string {
  const normProcess = normalizeProcessNumber(pub.numeroProcesso)
  const normTeor = normalizeTextForDeduplication(pub.teor || '')
  const teorHash = computeContentHash(normTeor)
  const normDate = (pub.dataDisponibilizacao || '').trim().split('T')[0]
  const normDest = normalizeTextForDeduplication(pub.destinatario || '')
  const normTrib = (pub.tribunal || '').toUpperCase().trim()

  return `PUB|${normProcess}|${normTrib}|${normDate}|${teorHash}|${normDest.slice(0, 30)}`
}

// Gera fingerprint canônico da tarefa
export function generateTaskFingerprint(task: TaskFingerprintInput): string {
  const commId = (task.communicationId || '').trim()
  const normProcess = normalizeProcessNumber(task.processNumber || '')
  const normTitle = normalizeTextForDeduplication(task.title || '').slice(0, 50)
  const normResp = normalizeTextForDeduplication(task.responsible || '')
  const normType = normalizeTextForDeduplication(task.legalRuleOrType || '')

  if (commId) {
    return `TASK|COMM:${commId}|TYPE:${normType || normTitle}|RESP:${normResp}`
  }
  return `TASK|PROC:${normProcess}|TITLE:${normTitle}|RESP:${normResp}`
}

export interface AntiDuplicityValidationResult {
  isDuplicate: boolean
  fingerprint: string
  reason?: 'DUPLICATA'
  message?: string
  existingIdentifier?: string
  attemptsCount?: number
}

const STORAGE_KEY_BLOCKED_AUDIT = 'nox_antiduplicity_audit_v2'

export class AntiDuplicityEngine {
  private static instance: AntiDuplicityEngine
  private blockedAttempts: AntiDuplicityAttemptLog[] = []
  private attemptCounts: Map<string, number> = new Map()

  private constructor() {
    this.loadAudit()
  }

  public static getInstance(): AntiDuplicityEngine {
    if (!AntiDuplicityEngine.instance) {
      AntiDuplicityEngine.instance = new AntiDuplicityEngine()
    }
    return AntiDuplicityEngine.instance
  }

  private loadAudit() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BLOCKED_AUDIT)
      if (raw) {
        this.blockedAttempts = JSON.parse(raw)
        // Reconstrói mapa de contagem
        this.blockedAttempts.forEach((log) => {
          this.attemptCounts.set(log.fingerprint, log.blockedCount)
        })
      }
    } catch {
      this.blockedAttempts = []
    }
  }

  private saveAudit() {
    try {
      localStorage.setItem(
        STORAGE_KEY_BLOCKED_AUDIT,
        JSON.stringify(this.blockedAttempts.slice(0, 200)),
      )
    } catch {
      /* ignore */
    }
  }

  /**
   * Valida se uma publicação candidata é duplicata contra a lista existente.
   */
  public checkPublication(
    candidate: PublicationFingerprintInput,
    existingItems: Array<PublicationFingerprintInput & { id?: string }>,
  ): AntiDuplicityValidationResult {
    const candidateFp = generatePublicationFingerprint(candidate)

    const match = existingItems.find((existing) => {
      const existingFp = generatePublicationFingerprint(existing)
      return existingFp === candidateFp
    })

    if (match) {
      const currentCount = (this.attemptCounts.get(candidateFp) || 0) + 1
      this.attemptCounts.set(candidateFp, currentCount)

      return {
        isDuplicate: true,
        fingerprint: candidateFp,
        reason: 'DUPLICATA',
        message: `Publicação idêntica já cadastrada para o processo ${candidate.numeroProcesso} em ${candidate.dataDisponibilizacao}. Entrada rejeitada com motivo DUPLICATA.`,
        existingIdentifier: match.id || match.numeroProcesso,
        attemptsCount: currentCount,
      }
    }

    return {
      isDuplicate: false,
      fingerprint: candidateFp,
    }
  }

  /**
   * Valida se uma tarefa é duplicata da mesma publicação de origem ou mesmo propósito.
   */
  public checkTask(
    candidate: TaskFingerprintInput,
    existingTasks: Array<TaskFingerprintInput & { id?: string }>,
  ): AntiDuplicityValidationResult {
    const candidateFp = generateTaskFingerprint(candidate)

    const match = existingTasks.find((existing) => {
      const existingFp = generateTaskFingerprint(existing)
      return existingFp === candidateFp
    })

    if (match) {
      const currentCount = (this.attemptCounts.get(candidateFp) || 0) + 1
      this.attemptCounts.set(candidateFp, currentCount)

      return {
        isDuplicate: true,
        fingerprint: candidateFp,
        reason: 'DUPLICATA',
        message: `Tarefa duplicada detectada para a mesma publicação/origem (${candidate.communicationId || candidate.processNumber || candidate.title}). Criação bloqueada preventivamente.`,
        existingIdentifier: match.id || match.title,
        attemptsCount: currentCount,
      }
    }

    return {
      isDuplicate: false,
      fingerprint: candidateFp,
    }
  }

  /**
   * Registra a tentativa bloqueada no log operacional dedicado (sem poluir a auditoria jurídica).
   */
  public recordBlockedAttempt(
    entityType: 'PUBLICACAO' | 'TAREFA' | 'IMPORTACAO_CSV',
    identifier: string,
    fingerprint: string,
    source: string,
    details: string,
  ): AntiDuplicityAttemptLog {
    const currentCount = (this.attemptCounts.get(fingerprint) || 0) + 1
    this.attemptCounts.set(fingerprint, currentCount)

    const log: AntiDuplicityAttemptLog = {
      id: `dupl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      entityType,
      fingerprint,
      identifier,
      source,
      reason: 'DUPLICATA',
      details,
      blockedCount: currentCount,
    }

    this.blockedAttempts.unshift(log)
    this.saveAudit()
    return log
  }

  public getBlockedAttempts(): AntiDuplicityAttemptLog[] {
    return [...this.blockedAttempts]
  }

  public clearAudit(): void {
    this.blockedAttempts = []
    this.attemptCounts.clear()
    this.saveAudit()
  }

  public getBlockedCount(fingerprint: string): number {
    return this.attemptCounts.get(fingerprint) || 0
  }
}

export const antiDuplicityEngine = AntiDuplicityEngine.getInstance()
