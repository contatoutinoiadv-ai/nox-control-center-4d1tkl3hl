import { NoxRecord, ImportBatch, AuditLogEntry, NoxSystemStats } from '@/types/nox'
import { generateFullSyntheticDataset, INITIAL_BATCH, INITIAL_AUDIT_LOGS } from '@/data/mockData'

const STORAGE_KEYS = {
  RECORDS: 'nox_control_center_records_v1',
  IMPORTS: 'nox_control_center_imports_v1',
  AUDIT_LOGS: 'nox_control_center_audit_logs_v1',
  SETTINGS: 'nox_control_center_settings_v1',
}

export interface AppSettings {
  demoMode: boolean
  reducedMotionPreference: boolean
  autoRefreshRadar: boolean
  refreshIntervalSeconds: number
  lexTempusFeatureFlag: boolean
  strictCnjValidation: boolean
  defaultResponsible: string
}

const DEFAULT_SETTINGS: AppSettings = {
  demoMode: true,
  reducedMotionPreference: false,
  autoRefreshRadar: true,
  refreshIntervalSeconds: 15,
  lexTempusFeatureFlag: false,
  strictCnjValidation: true,
  defaultResponsible: 'Dra. Mariana Rios',
}

export class NoxDataStore {
  private static instance: NoxDataStore
  private records: NoxRecord[] = []
  private imports: ImportBatch[] = []
  private auditLogs: AuditLogEntry[] = []
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
    } catch {
      this.records = generateFullSyntheticDataset()
      this.imports = [INITIAL_BATCH]
      this.auditLogs = [...INITIAL_AUDIT_LOGS]
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

  public addImportBatch(
    batch: ImportBatch,
    newRecords: NoxRecord[],
  ): { success: boolean; message: string } {
    // Duplicate check
    const existing = this.imports.find((i) => i.hash === batch.hash)
    if (existing) {
      return {
        success: false,
        message: `Arquivo duplicado! O lote "${existing.filename}" com o mesmo SHA-256 (${batch.hash.slice(0, 10)}...) já foi importado em ${new Date(existing.createdAt).toLocaleString('pt-BR')}.`,
      }
    }

    this.imports.unshift(batch)
    this.records = [...newRecords, ...this.records]

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
    return {
      success: true,
      message: `Lote importado com sucesso: ${batch.acceptedCount} aceitos, ${batch.quarantinedCount} em quarentena.`,
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

  public resetToSyntheticDemo(): void {
    this.records = generateFullSyntheticDataset()
    this.imports = [INITIAL_BATCH]
    this.auditLogs = [...INITIAL_AUDIT_LOGS]
    this.settings = DEFAULT_SETTINGS
    this.saveRecords()
    this.saveImports()
    this.saveAuditLogs()
    this.saveSettings(DEFAULT_SETTINGS)
  }
}

export const dataStore = NoxDataStore.getInstance()
