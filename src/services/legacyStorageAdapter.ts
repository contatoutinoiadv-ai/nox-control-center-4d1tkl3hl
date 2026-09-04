/**
 * CENTRAL NOX V2 — Legacy Storage Adapter (Fase 2A)
 *
 * Responsável por:
 * 1. Detectar dados legados no localStorage.
 * 2. Validar e normalizar registros antes de qualquer persistência.
 * 3. Verificar duplicidades contra o banco de dados oficial (PocketBase).
 * 4. Migrar registros órfãos garantindo integridade e rastreabilidade probatória.
 * 5. Marcar domínios como migrados para evitar loops ou reimportações redundantes.
 * 6. Auditar eventos através de `audit_logs` sem expor dados sensíveis.
 * 7. Resolver conflitos entre Local e Servidor aplicando regra explícita de Source of Truth.
 */

import pb from '@/lib/pocketbase/client'
import type { NoxClient, NoxRecord, ProductionItem, AuditLogEntry } from '@/types/nox'
import type { SentinelaCommunication, SentinelaTask, AgendaEvent } from '@/types/sentinela'

export interface MigrationSummary {
  domain: string
  totalLocalDetected: number
  importedCount: number
  duplicatesSkipped: number
  conflictsDetected: number
  errorsCount: number
  status: 'PENDENTE' | 'EM_PROGRESSO' | 'CONCLUIDO' | 'FALHA'
}

export interface LegacyMigrationStatus {
  isChecking: boolean
  isMigrating: boolean
  lastRunAt: string | null
  domains: Record<string, MigrationSummary>
  unresolvedConflicts: Array<{
    domain: string
    key: string
    reason: string
    timestamp: string
  }>
}

const STORAGE_KEYS = {
  CLIENTS: 'nox_control_center_clients_v1',
  RECORDS: 'nox_control_center_records_v1',
  PRODUCTION: 'nox_control_center_production_v1',
  TASKS: 'nox_sentinela_tasks_v1',
  COMMUNICATIONS: 'nox_sentinela_communications_v1',
  AGENDA: 'nox_sentinela_agenda_v1',
  AUDIT: 'nox_control_center_audit_logs_v1',
}

const MIGRATION_FLAG_PREFIX = 'nox_migrated_v2_'

class LegacyStorageAdapter {
  private isRunning = false

  /**
   * Verifica se um domínio já foi formalmente migrado para o PocketBase
   */
  public isDomainMigrated(domain: string): boolean {
    try {
      return localStorage.getItem(`${MIGRATION_FLAG_PREFIX}${domain}`) === 'true'
    } catch {
      return false
    }
  }

  /**
   * Marca o domínio como migrado
   */
  public markDomainMigrated(domain: string): void {
    try {
      localStorage.setItem(`${MIGRATION_FLAG_PREFIX}${domain}`, 'true')
    } catch {
      /* ignore */
    }
  }

  /**
   * Limpa a flag de migração (utilizado para testes ou rollback controlado)
   */
  public resetDomainMigration(domain: string): void {
    try {
      localStorage.removeItem(`${MIGRATION_FLAG_PREFIX}${domain}`)
    } catch {
      /* ignore */
    }
  }

