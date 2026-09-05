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
