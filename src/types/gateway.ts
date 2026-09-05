/**
 * CENTRAL NOX V2 — GATEWAY DE INTEGRAÇÃO & MESSAGING PROVIDER (FASE 8)
 *
 * Contratos, DTOs e Interfaces para integração com mensageria externa (Evolution API / WhatsApp).
 *
 * REGRAS CRÍTICAS DE ARQUITETURA:
 * 1. O frontend NUNCA acessa a Evolution API diretamente.
 * 2. O frontend interage exclusivamente com a camada backend de proxy e webhooks do NOX.
 * 3. Abstração MessagingProvider permite futura substituição por provedor oficial sem refatorar o app.
 * 4. Proteção estrita do type system: InternalNote nunca é aceito como payload de envio externo.
 */

export type IntegrationHealthStatus =
  | 'NOT_CONFIGURED'
  | 'CONNECTED'
  | 'CONNECTING'
  | 'DISCONNECTED'
  | 'DEGRADED'
  | 'UNKNOWN'

export interface IntegrationHealthResponse {
  configured: boolean
  status: IntegrationHealthStatus
  instanceName: string | null
  killSwitchActive: boolean
  discoveryStatus: 'NOT_CONFIGURED' | 'PENDING' | 'DISCOVERED' | 'FAILED'
  detectedVersion?: string | null
  details?: string
  checkedAt: string
}

export interface DiscoveryResponse {
  success: boolean
  status: 'NOT_CONFIGURED' | 'PENDING' | 'DISCOVERED' | 'FAILED'
  discoveryId?: string | null
  version?: string | null
  instanceName?: string | null
  instanceState?: string | null
  endpoints?: Record<string, string>
  errors?: string | null
  executedAt: string
  missing?: Record<string, boolean>
}

/**
 * DTO interno canônico para mensagens recebidas via webhook
 */
export interface NormalizedInboundMessage {
  provider: 'EVOLUTION' | 'MOCK' | 'META_OFFICIAL'
  instanceId: string
  externalMessageId: string
  externalChatId: string
  senderPhone: string
  senderName: string
  direction: 'INBOUND' | 'OUTBOUND'
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'SYSTEM'
  text: string
  timestamp: string
  replyToMessageId?: string | null
  attachmentMetadata?: {
    mimeType?: string
    fileName?: string
    size?: number
    mediaUrl?: string
  } | null
}

/**
 * Payload estrito e validado de envio externo.
 * O type system e o runtime rejeitam explicitamente notas internas.
 */
export interface SendTextMessagePayload {
  messageId?: string
  recipientPhone: string
  text: string
  conversationId?: string
}

/**
 * Resposta canônica de envio pelo gateway
 */
export interface GatewaySendResult {
  success: boolean
  status: 'SENT' | 'FAILED' | 'BLOCKED_BY_KILL_SWITCH' | 'NOT_CONFIGURED'
  externalMessageId?: string | null
  error?: string | null
  sentAt?: string
}

/**
 * Contrato abstrato do provedor de mensageria
 */
export interface IMessagingProvider {
  readonly providerName: string
  checkHealth(): Promise<IntegrationHealthResponse>
  sendTextMessage(payload: SendTextMessagePayload): Promise<GatewaySendResult>
  toggleKillSwitch(active: boolean, reason?: string): Promise<boolean>
  runDiscovery(): Promise<DiscoveryResponse>
}