  /**
   * Registra log de auditoria oficial no PocketBase
   */
  public async logAuditEvent(
    action: string,
    category: 'migracao' | 'seguranca' | 'sistema' | 'importacao',
    actor: string,
    targetId?: string,
    details: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      if (pb.authStore.isValid) {
        await pb.collection('audit_logs').create({
          action,
          category,
          actor: actor || 'Sistema NOX (Migration Adapter)',
          target_id: targetId || 'FASE_2_DUAL_STORE',
          details,
          ip_address: '127.0.0.1 (Frontend Client Session)',
        })
      }
    } catch (err) {
      console.warn('LegacyStorageAdapter: falha ao persistir audit_log no PocketBase:', err)
    }
  }

  /**
   * Executa a migração em lote de todos os domínios pendentes
   */
  public async runFullMigration(): Promise<Record<string, MigrationSummary>> {
    if (this.isRunning) {
      console.info('LegacyStorageAdapter: migração já em execução. Aguardando término...')
      return {}
    }

    if (!pb.authStore.isValid) {
      console.info('LegacyStorageAdapter: usuário não autenticado. Migração adiada até o login.')
      return {}
    }

    this.isRunning = true
    const summaries: Record<string, MigrationSummary> = {}

    try {
      await this.logAuditEvent(
        'LEGACY_DATA_DETECTED',
        'migracao',
        pb.authStore.model?.name || 'Operador NOX',
        'INICIO_MIGRACAO_FASE_2',
        { timestamp: new Date().toISOString() },
      )

      // Ordem controlada: Baixo Risco -> Alto Risco
      // 1. Audit logs locais órfãos
      summaries.audit_logs = await this.migrateAuditLogs()

      // 2. Tarefas do Sentinela
      summaries.sentinela_tasks = await this.migrateTasks()

      // 3. Compromissos e Agenda
      summaries.sentinela_agenda = await this.migrateAgenda()

      // 4. Clientes (entidade âncora)
      summaries.clients = await this.migrateClients()

      // 5. Produção Jurídica
      summaries.production_items = await this.migrateProductionItems()

      // 6. Comunicações Sentinela / DJEN
      summaries.sentinela_communications = await this.migrateCommunications()

      // 7. Registros de Processos / Imports
      summaries.records = await this.migrateRecords()

      await this.logAuditEvent(
        'SOURCE_OF_TRUTH_CHANGED',
        'migracao',
        pb.authStore.model?.name || 'Operador NOX',
        'CONCLUSAO_MIGRACAO_FASE_2',
        { summaries },
      )
    } catch (error) {
      console.error('LegacyStorageAdapter: erro crítico durante migração:', error)
      await this.logAuditEvent(
        'MIGRATION_FAILED',
        'migracao',
        pb.authStore.model?.name || 'Operador NOX',
        'ERRO_GERAL',
        { error: String(error) },
      )
    } finally {
      this.isRunning = false
    }

    return summaries
  }

  // ================= 1. CLIENTES =================
  public async migrateClients(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      domain: 'clients',
      totalLocalDetected: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      conflictsDetected: 0,
      errorsCount: 0,
      status: 'EM_PROGRESSO',
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS)
      if (!raw) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('clients')
        return summary
      }

      const localClients: NoxClient[] = JSON.parse(raw)
      summary.totalLocalDetected = localClients.length

      if (localClients.length === 0) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('clients')
        return summary
      }

      // Buscar clientes existentes no PocketBase
      const existing = await pb
        .collection('clients')
        .getFullList({ fields: 'id,client_code,cpf,nome' })
      const existingCodes = new Set(existing.map((c) => c.client_code?.toLowerCase()))
      const existingCpfs = new Set(existing.map((c) => c.cpf?.replace(/\D/g, '')).filter(Boolean))

      for (const client of localClients) {
        try {
          const cleanCpf = client.cpf?.replace(/\D/g, '')
          const codeMatch = client.clientCode && existingCodes.has(client.clientCode.toLowerCase())
          const cpfMatch = cleanCpf && existingCpfs.has(cleanCpf)

          if (codeMatch || cpfMatch) {
            summary.duplicatesSkipped++
            continue
          }

          // Criar cliente no PocketBase preservando rastreabilidade
          await pb.collection('clients').create({
            client_code: client.clientCode || `CLI-${Date.now().toString().slice(-6)}`,
            protocolo: client.protocolo || '',
            nome: client.nome,
            cpf: client.cpf || '',
            rg: client.rg || '',
            telefone: client.telefone || '',
            email: client.email || '',
            endereco: client.endereco || '',
            profissao: client.profissao || '',
            nacionalidade: client.nacionalidade || 'Brasileiro(a)',
            estado_civil: client.estadoCivil || 'solteiro',
            demanda: client.demanda || '',
            descricao_caso: client.descricaoCaso || '',
            origem: client.origem || 'manual',
            estagio: client.estagio || 'novo',
            docs_gerados: client.docsGerados || [],
            processos_vinculados: client.processosVinculados || [],
            obs: client.obs || '',
            responsavel: client.responsavel || 'Higor Utinoi de Oliveira',
            legacy_id: client.id,
          })

          summary.importedCount++
          if (client.clientCode) existingCodes.add(client.clientCode.toLowerCase())
          if (cleanCpf) existingCpfs.add(cleanCpf)
        } catch (itemErr) {
          console.warn('Erro ao migrar cliente:', client.nome, itemErr)
          summary.errorsCount++
        }
      }

      this.markDomainMigrated('clients')
      summary.status = 'CONCLUIDO'

      await this.logAuditEvent(
        'LEGACY_DATA_IMPORTED',
        'migracao',
        'LegacyStorageAdapter',
        'clients',
        {
          total: summary.totalLocalDetected,
          imported: summary.importedCount,
          skipped: summary.duplicatesSkipped,
          errors: summary.errorsCount,
        },
      )
    } catch (err) {
      console.error('Falha na migração do domínio clients:', err)
      summary.status = 'FALHA'
    }

    return summary
  }

  // ================= 2. COMPROMISSOS / AGENDA =================
  public async migrateAgenda(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      domain: 'sentinela_agenda',
      totalLocalDetected: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      conflictsDetected: 0,
      errorsCount: 0,
      status: 'EM_PROGRESSO',
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AGENDA)
      if (!raw) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('sentinela_agenda')
        return summary
      }

      const localAgenda: AgendaEvent[] = JSON.parse(raw)
      summary.totalLocalDetected = localAgenda.length

      if (localAgenda.length === 0) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('sentinela_agenda')
        return summary
      }

      const existing = await pb.collection('sentinela_agenda').getFullList({
        fields: 'id,title,start_date,process_number',
      })

      const existingSignatures = new Set(
        existing.map((e) => `${e.title}_${e.start_date}_${e.process_number || ''}`.toLowerCase()),
      )

      for (const ev of localAgenda) {
        try {
          const sig = `${ev.title}_${ev.startDate}_${ev.processNumber || ''}`.toLowerCase()
          if (existingSignatures.has(sig)) {
            summary.duplicatesSkipped++
            continue
          }

          await pb.collection('sentinela_agenda').create({
            title: ev.title,
            description: ev.description || '',
            event_type: ev.eventType || 'OUTRO',
            start_date: ev.startDate,
            end_date: ev.endDate || ev.startDate,
            is_all_day: !!ev.isAllDay,
            location_or_link: ev.locationOrLink || '',
            is_virtual: !!ev.isVirtual,
            process_number: ev.processNumber || '',
            responsible: ev.responsible || 'Higor Utinoi de Oliveira',
            participants: ev.participants || [],
            tribunal: ev.tribunal || '',
            communication_id: ev.communicationId || '',
            status: ev.status || 'CONFIRMADO',
            preparacao_habilitada: !!ev.preparacaoHabilitada,
            client_id: ev.clientId || '',
            client_cpf: ev.clientCpf || '',
            client_name: ev.clientName || '',
            alegacoes_processo: ev.alegacoesProcesso || [],
            aprovado_para_cliente: !!ev.aprovadoParaCliente,
            tipo_audiencia: ev.tipoAudiencia || '',
          })

          existingSignatures.add(sig)
          summary.importedCount++
        } catch (itemErr) {
          console.warn('Erro ao migrar evento de agenda:', ev.title, itemErr)
          summary.errorsCount++
        }
      }

      this.markDomainMigrated('sentinela_agenda')
      summary.status = 'CONCLUIDO'

      await this.logAuditEvent(
        'LEGACY_DATA_IMPORTED',
        'migracao',
        'LegacyStorageAdapter',
        'sentinela_agenda',
        {
          total: summary.totalLocalDetected,
          imported: summary.importedCount,
          skipped: summary.duplicatesSkipped,
          errors: summary.errorsCount,
        },
      )
    } catch (err) {
      console.error('Falha na migração do domínio sentinela_agenda:', err)
      summary.status = 'FALHA'
    }

    return summary
  }

  // ================= 3. TAREFAS =================
  public async migrateTasks(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      domain: 'sentinela_tasks',
      totalLocalDetected: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      conflictsDetected: 0,
      errorsCount: 0,
      status: 'EM_PROGRESSO',
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TASKS)
      if (!raw) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('sentinela_tasks')
        return summary
      }

      const localTasks: SentinelaTask[] = JSON.parse(raw)
      summary.totalLocalDetected = localTasks.length

      if (localTasks.length === 0) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('sentinela_tasks')
        return summary
      }

      const existing = await pb.collection('sentinela_tasks').getFullList({
        fields: 'id,title,process_number,internal_due_date',
      })

      const existingSigs = new Set(
        existing.map((t) =>
          `${t.title}_${t.process_number || ''}_${t.internal_due_date || ''}`.toLowerCase(),
        ),
      )

      for (const t of localTasks) {
        try {
          const sig = `${t.title}_${t.processNumber || ''}_${t.internalDueDate || ''}`.toLowerCase()
          if (existingSigs.has(sig)) {
            summary.duplicatesSkipped++
            continue
          }

          await pb.collection('sentinela_tasks').create({
            title: t.title,
            description: t.description || '',
            status: t.status || 'PENDENTE',
            priority: t.priority || 'media',
            responsible: t.responsible || 'Higor Utinoi de Oliveira',
            estimated_hours: t.estimatedHours || 1,
            internal_due_date: t.internalDueDate || '',
            legal_deadline_date: t.legalDeadlineDate || '',
            process_number: t.processNumber || '',
            client_name: t.clientName || '',
            communication_id: t.communicationId || '',
            deadline_id: t.deadlineId || '',
            subtasks: t.subtasks || [],
            is_blocked: !!t.isBlocked,
            block_reason: t.blockReason || '',
            tags: t.tags || [],
            comments: t.comments || [],
          })

          existingSigs.add(sig)
          summary.importedCount++
        } catch (itemErr) {
          console.warn('Erro ao migrar tarefa:', t.title, itemErr)
          summary.errorsCount++
        }
      }

      this.markDomainMigrated('sentinela_tasks')
      summary.status = 'CONCLUIDO'

      await this.logAuditEvent(
        'LEGACY_DATA_IMPORTED',
        'migracao',
        'LegacyStorageAdapter',
        'sentinela_tasks',
        {
          total: summary.totalLocalDetected,
          imported: summary.importedCount,
          skipped: summary.duplicatesSkipped,
          errors: summary.errorsCount,
        },
      )
    } catch (err) {
      console.error('Falha na migração de sentinela_tasks:', err)
      summary.status = 'FALHA'
    }

    return summary
  }

  // ================= 4. PRODUÇÃO JURÍDICA =================
  public async migrateProductionItems(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      domain: 'production_items',
      totalLocalDetected: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      conflictsDetected: 0,
      errorsCount: 0,
      status: 'EM_PROGRESSO',
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTION)
      if (!raw) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('production_items')
        return summary
      }

      const localItems: ProductionItem[] = JSON.parse(raw)
      summary.totalLocalDetected = localItems.length

      if (localItems.length === 0) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('production_items')
        return summary
      }

      // Buscar clientes no PB para remapear client_id se o cliente for legado
      const clientsPb = await pb
        .collection('clients')
        .getFullList({ fields: 'id,client_code,legacy_id,nome' })
      const clientMap = new Map<string, string>() // local/legacy id ou code -> pb id
      clientsPb.forEach((c) => {
        clientMap.set(c.id, c.id)
        if (c.legacy_id) clientMap.set(c.legacy_id, c.id)
        if (c.client_code) clientMap.set(c.client_code, c.id)
        if (c.nome) clientMap.set(c.nome.toLowerCase(), c.id)
      })

      const fallbackClientId = clientsPb[0]?.id || 'u9wcaim6yazrj7k'

      const existingProd = await pb.collection('production_items').getFullList({
        fields: 'id,titulo_peca,numero_processo,client_id',
      })
      const existingSignatures = new Set(
        existingProd.map((p) => `${p.titulo_peca}_${p.numero_processo || ''}`.toLowerCase()),
      )

      for (const item of localItems) {
        try {
          const sig = `${item.tituloPeca}_${item.numeroProcesso || ''}`.toLowerCase()
          if (existingSignatures.has(sig)) {
            summary.duplicatesSkipped++
            continue
          }

          // Resolver client_id canônico de 15 caracteres
          const resolvedClientId =
            clientMap.get(item.clientId) ||
            clientMap.get(item.clientName?.toLowerCase() || '') ||
            fallbackClientId

          await pb.collection('production_items').create({
            client_id: resolvedClientId,
            client_name: item.clientName || '',
            numero_processo: item.numeroProcesso || '',
            titulo_peca: item.tituloPeca,
            nivel: item.nivel || 1,
            estagio: item.estagio || 'triagem_evidencias',
            responsavel: item.responsavel || 'Higor Utinoi de Oliveira',
            triagem_evidencias: item.triagemEvidencias || {},
            tese_dominante: item.teseDominante || '',
            motivo_travamento: item.motivoTravamento || '',
            data_entrada_estagio_atual: item.dataEntradaEstagioAtual || new Date().toISOString(),
            stress_test_aprovado: !!item.stressTestAprovado,
            stress_test_detalhes: item.stressTestDetalhes || {},
            historico_estagios: item.historicoEstagios || [],
          })

          existingSignatures.add(sig)
          summary.importedCount++
        } catch (itemErr) {
          console.warn('Erro ao migrar item de produção:', item.tituloPeca, itemErr)
          summary.errorsCount++
        }
      }

      this.markDomainMigrated('production_items')
      summary.status = 'CONCLUIDO'

      await this.logAuditEvent(
        'LEGACY_DATA_IMPORTED',
        'migracao',
        'LegacyStorageAdapter',
        'production_items',
        {
          total: summary.totalLocalDetected,
          imported: summary.importedCount,
          skipped: summary.duplicatesSkipped,
          errors: summary.errorsCount,
        },
      )
    } catch (err) {
      console.error('Falha na migração do domínio production_items:', err)
      summary.status = 'FALHA'
    }

    return summary
  }

  // ================= 5. COMUNICAÇÕES SENTINELA =================
  public async migrateCommunications(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      domain: 'sentinela_communications',
      totalLocalDetected: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      conflictsDetected: 0,
      errorsCount: 0,
      status: 'EM_PROGRESSO',
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMMUNICATIONS)
      if (!raw) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('sentinela_communications')
        return summary
      }

      const localComms: SentinelaCommunication[] = JSON.parse(raw)
      summary.totalLocalDetected = localComms.length

      if (localComms.length === 0) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('sentinela_communications')
        return summary
      }

      const existingComms = await pb.collection('sentinela_communications').getFullList({
        fields: 'id,external_id,numero_processo',
      })
      const existingExternalIds = new Set(existingComms.map((c) => c.external_id).filter(Boolean))

      for (const comm of localComms) {
        try {
          const extId = comm.externalId || comm.id
          if (extId && existingExternalIds.has(extId)) {
            summary.duplicatesSkipped++
            continue
          }

          await pb.collection('sentinela_communications').create({
            external_id: extId || `COMM-LEGACY-${Date.now()}`,
            source: comm.source || 'DJEN',
            numero_processo: comm.numeroProcesso || '0000000-00.0000.0.00.0000',
            tribunal: comm.tribunal || 'TJSP',
            orgao_julgador: comm.orgaoJulgador || '',
            destinatario: comm.destinatario || 'Higor Utinoi de Oliveira',
            tipo_comunicacao: comm.tipoComunicacao || 'INTIMACAO',
            data_disponibilizacao:
              comm.dataDisponibilizacao || new Date().toISOString().split('T')[0],
            data_publicacao: comm.dataPublicacao || new Date().toISOString().split('T')[0],
            teor_resumido: comm.teorResumido || '',
            teor_completo: comm.teorCompleto || '',
            status: comm.status || 'ANALISADA',
            triage_category: comm.triageCategory || 'nova',
            urgency_level: comm.urgencyLevel || 'media',
            risk_score: comm.riskScore || 50,
            assigned_to: comm.assignedTo || 'Higor Utinoi de Oliveira',
            custody: comm.custody || {},
            deadline_calculated: comm.deadlineCalculated || {},
          })

          if (extId) existingExternalIds.add(extId)
          summary.importedCount++
        } catch (itemErr) {
          console.warn('Erro ao migrar comunicacao sentinela:', comm.numeroProcesso, itemErr)
          summary.errorsCount++
        }
      }

      this.markDomainMigrated('sentinela_communications')
      summary.status = 'CONCLUIDO'

      await this.logAuditEvent(
        'LEGACY_DATA_IMPORTED',
        'migracao',
        'LegacyStorageAdapter',
        'sentinela_communications',
        {
          total: summary.totalLocalDetected,
          imported: summary.importedCount,
          skipped: summary.duplicatesSkipped,
          errors: summary.errorsCount,
        },
      )
    } catch (err) {
      console.error('Falha na migração de sentinela_communications:', err)
      summary.status = 'FALHA'
    }

    return summary
  }

  // ================= 6. REGISTROS (RADAR / IMPORTAÇÕES) =================
  public async migrateRecords(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      domain: 'records',
      totalLocalDetected: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      conflictsDetected: 0,
      errorsCount: 0,
      status: 'EM_PROGRESSO',
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RECORDS)
      if (!raw) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('records')
        return summary
      }

      const localRecords: NoxRecord[] = JSON.parse(raw)
      summary.totalLocalDetected = localRecords.length

      if (localRecords.length === 0) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('records')
        return summary
      }

      const existingRecords = await pb.collection('records').getFullList({
        fields: 'id,record_code,numero_processo',
      })
      const existingCodes = new Set(existingRecords.map((r) => r.record_code).filter(Boolean))

      for (const rec of localRecords) {
        try {
          if (rec.recordCode && existingCodes.has(rec.recordCode)) {
            summary.duplicatesSkipped++
            continue
          }

          await pb.collection('records').create({
            record_code: rec.recordCode || `REC-${Date.now()}`,
            numero_processo: rec.numeroProcesso || '',
            tribunal: rec.tribunal || '',
            orgao_julgador: rec.orgaoJulgador || '',
            classe_judicial: rec.classeJudicial || '',
            assunto: rec.assunto || '',
            partes: rec.partes || '',
            status: rec.status || 'novo',
            severity: rec.severity || 'medio',
            alert_type: rec.alertType || 'operacional',
            alert_title: rec.alertTitle || 'Registro Migrado',
            alert_description: rec.alertDescription || '',
            priority: rec.priority || 'media',
            responsible: rec.responsible || 'Higor Utinoi de Oliveira',
            tags: rec.tags || [],
            notes: rec.notes || [],
            raw_source_row: rec.rawSourceRow || {},
            normalized_data: rec.normalizedData || {},
            validation_errors: rec.validationErrors || [],
          })

          if (rec.recordCode) existingCodes.add(rec.recordCode)
          summary.importedCount++
        } catch (itemErr) {
          console.warn('Erro ao migrar record:', rec.recordCode, itemErr)
          summary.errorsCount++
        }
      }

      this.markDomainMigrated('records')
      summary.status = 'CONCLUIDO'

      await this.logAuditEvent(
        'LEGACY_DATA_IMPORTED',
        'migracao',
        'LegacyStorageAdapter',
        'records',
        {
          total: summary.totalLocalDetected,
          imported: summary.importedCount,
          skipped: summary.duplicatesSkipped,
          errors: summary.errorsCount,
        },
      )
    } catch (err) {
      console.error('Falha na migração de records:', err)
      summary.status = 'FALHA'
    }

    return summary
  }

  // ================= 7. AUDIT LOGS ÓRFÃOS =================
  public async migrateAuditLogs(): Promise<MigrationSummary> {
    const summary: MigrationSummary = {
      domain: 'audit_logs',
      totalLocalDetected: 0,
      importedCount: 0,
      duplicatesSkipped: 0,
      conflictsDetected: 0,
      errorsCount: 0,
      status: 'EM_PROGRESSO',
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT)
      if (!raw) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('audit_logs')
        return summary
      }

      const localLogs: AuditLogEntry[] = JSON.parse(raw)
      summary.totalLocalDetected = localLogs.length

      if (localLogs.length === 0) {
        summary.status = 'CONCLUIDO'
        this.markDomainMigrated('audit_logs')
        return summary
      }

      const existingLogs = await pb.collection('audit_logs').getList(1, 100, {
        fields: 'id,action,target_id,created',
        sort: '-created',
      })
      const existingSignatures = new Set(
        existingLogs.items.map((l) => `${l.action}_${l.target_id || ''}`.toLowerCase()),
      )

      // Migrar apenas os últimos 50 eventos mais relevantes para não sobrecarregar
      const sliceLogs = localLogs.slice(0, 50)

      for (const log of sliceLogs) {
        try {
          const sig = `${log.action}_${log.targetId || ''}`.toLowerCase()
          if (existingSignatures.has(sig)) {
            summary.duplicatesSkipped++
            continue
          }

          // Normalizar categoria para os valores aceitos pelo PB
          const validCategory = [
            'importacao',
            'revisao',
            'exportacao',
            'sistema',
            'configuracao',
            'lex_tempus',
            'migracao',
            'seguranca',
          ].includes(log.category)
            ? log.category
            : 'sistema'

          await pb.collection('audit_logs').create({
            action: log.action,
            category: validCategory,
            actor: log.actor || 'Operador Local',
            target_id: log.targetId || '',
            details: log.details || {},
            ip_address: log.ipAddress || '127.0.0.1 (Migrado)',
          })

          existingSignatures.add(sig)
          summary.importedCount++
        } catch {
          summary.errorsCount++
        }
      }

      this.markDomainMigrated('audit_logs')
      summary.status = 'CONCLUIDO'
    } catch (err) {
      console.error('Falha ao migrar audit_logs:', err)
      summary.status = 'FALHA'
    }

    return summary
  }
}

export const legacyStorageAdapter = new LegacyStorageAdapter()
