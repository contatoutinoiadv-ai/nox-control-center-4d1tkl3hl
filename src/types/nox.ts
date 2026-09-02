// Types and Contracts for NOX CONTROL CENTER

export type RecordStatus = 'novo' | 'em_revisao' | 'processado' | 'quarentena' | 'resolvido'
export type SeverityLevel = 'informativo' | 'medio' | 'alto' | 'critico'
export type AlertType = 'operacional' | 'qualidade_dado' | 'importacao' | 'futuro_lex_tempus'
export type PriorityLevel = 'baixa' | 'media' | 'alta' | 'urgente'

export interface RawSentinelaRow {
  [key: string]: string | number | boolean | null | undefined
}

export interface ValidationIssue {
  field: string
  type: 'missing_field' | 'format_error' | 'ambiguous_value' | 'suspicious_payload'
  message: string
  severity: 'warning' | 'error'
}

export interface RecordNote {
  id: string
  author: string
  text: string
  createdAt: string
}

export interface ActionHistoryEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  details?: string
}

export type ClientStage =
  | 'novo'
  | 'em_atendimento'
  | 'aguardando_documentos'
  | 'ativo'
  | 'concluido'
  | 'inativo'

export type ClientOrigin = 'intake_site' | 'manual' | 'whatsapp' | 'indicacao' | 'presencial'

export type ClientDemandArea =
  | 'consumidor'
  | 'trabalhista'
  | 'civel'
  | 'criminal'
  | 'bancario'
  | 'imobiliario'
  | 'tributario'
  | 'familia'
  | 'previdenciario'
  | 'outro'

export interface ClientGeneratedDoc {
  id: string
  templateId?: string
  nomeModelo: string
  criadoEm: string
  autor: string
  conteudoHtml?: string
  status: 'gerado' | 'assinado' | 'pendente'
  downloadUrl?: string
}

export interface NoxClient {
  id: string
  clientCode: string // ex: CLI-2026-001 ou PROTOCOLO
  protocolo?: string
  nome: string
  cpf?: string
  rg?: string
  telefone?: string
  email?: string
  endereco?: string
  profissao?: string
  nacionalidade?: string
  estadoCivil?: string
  demanda: ClientDemandArea | string
  descricaoCaso?: string
  origem: ClientOrigin
  estagio: ClientStage
  docsGerados: ClientGeneratedDoc[]
  processosVinculados: string[] // lista de numero_processo ou record_code vinculados
  obs?: string
  responsavel?: string
  createdAt: string
  updatedAt: string
}

export interface NoxRecord {
  id: string
  recordCode: string
  numeroProcesso: string
  tribunal: string
  orgaoJulgador: string
  classeJudicial: string
  assunto: string
  partes: string
  dataDistribuicao: string
  valorCausa?: number | null
  status: RecordStatus
  severity: SeverityLevel
  alertType: AlertType
  alertTitle: string
  alertDescription: string
  priority: PriorityLevel
  responsible: string
  tags: string[]
  notes: RecordNote[]
  history: ActionHistoryEntry[]
  rawSourceRow: RawSentinelaRow
  normalizedData: {
    processoFormatado: string
    tribunalPadrao: string
    uf: string
    poloAtivo: string
    poloPassivo: string
    assuntoPrincipal: string
    instancia: string
    grauRiscoEstimado?: 'baixo' | 'moderado' | 'alto'
  }
  validationErrors: ValidationIssue[]
  sourceBatchId: string
  sourceRowIndex: number
  clientId?: string
  clientCode?: string
  createdAt: string
  updatedAt: string
}

export interface ImportBatch {
  id: string
  filename: string
  hash: string // SHA-256
  byteSize: number
  encoding: string
  delimiter: string
  rawContent: string // Original untouched bytes/string
  totalRows: number
  acceptedCount: number
  quarantinedCount: number
  rejectedCount: number
  columnMapping: Record<string, string>
  createdAt: string
  status: 'concluido' | 'quarentena_parcial' | 'falha'
  sampleRows: RawSentinelaRow[]
}

export interface AuditLogEntry {
  id: string
  action: string
  category: 'importacao' | 'revisao' | 'exportacao' | 'sistema' | 'configuracao' | 'lex_tempus'
  actor: string
  targetId?: string
  details: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}

// LEX TEMPUS Contract (Versioned v1)
export interface LexTempusInputV1 {
  version: '1.0.0'
  systemSource: 'NOX-CONTROL-CENTER'
  recordCode: string
  numeroProcesso: string
  tribunal: string
  orgaoJulgador: string
  classeJudicial: string
  assunto: string
  partes: string
  dataDisponibilizacao?: string
  conteudoPublicacao?: string
  metadata?: Record<string, unknown>
}

export interface LexTempusResultV1 {
  contractVersion: '1.0.0'
  status: 'PENDING_INTEGRATION_FLAG' | 'MOCK_CALCULATED' | 'DISABLED'
  active: false
  disclaimer: string
  estimatedDeadlines: Array<{
    tipoPrazo: string
    diasUteis: number
    fundamentoLegal: string
    alertaPreventivo: string
  }>
  complianceChecks: Array<{
    nome: string
    aprovado: boolean
    observacao: string
  }>
}

export interface LawyerProfile {
  nome: string
  oab: string
  uf: string
  email: string
  telefone?: string
  escritorio?: string
  cargo?: string
}

export interface NoxSystemStats {
  totalMonitored: number
  criticalAlerts: number
  highAlerts: number
  mediumAlerts: number
  infoAlerts: number
  newRecords: number
  inReviewRecords: number
  quarantinedRecords: number
  resolvedRecords: number
  lastImportTimestamp: string
  sentinelaConnected: boolean
  sentinelaSyncMode: 'IMPORT_CSV_ISOLATED'
}
