import { NoxRecord, ImportBatch, AuditLogEntry, NoxSystemStats } from '@/types/nox'
import { generateFullSyntheticDataset, INITIAL_BATCH, INITIAL_AUDIT_LOGS } from '@/data/mockData'
import {
  SentinelaCommunication,
  SentinelaTask,
  AgendaEvent,
  AutomationRule,
  SentinelaApiHealth,
  DecisionMemoryItem,
  IncidentCrisisRoom,
  OperationalTwinCapacity,
  GapItem,
  DailyBriefingData,
  RecoveredTimeMetric,
  DeadlineMemorial,
} from '@/types/sentinela'
import {
  INITIAL_SENTINELA_COMMUNICATIONS,
  INITIAL_SENTINELA_TASKS,
  INITIAL_AGENDA_EVENTS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_API_HEALTH,
  INITIAL_OPERATIONAL_TWIN,
  INITIAL_GAPS,
  INITIAL_DECISION_MEMORY,
  INITIAL_INCIDENT_ROOMS,
} from '@/data/sentinelaData'

const STORAGE_KEYS = {
  RECORDS: 'nox_control_center_records_v1',
  IMPORTS: 'nox_control_center_imports_v1',
  AUDIT_LOGS: 'nox_control_center_audit_logs_v1',
  SETTINGS: 'nox_control_center_settings_v1',
  COMMUNICATIONS: 'nox_sentinela_communications_v1',
  TASKS: 'nox_sentinela_tasks_v1',
  AGENDA: 'nox_sentinela_agenda_v1',
  AUTOMATIONS: 'nox_sentinela_automations_v1',
  API_HEALTH: 'nox_sentinela_api_health_v1',
  INCIDENTS: 'nox_sentinela_incidents_v1',
  DECISION_MEMORY: 'nox_sentinela_decision_memory_v1',
}

export interface AppSettings {
  demoMode: boolean
  reducedMotionPreference: boolean
  autoRefreshRadar: boolean
  refreshIntervalSeconds: number
  lexTempusFeatureFlag: boolean
  strictCnjValidation: boolean
  defaultResponsible: string
  lawyerName: string
  lawyerOab: string
  lawyerUf: string
  lawyerEmail: string
  lawyerPhone: string
  officeName: string
}

const DEFAULT_SETTINGS: AppSettings = {
  demoMode: true,
  reducedMotionPreference: false,
  autoRefreshRadar: true,
  refreshIntervalSeconds: 15,
  lexTempusFeatureFlag: false,
  strictCnjValidation: true,
  defaultResponsible: 'Higor Utinoi de Oliveira',
  lawyerName: 'Higor Utinoi de Oliveira',
  lawyerOab: 'OAB/MS 15.400',
  lawyerUf: 'MS',
  lawyerEmail: 'contato@utinoiadvocacia.com.br',
  lawyerPhone: '(67) 3000-0000',
  officeName: 'Higor Utinói Advocacia',
}

export class NoxDataStore {
  private static instance: NoxDataStore
  private records: NoxRecord[] = []
  private imports: ImportBatch[] = []
  private auditLogs: AuditLogEntry[] = []
  private communications: SentinelaCommunication[] = []
  private tasks: SentinelaTask[] = []
  private agendaEvents: AgendaEvent[] = []
  private automations: AutomationRule[] = []
  private apiHealth: SentinelaApiHealth[] = []
  private incidents: IncidentCrisisRoom[] = []
  private decisionMemory: DecisionMemoryItem[] = []
  private settings: AppSettings = DEFAULT_SETTINGS
  private listeners: Set<() => void> = new Set()

  private constructor() {
    this.init()
  }

  public static getInstance(): NoxDataStore {
    if (!NoxDataStore.instance) {
      NoxDataStore.instance = new NoxDataStore()
    }
    return NoxDataStore.instance
  }

