// Domain contracts and types for NOX Control Center & Sentinela NOX

export type IngestionSource = 'DJEN' | 'PJE' | 'CSV' | 'API_GATEWAY' | 'EMAIL' | 'DIARIO_OFICIAL'

export type CommunicationStatus =
  | 'CAPTURADA'
  | 'VALIDADA'
  | 'VINCULADA_AO_PROCESSO'
  | 'ANALISADA'
  | 'REVISAO_HUMANA'
  | 'PRAZO_TAREFA_AGENDA'
  | 'CONCLUIDA'

export type TriageCategory = 'nova' | 'duplicada' | 'ambigua' | 'urgente' | 'em_revisao'

export type RuleCalculationType = 'uteis' | 'corridos'

export const PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE = 'PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE'

export interface CustodySnapshot {
  hashSha256: string
  capturedAt: string
  source: IngestionSource
  externalId: string
  rawPayloadSnippet: string
  contentLength: number
  sanitized: boolean
  promptInjectionCheck: {
    clean: boolean
    riskScore: number
    notes?: string
  }
}

export interface CustodyTimelineStep {
  id: string
  stage: CommunicationStatus
  timestamp: string
  actor: string
  actorRole: 'SISTEMA_IA' | 'OPERADOR' | 'ADVOGADO_SENIOR' | 'AUDITOR'
  sourceConfidence: number // 0 to 1
  actionSummary: string
  justification?: string
  legalBasis?: string
  evidenceHash?: string
}

export interface CustodyChain {
  communicationId: string
  snapshot: CustodySnapshot
  processNumber: string
  previousEventId?: string
  suggestedClassification: string
  confidence: number // 0.0 - 1.0
  humanReviewRequired: boolean
  humanReviewReason?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  generatedArtifacts: {
    deadlineId?: string
    taskId?: string
    agendaId?: string
  }
  isDuplicate: boolean
  duplicateOfId?: string
  timeline: CustodyTimelineStep[]
}

export interface SentinelaCommunication {
  id: string
  externalId: string
  source: IngestionSource
  numeroProcesso: string
  tribunal: string
  orgaoJulgador: string
  comarca?: string
  classeJudicial?: string
  destinatario: string
  tipoComunicacao:
    | 'INTIMACAO'
    | 'CITACAO'
    | 'NOTIFICACAO'
    | 'PUBLICACAO'
    | 'DESPACHO'
    | 'SENTENCA'
    | 'ACORDAO'
  dataDisponibilizacao: string
  dataPublicacao?: string
  teorResumido: string
  teorCompleto: string
  status: CommunicationStatus
  triageCategory: TriageCategory
  urgencyLevel: 'baixa' | 'media' | 'alta' | 'critica'
  riskScore: number // 0 - 100
  assignedTo?: string
  clientId?: string
  clientCode?: string
  clientName?: string
  custody: CustodyChain
  deadlineCalculated?: DeadlineMemorial
  createdAt: string
  updatedAt: string
}

export interface HolidayOrSuspension {
  date: string
  name: string
  type:
    | 'FERIADO_NACIONAL'
    | 'FERIADO_ESTADUAL'
    | 'FERIADO_REGIMENTAL'
    | 'SUSPENSAO_EXPEDIENTE'
    | 'RECESSO_FORENSE'
  tribunal?: string
  comarca?: string
}

export interface DeadlineStep {
  stepNumber: number
  date: string
  dayOfWeek: string
  isBusinessDay: boolean
  description: string
  reasonIfNotBusinessDay?: string
}

export interface DeadlineMemorial {
  id: string
  communicationId?: string
  numeroProcesso: string
  originText: string
  generatingAct: string
  legalRuleName: string
  legalRuleArticle: string
  daysCount: number
  daysType: RuleCalculationType
  initialDateMarker: string // Data da publicação ou intimação
  firstDayCounted: string // Primeiro dia do cômputo
  tribunal: string
  comarca: string
  holidaysApplied: HolidayOrSuspension[]
  calculationSteps: DeadlineStep[]
  finalDeadlineDate: string
  finalDeadlineTime?: string
  confidenceScore: number // 0.0 - 1.0
  confidenceLevel: 'ALTA' | 'MODERADA' | 'BAIXA' | 'INCONCLUSIVA'
  isDeterminable: boolean
  notDeterminableCode?: typeof PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE
  divergences?: string[]
  missingData?: string[]
  reviewedBy?: string
  reviewedAt?: string
  reviewApprovalStatus: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'AJUSTADO_MANUAL'
  ruleVersion: string
  internalDeadlineDate: string // Prazo interno antecipado para garantia
  notes?: string
}

export type AgendaEventType =
  | 'AUDIENCIA'
  | 'COMPROMISSO'
  | 'REUNIAO'
  | 'ATENDIMENTO'
  | 'DILIGENCIA'
  | 'VENCIMENTO_PRAZO'
  | 'SUSTENTACAO_ORAL'
  | 'PERICIA'

