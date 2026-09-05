/**
 * CENTRAL NOX V2 — MÓDULO DE ATENDIMENTO OPERACIONAL
 * Tipos, Contratos e Estados Canônicos
 *
 * Regra: Todo dado de mensagem externa é tratado como texto puro (não confiável).
 * Nenhum envio real de mensagens ocorre nesta fase (Mock/Demo identificado).
 */

export type ConversationStatus =
  | 'NOVA'
  | 'EM_TRIAGEM'
  | 'EM_ATENDIMENTO'
  | 'AGUARDANDO_CLIENTE'
  | 'AGUARDANDO_ESCRITORIO'
  | 'AGUARDANDO_DOCUMENTO'
  | 'CONCLUIDA'
  | 'ARQUIVADA'

export type ConversationPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'

export type ConversationFilter =
  | 'TODAS'
  | 'NAO_LIDAS'
  | 'URGENTES'
  | 'MINHAS'
  | 'AGUARDANDO_CLIENTE'
  | 'AGUARDANDO_ESCRITORIO'
  | 'CONCLUIDAS'

export type MessageDirection = 'INCOMING' | 'OUTGOING'

export type MessageDeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export type MessageContentType =
  | 'TEXT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'SYSTEM'
  | 'INTERNAL_NOTE'

export interface MessageMediaAttachment {
  url?: string
  fileName: string
  fileSize?: string
  mimeType: string
  durationSeconds?: number
  // Transcrição NOX reservada (somente demonstrativa / placeholder nesta fase)
  transcriptionNox?: string
}

export interface ConversationMessage {
  id: string
  conversationId: string
  direction: MessageDirection
  type: MessageContentType
  // Texto puro — não sanitizado para HTML porque renderiza como string simples
  content: string
  createdAt: string
  senderName: string
  senderRole?: 'CLIENTE' | 'ADVOGADO' | 'OPERADOR' | 'SISTEMA' | 'IA_NOX'
  deliveryStatus?: MessageDeliveryStatus
  isInternalNote?: boolean
  mentions?: string[] // IDs ou nomes @mencionados (ex: ["Higor Utinoi", "Secretaria"])
  attachment?: MessageMediaAttachment
  isMockDemo?: boolean
}

export interface ConversationParticipant {
  id?: string
  name: string
  phone: string
  isClient: boolean
  clientId?: string
  clientCode?: string
  cpf?: string
}

export interface ConversationAiTriage {
  urgencyLevel: string
  subject: string
  summary: string
  intent: string
  riskLevel: string
  suggestedResponse: string
  entitiesIdentified?: string[]
  recommendedActions?: string[]
}

export interface ConversationSummary {
  id: string
  participant: ConversationParticipant
  /** Conveniência para compatibilidade */
  participantName?: string
  participantPhone?: string
  clientId?: string
  assignedTo?: string
  lastMessage: {
    content: string
    createdAt: string
    type: MessageContentType
    senderName: string
    direction: MessageDirection
  }
  unreadCount: number
  status: ConversationStatus
  priority: ConversationPriority
  responsible: string
  responsibleId?: string
  linkedProcessNumber?: string
  linkedProcessId?: string
  tags?: string[]
  isClientLead: 'CLIENTE' | 'LEAD'
  channel: 'WHATSAPP' | 'INTERNAL' | 'PORTAL' | 'SISTEMA'
  createdAt: string
  updatedAt: string
  isMockDemo?: boolean
  aiTriage?: ConversationAiTriage
}

export interface ConversationFilterParams {
  filter: ConversationFilter
  searchQuery?: string
  assignedTo?: string
  status?: ConversationStatus
  priority?: ConversationPriority
  page?: number
  perPage?: number
}

export interface ConversationFilterResult {
  items: ConversationSummary[]
  totalItems: number
  unreadTotal: number
  urgentTotal: number
}