  private init() {
    // Load from LocalStorage if present, else seed deterministic dataset
    try {
      const storedRecs = localStorage.getItem(STORAGE_KEYS.RECORDS)
      if (storedRecs) {
        this.records = JSON.parse(storedRecs)
      } else {
        this.records = generateFullSyntheticDataset()
        this.saveRecords()
      }

      const storedImports = localStorage.getItem(STORAGE_KEYS.IMPORTS)
      if (storedImports) {
        this.imports = JSON.parse(storedImports)
      } else {
        this.imports = [INITIAL_BATCH]
        this.saveImports()
      }

      const storedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)
      if (storedLogs) {
        this.auditLogs = JSON.parse(storedLogs)
      } else {
        this.auditLogs = [...INITIAL_AUDIT_LOGS]
        this.saveAuditLogs()
      }

      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) }
      }

      const storedComms = localStorage.getItem(STORAGE_KEYS.COMMUNICATIONS)
      this.communications = storedComms
        ? JSON.parse(storedComms)
        : [...INITIAL_SENTINELA_COMMUNICATIONS]

      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS)
      this.tasks = storedTasks ? JSON.parse(storedTasks) : [...INITIAL_SENTINELA_TASKS]

      const storedAgenda = localStorage.getItem(STORAGE_KEYS.AGENDA)
      this.agendaEvents = storedAgenda ? JSON.parse(storedAgenda) : [...INITIAL_AGENDA_EVENTS]

      const storedAutos = localStorage.getItem(STORAGE_KEYS.AUTOMATIONS)
      this.automations = storedAutos ? JSON.parse(storedAutos) : [...INITIAL_AUTOMATION_RULES]

      const storedHealth = localStorage.getItem(STORAGE_KEYS.API_HEALTH)
      this.apiHealth = storedHealth ? JSON.parse(storedHealth) : [...INITIAL_API_HEALTH]

      const storedIncidents = localStorage.getItem(STORAGE_KEYS.INCIDENTS)
      this.incidents = storedIncidents ? JSON.parse(storedIncidents) : [...INITIAL_INCIDENT_ROOMS]

      const storedMemory = localStorage.getItem(STORAGE_KEYS.DECISION_MEMORY)
      this.decisionMemory = storedMemory ? JSON.parse(storedMemory) : [...INITIAL_DECISION_MEMORY]
    } catch {
      this.records = generateFullSyntheticDataset()
      this.imports = [INITIAL_BATCH]
      this.auditLogs = [...INITIAL_AUDIT_LOGS]
      this.communications = [...INITIAL_SENTINELA_COMMUNICATIONS]
      this.tasks = [...INITIAL_SENTINELA_TASKS]
      this.agendaEvents = [...INITIAL_AGENDA_EVENTS]
      this.automations = [...INITIAL_AUTOMATION_RULES]
      this.apiHealth = [...INITIAL_API_HEALTH]
      this.incidents = [...INITIAL_INCIDENT_ROOMS]
      this.decisionMemory = [...INITIAL_DECISION_MEMORY]
      this.settings = DEFAULT_SETTINGS
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((cb) => cb())
  }

  private saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(this.records))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  private saveImports() {
    try {
      localStorage.setItem(STORAGE_KEYS.IMPORTS, JSON.stringify(this.imports))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  private saveAuditLogs() {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs))
    } catch {
      /* intentionally ignored */
    }
    this.notify()
  }

  public saveSettings(newSettings: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings))
    } catch {
      /* intentionally ignored */
    }
    this.logAction(
      'CONFIGURACOES_ATUALIZADAS',
      'configuracao',
      'Operador NOX',
      'SETTINGS-01',
      newSettings,
    )
    this.notify()
  }

  public getSettings(): AppSettings {
    return { ...this.settings }
  }

  public getRecords(): NoxRecord[] {
    return [...this.records]
  }

  public getRecordById(id: string): NoxRecord | undefined {
    return this.records.find((r) => r.id === id || r.recordCode === id)
  }

  public getImports(): ImportBatch[] {
    return [...this.imports]
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs]
  }

  public getStats(): NoxSystemStats {
    const total = this.records.length
    const critical = this.records.filter((r) => r.severity === 'critico').length
    const high = this.records.filter((r) => r.severity === 'alto').length
    const medium = this.records.filter((r) => r.severity === 'medio').length
    const info = this.records.filter((r) => r.severity === 'informativo').length

    const newRecs = this.records.filter((r) => r.status === 'novo').length
    const inReview = this.records.filter((r) => r.status === 'em_revisao').length
    const quarantined = this.records.filter((r) => r.status === 'quarentena').length
    const resolved = this.records.filter((r) => r.status === 'resolvido').length

    const lastBatch = this.imports[0]

    return {
      totalMonitored: total,
      criticalAlerts: critical,
      highAlerts: high,
      mediumAlerts: medium,
      infoAlerts: info,
      newRecords: newRecs,
      inReviewRecords: inReview,
      quarantinedRecords: quarantined,
      resolvedRecords: resolved,
      lastImportTimestamp: lastBatch?.createdAt || '2026-09-01T11:55:00Z',
      sentinelaConnected: true,
      sentinelaSyncMode: 'IMPORT_CSV_ISOLATED',
    }
  }

  public updateRecordStatus(
    recordId: string,
    newStatus: NoxRecord['status'],
    actor = 'Operador NOX',
    noteText?: string,
  ): boolean {
    const rec = this.records.find((r) => r.id === recordId || r.recordCode === recordId)
    if (!rec) return false

    const oldStatus = rec.status
    rec.status = newStatus
    rec.updatedAt = new Date().toISOString()

    const historyEntry = {
      id: `h_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      action: `Status alterado de "${oldStatus}" para "${newStatus}"`,
      details: noteText,
    }
    rec.history.unshift(historyEntry)

    if (noteText) {
      rec.notes.unshift({
        id: `n_${Date.now()}`,
        author: actor,
        text: noteText,
        createdAt: new Date().toISOString(),
      })
    }

    this.logAction('STATUS_REGISTRO_ALTERADO', 'revisao', actor, rec.recordCode, {
      de: oldStatus,
      para: newStatus,
      processo: rec.numeroProcesso,
    })

    this.saveRecords()
    return true
  }

  public updateRecordDetails(
    recordId: string,
    updates: {
      responsible?: string
      priority?: NoxRecord['priority']
      tags?: string[]
      notes?: string
    },
    actor = 'Operador NOX',
  ): boolean {
    const rec = this.records.find((r) => r.id === recordId || r.recordCode === recordId)
    if (!rec) return false

    if (updates.responsible) rec.responsible = updates.responsible
    if (updates.priority) rec.priority = updates.priority
    if (updates.tags) rec.tags = updates.tags
    if (updates.notes) {
      rec.notes.unshift({
        id: `n_${Date.now()}`,
        author: actor,
        text: updates.notes,
        createdAt: new Date().toISOString(),
      })
    }

    rec.updatedAt = new Date().toISOString()
    rec.history.unshift({
      id: `h_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      action: 'Metadados operacionais atualizados',
    })

    this.logAction('METADADOS_OPERACIONAIS_ATUALIZADOS', 'revisao', actor, rec.recordCode, updates)
    this.saveRecords()
    return true
  }

  public async addImportBatch(
    batch: ImportBatch,
    newRecords: NoxRecord[],
  ): Promise<{ success: boolean; message: string }> {
    // Duplicate check
    const existing = this.imports.find((i) => i.hash === batch.hash)
    if (existing) {
      return {
        success: false,
        message: `Arquivo duplicado! O lote "${existing.filename}" com o mesmo SHA-256 (${batch.hash.slice(0, 10)}...) já foi importado em ${new Date(existing.createdAt).toLocaleString('pt-BR')}.`,
      }
    }

    // Set records directly from imported batch (replace synthetic demo default)
    this.imports = [batch, ...this.imports.filter((i) => i.id !== 'batch_sentinela_2026_09_01')]
    this.records = [...newRecords]

    // Also convert imported records to Sentinela Communications so all Sentinela/Triagem/Prazos tabs reflect the dataset
    const importedComms = this.buildCommunicationsFromRecords(newRecords, batch)
    if (importedComms.length > 0) {
      this.communications = importedComms
      this.saveCommunications()
    }

    this.logAction('LOTE_IMPORTADO_NOVO', 'importacao', 'Operador NOX', batch.id, {
      filename: batch.filename,
      hash: batch.hash,
      total_linhas: batch.totalRows,
      aceitos: batch.acceptedCount,
      quarentena: batch.quarantinedCount,
      rejeitados: batch.rejectedCount,
    })

    this.saveImports()
    this.saveRecords()

    // Asynchronously persist to PocketBase backend collections `imports` and `records`
    this.syncToPocketBase(batch, newRecords).catch((err) => {
      console.warn('PocketBase sync background warning:', err)
    })

    return {
      success: true,
      message: `Lote importado com sucesso: ${batch.acceptedCount} aceitos, ${batch.quarantinedCount} em quarentena.`,
    }
  }

  private buildCommunicationsFromRecords(
    records: NoxRecord[],
    batch: ImportBatch,
  ): SentinelaCommunication[] {
    return records.map((rec, idx) => {
      const isQuarantine = rec.status === 'quarentena'
      const urgency =
        rec.severity === 'critico'
          ? ('critica' as const)
          : rec.severity === 'alto'
            ? ('alta' as const)
            : rec.severity === 'medio'
              ? ('media' as const)
              : ('baixa' as const)

      return {
        id: `comm-imp-${idx + 1}-${rec.recordCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        externalId: rec.recordCode || `IMP-${idx + 100}`,
        source: 'DJEN' as const,
        numeroProcesso: rec.numeroProcesso,
        tribunal: rec.tribunal || 'TJSP',
        orgaoJulgador: rec.orgaoJulgador || 'Vara Cível',
        comarca: rec.normalizedData?.uf || 'SP',
        classeJudicial: rec.classeJudicial || 'Procedimento Cível',
        destinatario: rec.partes || 'Dr. Higor Utinói (OAB/MS 15.400)',
        tipoComunicacao: isQuarantine
          ? 'INTIMACAO'
          : rec.severity === 'critico'
            ? 'CITACAO'
            : 'INTIMACAO',
        dataDisponibilizacao: rec.dataDistribuicao || new Date().toISOString().split('T')[0],
        dataPublicacao: rec.dataDistribuicao || new Date().toISOString().split('T')[0],
        teorResumido: isQuarantine
          ? `[QUARENTENA SCHEMA] ${rec.alertDescription || 'Registro em quarentena por inconsistência estrutural.'}`
          : `${rec.alertTitle}: ${rec.alertDescription}`,
        teorCompleto: `${rec.alertTitle}. Processo ${rec.numeroProcesso} em trâmite no ${rec.tribunal} (${rec.orgaoJulgador}). Partes: ${rec.partes}. Assunto: ${rec.assunto}.`,
        status: isQuarantine
          ? ('REVISAO_HUMANA' as const)
          : rec.status === 'em_revisao'
            ? ('REVISAO_HUMANA' as const)
            : ('ANALISADA' as const),
        triageCategory: isQuarantine
          ? ('ambigua' as const)
          : urgency === 'critica' || urgency === 'alta'
            ? ('urgente' as const)
            : ('nova' as const),
        urgencyLevel: urgency,
        riskScore:
          urgency === 'critica' ? 95 : urgency === 'alta' ? 80 : urgency === 'media' ? 55 : 25,
        assignedTo: rec.responsible || 'Dr. Higor Utinói',
        custody: {
          communicationId: `comm-imp-${idx + 1}`,
          snapshot: {
            hashSha256: batch.hash,
            capturedAt: batch.createdAt,
            source: 'DJEN',
            externalId: rec.recordCode,
            rawPayloadSnippet: `CSV.${batch.filename}.${rec.recordCode}.${rec.numeroProcesso}`,
            contentLength: batch.byteSize,
            sanitized: true,
            promptInjectionCheck: { clean: true, riskScore: 0 },
          },
          processNumber: rec.numeroProcesso,
          suggestedClassification: isQuarantine
            ? 'Revisão Técnica de Quarentena'
            : `${rec.classeJudicial} (${rec.assunto})`,
          confidence: isQuarantine ? 0.6 : 0.95,
          humanReviewRequired: isQuarantine,
          humanReviewReason: isQuarantine
            ? rec.validationErrors?.map((v) => v.message).join('; ')
            : undefined,
          generatedArtifacts: {},
          isDuplicate: false,
          timeline: [
            {
              id: `step-imp-${idx}-1`,
              stage: 'CAPTURADA',
              timestamp: batch.createdAt,
              actor: 'Importador CSV Sentinela NOX',
              actorRole: 'SISTEMA_IA',
              sourceConfidence: 1.0,
              actionSummary: `Importado do lote ${batch.filename} (Hash SHA-256: ${batch.hash.slice(0, 16)}...).`,
              evidenceHash: batch.hash.slice(0, 16),
            },
            {
              id: `step-imp-${idx}-2`,
              stage: isQuarantine ? 'REVISAO_HUMANA' : 'VALIDADA',
              timestamp: new Date().toISOString(),
              actor: 'Motor de Integridade NOX',
              actorRole: 'SISTEMA_IA',
              sourceConfidence: isQuarantine ? 0.65 : 0.98,
              actionSummary: isQuarantine
                ? 'Registro encaminhado para quarentena técnica.'
                : 'Registro validado com sucesso e disponibilizado para operações.',
            },
          ],
        },
        deadlineCalculated: isQuarantine
          ? undefined
          : {
              id: `dead-imp-${idx + 1}`,
              communicationId: `comm-imp-${idx + 1}`,
              numeroProcesso: rec.numeroProcesso,
              originText: `Intimação referente a ${rec.assunto || rec.alertTitle}`,
              generatingAct: 'DISPONIBILIZACAO_DJEN',
              legalRuleName: 'Prazo Geral de Manifestação (15 dias úteis)',
              legalRuleArticle: 'Art. 219 e 335 do CPC',
              daysCount: 15,
              daysType: 'uteis' as const,
              initialDateMarker: rec.dataDistribuicao || '2026-09-01',
              firstDayCounted: '2026-09-02',
              tribunal: rec.tribunal || 'TJSP',
              comarca: rec.normalizedData?.uf || 'SP',
              holidaysApplied: [
                {
                  date: '2026-09-07',
                  name: 'Independência do Brasil',
                  type: 'FERIADO_NACIONAL' as const,
                },
              ],
              calculationSteps: [
                {
                  stepNumber: 1,
                  date: rec.dataDistribuicao || '2026-09-01',
                  dayOfWeek: 'Terça-feira',
                  isBusinessDay: true,
                  description: 'Disponibilização da publicação no DJEN',
                },
                {
                  stepNumber: 2,
                  date: '2026-09-24',
                  dayOfWeek: 'Quinta-feira',
                  isBusinessDay: true,
                  description: '15º dia útil — Vencimento fatal CPC',
                },
              ],
              finalDeadlineDate: '2026-09-24',
              finalDeadlineTime: '23:59',
              confidenceScore: 0.98,
              confidenceLevel: 'ALTA' as const,
              isDeterminable: true,
              reviewApprovalStatus: 'PENDENTE' as const,
              ruleVersion: 'CPC_2015_V2',
              internalDeadlineDate: '2026-09-22',
              notes: 'Calculado automaticamente pelo Motor de Prazos NOX.',
            },
        createdAt: batch.createdAt,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  private async syncToPocketBase(batch: ImportBatch, records: NoxRecord[]): Promise<void> {
    try {
      const pb = (await import('@/lib/pocketbase/client')).default

      // Save batch in `imports` collection
      await pb.collection('imports').create({
        filename: batch.filename,
        hash: batch.hash,
        encoding: batch.encoding,
        delimiter: batch.delimiter,
        raw_content: batch.rawContent,
        total_rows: batch.totalRows,
        accepted_count: batch.acceptedCount,
        quarantined_count: batch.quarantinedCount,
        rejected_count: batch.rejectedCount,
        mapping_applied: batch.columnMapping,
        stats: {
          status: batch.status,
          importedAt: batch.createdAt,
        },
      })

      // Batch save records in `records` collection
      for (const rec of records) {
        await pb.collection('records').create({
          record_code: rec.recordCode,
          numero_processo: rec.numeroProcesso,
          tribunal: rec.tribunal,
          orgao_julgador: rec.orgaoJulgador,
          classe_judicial: rec.classeJudicial,
          assunto: rec.assunto,
          partes: rec.partes,
          status: rec.status,
          severity: rec.severity,
          alert_type: rec.alertType,
          alert_title: rec.alertTitle,
          alert_description: rec.alertDescription,
          priority: rec.priority,
          responsible: rec.responsible,
          tags: rec.tags,
          notes: rec.notes,
          raw_source_row: rec.rawSourceRow,
          normalized_data: rec.normalizedData,
          validation_errors: rec.validationErrors,
          source_batch_id: batch.id,
          source_row_index: rec.sourceRowIndex,
        })
      }
    } catch (err) {
      console.error('PocketBase sync failed:', err)
    }
  }

  public logAction(
    action: string,
    category: AuditLogEntry['category'],
    actor: string,
    targetId?: string,
    details: Record<string, unknown> = {},
  ): void {
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action,
      category,
      actor,
      targetId,
      details,
      ipAddress: '127.0.0.1 (Local Session)',
      createdAt: new Date().toISOString(),
    }
    this.auditLogs.unshift(entry)
    this.saveAuditLogs()
  }

  // ================= Sentinela NOX Getters and Operations =================

  public getCommunications(): SentinelaCommunication[] {
    return [...this.communications]
  }

  public getCommunicationById(id: string): SentinelaCommunication | undefined {
    return this.communications.find((c) => c.id === id || c.externalId === id)
  }

  public saveCommunications() {
    try {
      localStorage.setItem(STORAGE_KEYS.COMMUNICATIONS, JSON.stringify(this.communications))
    } catch {
      /* ignore */
    }
    this.notify()
  }

  public advanceCommunicationStatus(
    commId: string,
    targetStage: SentinelaCommunication['status'],
    actor = 'Operador NOX',
    justification?: string,
  ): boolean {
    const comm = this.communications.find((c) => c.id === commId)
    if (!comm) return false

    const old = comm.status
    comm.status = targetStage
    comm.updatedAt = new Date().toISOString()

    const step = {
      id: `step_${Date.now()}`,
      stage: targetStage,
      timestamp: new Date().toISOString(),
      actor,
      actorRole: 'ADVOGADO_SENIOR' as const,
      sourceConfidence: 1.0,
      actionSummary: `Status da comunicação avançado de "${old}" para "${targetStage}".`,
      justification,
    }
    comm.custody.timeline.unshift(step)

    this.logAction('COMUNICACAO_STATUS_AVANCADO', 'revisao', actor, comm.id, {
      de: old,
      para: targetStage,
      processo: comm.numeroProcesso,
      justificativa: justification,
    })

    this.saveCommunications()
    return true
  }

  public approveCommunicationDeadline(
    commId: string,
    customMemorial: DeadlineMemorial,
    actor?: string,
  ): { task: SentinelaTask; event: AgendaEvent } | null {
    const comm = this.communications.find((c) => c.id === commId)
    if (!comm) return null

    const defaultLawyer = this.settings.lawyerName || 'Higor Utinoi de Oliveira'
    const actualActor = actor || defaultLawyer

    comm.status = 'PRAZO_TAREFA_AGENDA'
    comm.deadlineCalculated = customMemorial
    comm.custody.reviewedBy = actualActor
    comm.custody.reviewedAt = new Date().toISOString()

    // Create Synchronized Task
    const taskId = `task_${Date.now()}`
    const newTask: SentinelaTask = {
      id: taskId,
      title: `Tratar prazo: ${customMemorial.legalRuleName} - ${comm.numeroProcesso}`,
      description: `Originado de ${comm.source} (#${comm.externalId}): ${comm.teorResumido}`,
      status: 'A_FAZER',
      priority:
        comm.urgencyLevel === 'critica' || comm.urgencyLevel === 'alta' ? 'URGENTE' : 'MEDIA',
      responsible: comm.assignedTo || defaultLawyer,
      collaborators: [],
      estimatedHours: 6,
      startDate: new Date().toISOString().split('T')[0],
      internalDueDate: customMemorial.internalDeadlineDate,
      legalDeadlineDate: customMemorial.finalDeadlineDate,
      processNumber: comm.numeroProcesso,
      communicationId: comm.id,
      deadlineId: customMemorial.id,
      subtasks: [
        { id: 'st-1', text: 'Análise aprofundada dos autos', completed: false },
        { id: 'st-2', text: 'Elaboração da peça processual', completed: false },
        { id: 'st-3', text: 'Revisão técnica e protocolo tempestivo', completed: false },
      ],
      dependenciesTaskIds: [],
      isBlocked: false,
      tags: [comm.tribunal, 'Prazo Judicial', customMemorial.daysType],
      comments: [
        {
          id: `c_${Date.now()}`,
          author: actualActor,
          text: 'Prazo homologado pelo Motor de Verdade Temporal.',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Create Synchronized Agenda Event
    const eventId = `agenda_${Date.now()}`
    const newEvent: AgendaEvent = {
      id: eventId,
      title: `Vencimento: ${customMemorial.legalRuleName}`,
      description: `Processo ${comm.numeroProcesso} (${comm.tribunal}) - ${comm.teorResumido}`,
      eventType: 'VENCIMENTO_PRAZO',
      startDate: `${customMemorial.finalDeadlineDate}T23:59:59Z`,
      endDate: `${customMemorial.finalDeadlineDate}T23:59:59Z`,
      isAllDay: true,
      isVirtual: false,
      processNumber: comm.numeroProcesso,
      responsible: comm.assignedTo || actualActor,
      participants: [actualActor],
      tribunal: comm.tribunal,
      communicationId: comm.id,
      deadlineId: customMemorial.id,
      taskId: newTask.id,
      status: 'AGENDADO',
      remindersMinutesBefore: [1440, 240, 60],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    comm.custody.generatedArtifacts = {
      deadlineId: customMemorial.id,
      taskId: newTask.id,
      agendaId: newEvent.id,
    }

    comm.custody.timeline.unshift({
      id: `step_${Date.now()}`,
      stage: 'PRAZO_TAREFA_AGENDA',
      timestamp: new Date().toISOString(),
      actor: actualActor,
      actorRole: 'ADVOGADO_SENIOR',
      sourceConfidence: 1.0,
      actionSummary: `Prazo homologado para ${customMemorial.finalDeadlineDate}. Tarefa #${taskId} e Agenda #${eventId} geradas sincronizadamente.`,
      legalBasis: customMemorial.legalRuleArticle,
    })

    this.tasks.unshift(newTask)
    this.agendaEvents.unshift(newEvent)

    this.saveCommunications()
    this.saveTasks()
    this.saveAgenda()

    this.logAction('PRAZO_HOMOLOGADO_E_DISTRIBUIDO', 'revisao', actualActor, comm.id, {
      fatalDate: customMemorial.finalDeadlineDate,
      internalDate: customMemorial.internalDeadlineDate,
      taskId,
      eventId,
    })
    return { task: newTask, event: newEvent }
  }

  // ================= Tasks Operations =================

  public getTasks(): SentinelaTask[] {
    return [...this.tasks]
  }

  public saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(this.tasks))
    } catch {
      /* ignore */
    }
    this.notify()
  }

  public addTask(task: SentinelaTask) {
    this.tasks.unshift(task)
    this.saveTasks()
    this.logAction('TAREFA_CRIADA', 'sistema', task.responsible, task.id, { title: task.title })
  }

  public updateTask(id: string, updates: Partial<SentinelaTask>) {
    const t = this.tasks.find((task) => task.id === id)
    if (!t) return false
    Object.assign(t, updates, { updatedAt: new Date().toISOString() })
    this.saveTasks()
    return true
  }

  public toggleSubtask(taskId: string, subtaskId: string, actor = 'Operador NOX') {
    const t = this.tasks.find((task) => task.id === taskId)
    if (!t) return false
    const st = t.subtasks.find((s) => s.id === subtaskId)
    if (!st) return false
    st.completed = !st.completed
    st.completedAt = st.completed ? new Date().toISOString() : undefined
    st.completedBy = st.completed ? actor : undefined
    t.updatedAt = new Date().toISOString()
    this.saveTasks()
    return true
  }

  // ================= Agenda Operations =================

  public getAgendaEvents(): AgendaEvent[] {
    return [...this.agendaEvents]
  }

  public saveAgenda() {
    try {
      localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(this.agendaEvents))
    } catch {
      /* ignore */
    }
    this.notify()
  }

  public addAgendaEvent(event: AgendaEvent) {
    this.agendaEvents.unshift(event)
    this.saveAgenda()
    this.logAction('EVENTO_AGENDA_CRIADO', 'sistema', event.responsible, event.id, {
      title: event.title,
      date: event.startDate,
    })
  }

  public updateAgendaEvent(id: string, updates: Partial<AgendaEvent>) {
    const e = this.agendaEvents.find((event) => event.id === id)
    if (!e) return false
    Object.assign(e, updates, { updatedAt: new Date().toISOString() })
    this.saveAgenda()
    return true
  }

  // ================= Automations & Health =================

  public getAutomations(): AutomationRule[] {
    return [...this.automations]
  }

  public toggleAutomation(id: string) {
    const a = this.automations.find((item) => item.id === id)
    if (!a) return
    a.active = !a.active
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOMATIONS, JSON.stringify(this.automations))
    } catch {
      /* ignore */
    }
    this.notify()
  }

  public getApiHealth(): SentinelaApiHealth[] {
    return [...this.apiHealth]
  }

  public getIncidents(): IncidentCrisisRoom[] {
    return [...this.incidents]
  }

  public createIncident(incident: IncidentCrisisRoom) {
    this.incidents.unshift(incident)
    try {
      localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(this.incidents))
    } catch {
      /* ignore */
    }
    this.logAction('SALA_INCIDENTE_ABERTA', 'sistema', incident.incidentLeader, incident.id, {
      title: incident.title,
    })
    this.notify()
  }

  public getLawyerProfile(): {
    nome: string
    oab: string
    uf: string
    email: string
    telefone: string
    escritorio: string
    cargo: string
  } {
    return {
      nome: this.settings.lawyerName || 'Higor Utinoi de Oliveira',
      oab: this.settings.lawyerOab || 'OAB/MS 15.400',
      uf: this.settings.lawyerUf || 'MS',
      email: this.settings.lawyerEmail || 'contato@utinoiadvocacia.com.br',
      telefone: this.settings.lawyerPhone || '(67) 3000-0000',
      escritorio: this.settings.officeName || 'Higor Utinói Advocacia',
      cargo: 'Advogado Titular / Responsável Técnico',
    }
  }

  public updateLawyerProfile(
    profile: Partial<{
      nome: string
      oab: string
      uf: string
      email: string
      telefone: string
      escritorio: string
    }>,
  ) {
    const updates: Partial<AppSettings> = {}
    if (profile.nome !== undefined) {
      updates.lawyerName = profile.nome
      updates.defaultResponsible = profile.nome
    }
    if (profile.oab !== undefined) updates.lawyerOab = profile.oab
    if (profile.uf !== undefined) updates.lawyerUf = profile.uf
    if (profile.email !== undefined) updates.lawyerEmail = profile.email
    if (profile.telefone !== undefined) updates.lawyerPhone = profile.telefone
    if (profile.escritorio !== undefined) updates.officeName = profile.escritorio

    this.saveSettings(updates)
  }

  public getDecisionMemory(): DecisionMemoryItem[] {
    return [...this.decisionMemory]
  }

  public getOperationalTwin(): OperationalTwinCapacity[] {
    return [...INITIAL_OPERATIONAL_TWIN]
  }

  public getGaps(): GapItem[] {
    return [...INITIAL_GAPS]
  }

  public getRecoveredTimeMetric(): RecoveredTimeMetric {
    const automatedCommunications = this.communications.length
    const automatedDeadlines = this.communications.filter((c) => c.deadlineCalculated).length
    const automatedTasks = this.tasks.length

    const commMins = automatedCommunications * 20 // 20 min per manual capture & check
    const deadlineMins = automatedDeadlines * 35 // 35 min per manual court holiday calculation
    const taskMins = automatedTasks * 15 // 15 min per manual distribution

    const totalMins = commMins + deadlineMins + taskMins

    return {
      totalMinutesSaved: totalMins,
      totalActionsAutomated: automatedCommunications + automatedDeadlines + automatedTasks,
      manualBaselineHours: Math.round((totalMins / 60) * 10) / 10,
      actualProcessingHours: Math.round((totalMins / 60) * 0.05 * 10) / 10,
      breakdown: [
        {
          category: 'Captura & Sanitização DJEN/PJe',
          count: automatedCommunications,
          minutesPerUnitSaved: 20,
          totalHours: Math.round((commMins / 60) * 10) / 10,
        },
        {
          category: 'Cálculo de Prazo & Memorial Temporal',
          count: automatedDeadlines,
          minutesPerUnitSaved: 35,
          totalHours: Math.round((deadlineMins / 60) * 10) / 10,
        },
        {
          category: 'Distribuição e Sincronização de Tarefas',
          count: automatedTasks,
          minutesPerUnitSaved: 15,
          totalHours: Math.round((taskMins / 60) * 10) / 10,
        },
      ],
    }
  }

  public getDailyBriefing(): DailyBriefingData {
    const todayStr = new Date().toISOString().split('T')[0]
    const defaultLawyer = this.settings.lawyerName || 'Higor Utinoi de Oliveira'
    return {
      date: todayStr,
      urgentDeadlinesToday: [
        {
          id: 'dead-101',
          process: '1004523-88.2025.8.26.0100',
          title: 'Apelação Cível TJSP (Fase de Elaboração)',
          responsible: defaultLawyer,
          hoursLeft: 14,
        },
      ],
      upcomingCommitments: [
        {
          id: 'agenda-102',
          time: '14:30',
          title: 'Audiência de Instrução e Julgamento (Zoom TRT24)',
          type: 'AUDIENCIA',
          responsible: defaultLawyer,
        },
        {
          id: 'agenda-103',
          time: '10:00',
          title: 'Reunião de Alinhamento Estratégico com Diretoria',
          type: 'REUNIAO',
          responsible: defaultLawyer,
        },
      ],
      pendingReviewsCount: this.communications.filter(
        (c) => c.status === 'REVISAO_HUMANA' || c.status === 'VALIDADA',
      ).length,
      highRiskAlertsCount: this.records.filter((r) => r.severity === 'critico').length,
      captureHealthStatus: 'ESTAVEL',
      bottlenecks: [
        `${defaultLawyer} possui audiências de instrução e prazos concentrados nos próximos 3 dias.`,
        'Tarefa #task-103 aguarda manifestação de terceiro (laudo pericial).',
      ],
      explainableRecommendations: [
        {
          title: 'Homologar prazo ambíguo em comm-103 (Despacho sobre Laudo)',
          reason:
            'Prazo pode vencer em 5 dias ou 15 dias conforme Art. 218 § 3º ou Art. 477 § 1º CPC.',
          suggestedAction: 'Abrir Triagem Sentinela e validar memorial.',
          targetRoute: '/sentinela/triagem',
        },
        {
          title: 'Conferir suspensões forenses de Campo Grande / TJMS',
          reason:
            'Prevenção de preclusão de prazos em comarcas com feriados municipais no calendário.',
          suggestedAction: 'Acessar Central de Prazos e validar calendário.',
          targetRoute: '/prazos',
        },
      ],
    }
  }

  public isUsingRealImportedData(): boolean {
    const activeBatch = this.imports[0]
    return Boolean(activeBatch && activeBatch.id !== 'batch_sentinela_2026_09_01')
  }

  public getActiveBatch(): ImportBatch | undefined {
    return this.imports[0]
  }

  public resetToSyntheticDemo(): void {
    this.records = generateFullSyntheticDataset()
    this.imports = [INITIAL_BATCH]
    this.auditLogs = [...INITIAL_AUDIT_LOGS]
    this.communications = [...INITIAL_SENTINELA_COMMUNICATIONS]
    this.tasks = [...INITIAL_SENTINELA_TASKS]
    this.agendaEvents = [...INITIAL_AGENDA_EVENTS]
    this.automations = [...INITIAL_AUTOMATION_RULES]
    this.apiHealth = [...INITIAL_API_HEALTH]
    this.incidents = [...INITIAL_INCIDENT_ROOMS]
    this.decisionMemory = [...INITIAL_DECISION_MEMORY]
    this.settings = { ...DEFAULT_SETTINGS }

    this.saveRecords()
    this.saveImports()
    this.saveAuditLogs()
    this.saveCommunications()
    this.saveTasks()
    this.saveAgenda()
    this.saveSettings(DEFAULT_SETTINGS)
  }
}

export const dataStore = NoxDataStore.getInstance()