export interface AgendaEvent {
  id: string
  title: string
  description?: string
  eventType: AgendaEventType
  startDate: string
  endDate: string
  isAllDay: boolean
  locationOrLink?: string
  isVirtual: boolean
  processNumber?: string
  clientName?: string
  responsible: string
  participants: string[]
  tribunal?: string
  communicationId?: string
  deadlineId?: string
  taskId?: string
  status: 'AGENDADO' | 'CONFIRMADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'REAGENDADO'
  recurrenceRule?: string
  remindersMinutesBefore: number[]
  conflictDetected?: boolean
  conflictNotes?: string
  preparacaoHabilitada?: boolean
  clientId?: string
  clientCpf?: string
  tipoAudiencia?: 'CONCILIACAO' | 'INSTRUCAO_E_JULGAMENTO' | string
  aprovadoParaCliente?: boolean
  alegacoesProcesso?: {
    revisado_por?: string
    data_revisao?: string
    o_que_voce_contou?: string
    o_que_outra_parte_respondeu?: string
    o_que_esta_em_aberto?: string
  }
  createdAt: string
  updatedAt: string
}

export type TaskStatus = 'A_FAZER' | 'EM_ANDAMENTO' | 'BLOQUEADA' | 'REVISAO' | 'CONCLUIDA'
export type TaskPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'

export interface TaskChecklistItem {
  id: string
  text: string
  completed: boolean
  completedAt?: string
  completedBy?: string
}

export interface TaskComment {
  id: string
  author: string
  text: string
  createdAt: string
}

export interface SentinelaTask {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  responsible: string
  collaborators: string[]
  estimatedHours: number
  startDate?: string
  internalDueDate: string // Prazo interno da equipe
  legalDeadlineDate?: string // Prazo fatal jurídico (imutável pela tarefa)
  processNumber?: string
  clientName?: string
  communicationId?: string
  deadlineId?: string
  agendaEventId?: string
  subtasks: TaskChecklistItem[]
  dependenciesTaskIds: string[]
  isBlocked: boolean
  blockReason?: string
  tags: string[]
  comments: TaskComment[]
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface OperationalTwinCapacity {
  personName: string
  role: string
  activeTasksCount: number
  overdueTasksCount: number
  deadlinesNext7Days: number
  agendaCommitmentsCount: number
  capacityPercentage: number // 0-100+ %
  riskOfOverload: boolean
  suggestedAction?: string
}

export interface GapItem {
  id: string
  category:
    | 'SEM_PROCESSO'
    | 'SEM_RESPONSAVEL'
    | 'SEM_PRAZO_DEFINIDO'
    | 'SEM_DOCUMENTO'
    | 'SEM_REVISAO'
    | 'SEM_PROXIMA_ACAO'
  severity: 'ALTA' | 'MEDIA' | 'BAIXA'
  targetTitle: string
  targetType: 'COMUNICACAO' | 'PROCESSO' | 'TAREFA' | 'PRAZO'
  targetId: string
  description: string
  recommendedFix: string
  detectedAt: string
}

export interface DecisionMemoryItem {
  id: string
  similarityContext: string
  situationSummary: string
  decisionTaken: string
  decisionAuthor: string
  outcome: 'POSITIVO' | 'AJUSTADO' | 'RISCO_MITIGADO'
  appliedDate: string
  caseTags: string[]
}

export interface IncidentCrisisRoom {
  id: string
  title: string
  severity: 'CRITICO' | 'ALTO' | 'MODERADO'
  status: 'ABERTO' | 'CONTIDO' | 'RESOLVIDO'
  incidentType:
    | 'FALHA_API_TRIBUNAL'
    | 'PRAZO_EM_MASSA'
    | 'INSTABILIDADE_SISTEMA'
    | 'EXPEDIENTE_SUSPENSO_REPENTINO'
  affectedCount: number
  affectedItemsIds: string[]
  contingencyPlan: string
  incidentLeader: string
  timelineUpdates: Array<{
    timestamp: string
    author: string
    note: string
  }>
  createdAt: string
  resolvedAt?: string
}

export interface RecoveredTimeMetric {
  totalMinutesSaved: number
  totalActionsAutomated: number
  manualBaselineHours: number
  actualProcessingHours: number
  breakdown: Array<{
    category: string
    count: number
    minutesPerUnitSaved: number
    totalHours: number
  }>
}

export interface DailyBriefingData {
  date: string
  urgentDeadlinesToday: Array<{
    id: string
    process: string
    title: string
    responsible: string
    hoursLeft: number
  }>
  upcomingCommitments: Array<{
    id: string
    time: string
    title: string
    type: AgendaEventType
    responsible: string
  }>
  pendingReviewsCount: number
  highRiskAlertsCount: number
  captureHealthStatus: 'ESTAVEL' | 'DEGRADADO' | 'FALHA'
  bottlenecks: string[]
  explainableRecommendations: Array<{
    title: string
    reason: string
    suggestedAction: string
    targetRoute: string
  }>
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  triggerEvent:
    | 'NOVA_PUBLICACAO_URGENTE'
    | 'AUDIENCIA_MARCADA'
    | 'PRAZO_APROVADO'
    | 'TAREFA_BLOQUEADA_ATRASADA'
    | 'API_FALHA_SINCRONIZACAO'
    | 'PROCESSO_SEM_MOVIMENTO_30D'
  conditionFormula: string
  actionFormula: string
  requiresHumanApproval: boolean
  active: boolean
  lastTriggeredAt?: string
  executionsCount: number
  simulationResultPreview?: string
}

export interface SentinelaApiHealth {
  serviceName: string
  endpoint: string
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MOCK_ADAPTER'
  lastSyncAt: string
  latencyMs: number
  queuePendingCount: number
  failuresLast24h: number
  notes: string
}
