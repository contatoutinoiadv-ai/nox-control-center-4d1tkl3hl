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
  alegacoesProcesso?: {
    revisado_por?: string
    data_revisao?: string
    o_que_voce_contou?: string
    o_que_outra_parte_respondeu?: string
    o_que_esta_em_aberto?: string
  }
  aprovadoParaCliente?: boolean
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
  category:
    | 'importacao'
    | 'revisao'
    | 'exportacao'
    | 'sistema'
    | 'configuracao'
    | 'lex_tempus'
    | 'producao'
    | 'migracao'
    | 'seguranca'
    | 'atendimento'
  actor: string
  targetId?: string
  details: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}

// ----------------------------------------------------
// PRODUÇÃO (Controladoria de Produção de Peças NOX)
// ----------------------------------------------------

export type ProductionStage =
  | 'triagem_evidencias'
  | 'tese_em_definicao'
  | 'em_redacao'
  | 'stress_test_adversarial'
  | 'pronto_protocolo'
  | 'protocolado'

export type ProductionNivel = 1 | 2 | 3

export interface TriagemEvidenciasCamadas {
  essencial: number
  util: number
  neutro: number
  perigoso: number
  dispensavel: number
  completa: boolean
  itensDetalhados?: Array<{
    id: string
    descricao: string
    camada: 'essencial' | 'util' | 'neutro' | 'perigoso' | 'dispensavel'
    observacao?: string
  }>
}

export interface StressTestValidation {
  tecnicaJuridica: boolean // Camada 1: Técnica jurídica
  coerenciaNarrativa: boolean // Camada 2: Coerência narrativa
  humanizacao: boolean // Camada 3: Humanização
  observacoes?: string
  reprovacoesHistorico?: Array<{
    data: string
    motivo: string
    camadasReprovadas: string[]
    actor: string
  }>
}

export interface ProductionStageHistory {
  stage: ProductionStage
  enteredAt: string
  leftAt?: string
  durationDays?: number
  actor: string
  justification?: string
}

export interface ProductionItem {
  id: string
  clientId: string // Vínculo obrigatório com Clientes
  clientName?: string
  clientCode?: string
  numeroProcesso?: string // Quando já existe
  tituloPeca: string // Ex: "Contestação — Rogelio Felix da Silva"
  nivel: ProductionNivel // 1, 2 ou 3 (Oráculo NOX, Nível 3 padrão)
  estagio: ProductionStage
  responsavel: string
  triagemEvidencias: TriagemEvidenciasCamadas
  teseDominante?: string
  motivoTravamento?: string
  dataEntradaEstagioAtual: string // ISO date/datetime pra envelhecimento
  stressTestAprovado: boolean
  stressTestDetalhes?: StressTestValidation
  historicoEstagios?: ProductionStageHistory[]
  createdAt: string
  updatedAt: string
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

export type LexTempusConfidenceLevel = 'alta' | 'media' | 'baixa'

export interface LexTempusAiInterpretation {
  atoGerador: string
  tipoPrazoSugerido: string
  tipoPrazoNome: string
  fundamentacaoRegra: string
  nivelConfiancaInterpretacao: LexTempusConfidenceLevel
  pontosDeAtencao: string
  requerRevisaoHumana: boolean
  modeloUtilizado?: string
  isFallback?: boolean
}

export interface LexTempusResultV1 {
  contractVersion: '1.0.0'
  status:
    | 'CALCULATED'
    | 'REQUIRES_HUMAN_REVIEW'
    | 'UNCERTAIN_INTERPRETATION'
    | 'MOCK_CALCULATED'
    | 'DISABLED'
  active: boolean
  disclaimer: string
  aiInterpretation?: LexTempusAiInterpretation
  deadlineMemorial?: import('./sentinela').DeadlineMemorial
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
  motivoTravamentoSugerido?: string
}

export type UserRole = 'admin' | 'operador'

export type SystemModuleKey =
  | 'central_nox'
  | 'atendimento'
  | 'sentinela'
  | 'clientes'
  | 'producao'
  | 'central_prazos'
  | 'compromissos'
  | 'radar'
  | 'processos'
  | 'importacoes'
  | 'revisao'
  | 'exportacoes'
  | 'lex_tempus'
  | 'auditoria'
  | 'configuracoes'
  | 'usuarios'

export interface UserModulePermission {
  modulo: SystemModuleKey | string
  pode_acessar: boolean
}

export interface NoxUser {
  id: string
  email: string
  name: string
  role: UserRole
  ativo: boolean
  created?: string
  updated?: string
  permissions?: UserModulePermission[]
}

export interface AuthMeResponse {
  ok: boolean
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    ativo: boolean
  }
  role: UserRole
  allowedModules: string[]
  isAdmin: boolean
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
