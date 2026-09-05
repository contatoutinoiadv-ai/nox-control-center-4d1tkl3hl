/**
 * Mappers para conversão entre registros PocketBase e o contrato IConversationRepository.
 */

import {
  ConversationSummary,
  ConversationMessage,
  NoxConversationRecord,
  NoxMessageRecord,
  NoxInternalNoteRecord,
  MessageContentType,
} from '@/types/atendimento'
import { STATUS_DB_TO_UI, PRIORITY_DB_TO_UI } from '@/services/atendimento/statusTransitions'

export function mapRecordToConversationSummary(rec: NoxConversationRecord): ConversationSummary {
  const clientExpand = rec.expand?.client_id
  const processExpand = rec.expand?.process_id
  const assignedExpand = rec.expand?.assigned_user_id

  const clientName = clientExpand?.nome || rec.contact_name || 'Contato'
  const clientPhone = clientExpand?.telefone || rec.phone_normalized || ''
  const responsible = assignedExpand?.name || 'Higor Utinoi'

  const uiStatus = STATUS_DB_TO_UI[rec.status] || 'NOVA'
  const uiPriority = PRIORITY_DB_TO_UI[rec.priority] || 'MEDIA'

  return {
    id: rec.id,
    participant: {
      id: clientExpand?.id,
      name: clientName,
      phone: clientPhone,
      isClient: !!rec.client_id,
      clientId: rec.client_id,
      clientCode: clientExpand?.client_code,
      cpf: clientExpand?.cpf,
    },
    participantName: clientName,
    participantPhone: clientPhone,
    clientId: rec.client_id,
    assignedTo: responsible,
    responsible,
    responsibleId: rec.assigned_user_id,
    linkedProcessNumber: processExpand?.numero_processo,
    linkedProcessId: rec.process_id,
    status: uiStatus,
    priority: uiPriority,
    unreadCount: rec.unread_count || 0,
    channel: rec.channel || 'WHATSAPP',
    isClientLead: rec.client_id ? 'CLIENTE' : 'LEAD',
    lastMessage: {
      content: rec.last_message_preview || 'Atendimento aberto',
      createdAt: rec.last_message_at || rec.created || new Date().toISOString(),
      type: 'TEXT',
      senderName: 'Sistema',
      direction: 'INCOMING',
    },
    createdAt: rec.created || new Date().toISOString(),
    updatedAt: rec.updated || rec.created || new Date().toISOString(),
    isMockDemo: false,
  }
}

export function mapRecordToConversationMessage(
  msg: NoxMessageRecord,
  fallbackSenderName = 'Operador NOX',
): ConversationMessage {
  const isInternal = msg.direction === 'INTERNAL_SYSTEM'

  let msgType: MessageContentType = 'TEXT'
  if (msg.type === 'AUDIO') msgType = 'AUDIO'
  else if (msg.type === 'DOCUMENT') msgType = 'DOCUMENT'
  else if (msg.type === 'IMAGE') msgType = 'IMAGE'
  else if (msg.type === 'SYSTEM') msgType = 'SYSTEM'

  const senderName = msg.expand?.sender_user_id?.name || msg.sender_type || fallbackSenderName

  return {
    id: msg.id,
    conversationId: msg.conversation_id,
    direction: msg.direction === 'INBOUND' ? 'INCOMING' : 'OUTGOING',
    type: msgType,
    content: msg.content_text || '',
    createdAt: msg.created || new Date().toISOString(),
    senderName,
    senderRole:
      msg.direction === 'INBOUND'
        ? 'CLIENTE'
        : msg.direction === 'INTERNAL_SYSTEM'
          ? 'SISTEMA'
          : 'OPERADOR',
    deliveryStatus: msg.status,
    isInternalNote: isInternal,
    isMockDemo: false,
  }
}

export function mapInternalNoteToConversationMessage(
  note: NoxInternalNoteRecord,
): ConversationMessage {
  const authorName = note.expand?.author_user_id?.name || 'Operador NOX'

  return {
    id: `note_${note.id}`,
    conversationId: note.conversation_id,
    direction: 'OUTGOING',
    type: 'INTERNAL_NOTE',
    content: note.content || '',
    createdAt: note.created || new Date().toISOString(),
    senderName: authorName,
    senderRole: 'OPERADOR',
    isInternalNote: true,
    mentions: note.mentions || [],
    isMockDemo: false,
  }
}