export interface SendMessagePayload {
  conversationId: string
  content: string
  type: 'TEXT' | 'INTERNAL_NOTE'
  attachment?: MessageMediaAttachment
  mentions?: string[]
}

/**
 * Entidades persistidas no PocketBase (Fase 6 Lote 1 & 2)
 */
export type NoxConversationChannel = 'WHATSAPP' | 'INTERNAL' | 'PORTAL' | 'SISTEMA'

export type NoxDbStatus =
  | 'NEW'
  | 'TRIAGE'
  | 'IN_PROGRESS'
  | 'WAITING_CLIENT'
  | 'WAITING_OFFICE'
  | 'WAITING_DOCUMENT'
  | 'COMPLETED'
  | 'ARCHIVED'

export type NoxDbPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type NoxMessageDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL_SYSTEM'
export type NoxMessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'SYSTEM'
export type NoxMessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export type NoxAiAnalysisType =
  | 'TRIAGE'
  | 'SUMMARY'
  | 'INTENT'
  | 'URGENCY'
  | 'CLASSIFICATION'
  | 'RESPONSE_SUGGESTION'
  | 'DOCUMENT_ANALYSIS'

export type NoxAiReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EDITED' | 'NOT_REQUIRED'

export interface NoxConversationRecord {
  id: string
  channel: NoxConversationChannel
  external_conversation_id?: string
  phone_normalized?: string
  contact_name?: string
  client_id?: string
  process_id?: string
  assigned_user_id?: string
  status: NoxDbStatus
  priority: NoxDbPriority
  last_message_at?: string
  last_message_preview?: string
  unread_count?: number
  is_archived?: boolean
  instance_id?: string
  external_chat_id?: string
  created?: string
  updated?: string
  // Expands
  expand?: {
    client_id?: { id: string; nome: string; client_code?: string; cpf?: string; telefone?: string }
    process_id?: { id: string; numero_processo: string; tribunal?: string; cliente?: string }
    assigned_user_id?: { id: string; name: string; email?: string }
  }
}

export interface NoxMessageRecord {
  id: string
  conversation_id: string
  external_message_id?: string
  direction: NoxMessageDirection
  type: NoxMessageType
  sender_type?: string
  sender_user_id?: string
  sender_external_id?: string
  content_text?: string
  status: NoxMessageStatus
  reply_to_message_id?: string
  sent_at?: string
  delivered_at?: string
  read_at?: string
  failed_at?: string
  failure_reason?: string
  metadata_json?: any
  created?: string
  updated?: string
  expand?: {
    sender_user_id?: { id: string; name: string }
  }
}

export interface NoxInternalNoteRecord {
  id: string
  conversation_id: string
  author_user_id: string
  content: string
  mentions?: string[]
  is_archived?: boolean
  deleted_at?: string
  created?: string
  updated?: string
  expand?: {
    author_user_id?: { id: string; name: string; email?: string }
  }
}

export interface NoxAssignmentRecord {
  id: string
  conversation_id: string
  assigned_to_user_id: string
  assigned_by_user_id?: string
  reason?: string
  assigned_at?: string
  ended_at?: string
  created?: string
  updated?: string
  expand?: {
    assigned_to_user_id?: { id: string; name: string }
    assigned_by_user_id?: { id: string; name: string }
  }
}

export interface NoxAiAnalysisRecord {
  id: string
  conversation_id: string
  message_id?: string
  analysis_type: NoxAiAnalysisType
  provider?: string
  model?: string
  result_json: any
  confidence?: number
  review_status: NoxAiReviewStatus
  reviewed_by?: string
  created?: string
  updated?: string
  expand?: {
    reviewed_by?: { id: string; name: string }
  }
}

export interface NoxWebhookEventRecord {
  id: string
  provider: string
  event_type: string
  external_event_id?: string
  payload_hash: string
  status: 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'IGNORED'
  received_at?: string
  processed_at?: string
  attempts?: number
  error_summary?: string
  metadata_json?: any
  created?: string
  updated?: string
}
