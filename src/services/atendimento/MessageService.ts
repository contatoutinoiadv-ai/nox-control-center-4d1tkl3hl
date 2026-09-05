/**
 * MessageService — Gerenciamento seguro de mensagens do NOX.
 *
 * REGRA CRÍTICA DE SEGURANÇA:
 * - InternalNote (nox_internal_notes) reside em coleção separada e tem tipagem estrita própria.
 * - MessageService NÃO envia notas internas externamente (sendExternal rejeita notas internas por design).
 * - Mensagens externas neste lote são suportadas com canais INBOUND / OUTBOUND sem envio real para o WhatsApp.
 * - Suporta verificação de duplicidade / idempotência via external_message_id.
 */

import pb from '@/lib/pocketbase/client'
import {
  NoxMessageRecord,
  NoxMessageDirection,
  NoxMessageType,
  NoxMessageStatus,
} from '@/types/atendimento'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError } from '@/core/errors/AppErrors'
import { auditService } from '@/services/audit/AuditService'

export interface CreateMessageInput {
  conversationId: string
  externalMessageId?: string
  direction: NoxMessageDirection
  type: NoxMessageType
  senderType?: string
  senderUserId?: string
  senderExternalId?: string
  contentText: string
  status?: NoxMessageStatus
  replyToMessageId?: string
  metadataJson?: any
}

export class MessageService {
  /**
   * Cria uma mensagem no PocketBase em nox_messages
   */
  public async createMessage(input: CreateMessageInput): Promise<ServiceResult<NoxMessageRecord>> {
    try {
      if (!input.conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }

      const content = (input.contentText || '').trim()
      if (!content && input.type === 'TEXT') {
        return failResult(new ValidationError('Mensagem de texto não pode ser vazia.'))
      }

      // Verificação de idempotência por external_message_id
      if (input.externalMessageId) {
        try {
          const existing = await pb
            .collection('nox_messages')
            .getFirstListItem<NoxMessageRecord>(`external_message_id="${input.externalMessageId}"`)
          if (existing) {
            // Retorna a mensagem existente de forma idempotente sem duplicar
            return okResult(existing)
          }
        } catch {
          // Não existe ainda, prossegue
        }
      }

      const recordData: Record<string, any> = {
        conversation_id: input.conversationId,
        external_message_id: input.externalMessageId || null,
        direction: input.direction,
        type: input.type,
        sender_type: input.senderType || (input.direction === 'OUTBOUND' ? 'OPERADOR' : 'CLIENTE'),
        sender_user_id:
          input.senderUserId ||
          (input.direction === 'OUTBOUND' ? pb.authStore.model?.id || null : null),
        sender_external_id: input.senderExternalId || null,
        content_text: content,
        status: input.status || (input.direction === 'OUTBOUND' ? 'SENT' : 'DELIVERED'),
        reply_to_message_id: input.replyToMessageId || null,
        sent_at: input.direction === 'OUTBOUND' ? new Date().toISOString() : null,
        delivered_at: input.direction === 'INBOUND' ? new Date().toISOString() : null,
        metadata_json: input.metadataJson || null,
      }

      const created = await pb.collection('nox_messages').create<NoxMessageRecord>(recordData, {
        expand: 'sender_user_id',
      })

      // Atualiza last_message_preview e last_message_at na conversa
      try {
        const preview = content.length > 80 ? `${content.substring(0, 80)}...` : content
        await pb.collection('nox_conversations').update(input.conversationId, {
          last_message_at: created.created || new Date().toISOString(),
          last_message_preview: preview,
        })
      } catch (err) {
        console.warn('[MessageService] Falha ao atualizar preview da conversa:', err)
      }

      // Auditoria com dados técnicos (sem vazar conteúdo completo sensível)
      try {
        await auditService.log(
          'MESSAGE_CREATED',
          'atendimento',
          input.senderUserId || pb.authStore.model?.name || 'Operador NOX',
          created.id,
          {
            conversationId: input.conversationId,
            direction: input.direction,
            type: input.type,
            length: content.length,
          },
        )
      } catch {
        // Falha de auditoria não aborta
      }

      return okResult(created)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Envio para canal externo (Placeholder seguro que rejeita notas internas)
   * REGRA OBRIGATÓRIA FASE 6:
   * 1. NUNCA envia mensagem real ao WhatsApp / Evolution API.
   * 2. REJEITA explicitamente qualquer objeto que contenha flag ou tipo de nota interna.
   */
  public async sendExternal(
    message: NoxMessageRecord | { isInternalNote?: boolean; type?: string; collection?: string },
    recipientPhone?: string,
  ): Promise<
    ServiceResult<{
      sent: boolean
      status: NoxMessageStatus
      reason?: string
      externalMessageId?: string | null
    }>
  > {
    // PROTEÇÃO CRÍTICA OBRIGATÓRIA MULTI-CAMADA:
    const unsafeMsg = message as any
    if (
      unsafeMsg.isInternalNote === true ||
      unsafeMsg.type === 'INTERNAL_NOTE' ||
      unsafeMsg.collection === 'nox_internal_notes' ||
      (unsafeMsg.metadata && unsafeMsg.metadata.isInternalNote === true)
    ) {
      return failResult(
        new ValidationError(
          'VIOLAÇÃO DE SEGURANÇA: Uma nota interna (nox_internal_notes) NUNCA pode ser enviada externamente.',
        ),
      )
    }

    // Importação dinâmica / singleton do Gateway NOX
    const { evolutionGateway } = await import('@/services/atendimento/EvolutionGateway')

    const cleanPhone = (recipientPhone || unsafeMsg.sender_external_id || '').replace(/\D/g, '')
    if (!cleanPhone) {
      return failResult(
        new ValidationError('Telefone de destino é obrigatório para envio externo via WhatsApp.'),
      )
    }

    const gatewayResult = await evolutionGateway.sendTextMessage({
      messageId: (message as NoxMessageRecord).id,
      recipientPhone: cleanPhone,
      text: (message as NoxMessageRecord).content_text || '',
      conversationId: (message as NoxMessageRecord).conversation_id,
    })

    if (!gatewayResult.success) {
      // Mensagem permanece com status FAILED
      if ((message as NoxMessageRecord).id) {
        await this.updateStatus((message as NoxMessageRecord).id, 'FAILED')
      }
      return failResult(
        new ValidationError(
          gatewayResult.error || 'Mensagem não enviada. Verifique conexão da instância WhatsApp.',
        ),
      )
    }

    return okResult({
      sent: true,
      status: 'SENT',
      externalMessageId: gatewayResult.externalMessageId,
    })
  }

  /**
   * Lista mensagens de uma conversa com ordenação cronológica e paginação
   */
  public async listMessages(
    conversationId: string,
    page = 1,
    perPage = 50,
  ): Promise<ServiceResult<{ items: NoxMessageRecord[]; totalItems: number }>> {
    try {
      if (!conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }

      const res = await pb.collection('nox_messages').getList<NoxMessageRecord>(page, perPage, {
        filter: `conversation_id="${conversationId}"`,
        sort: 'created',
        expand: 'sender_user_id',
      })

      return okResult({
        items: res.items,
        totalItems: res.totalItems,
      })
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Atualiza status de entrega de uma mensagem
   */
  public async updateStatus(
    messageId: string,
    status: NoxMessageStatus,
  ): Promise<ServiceResult<NoxMessageRecord>> {
    try {
      const data: Record<string, any> = { status }
      const now = new Date().toISOString()
      if (status === 'DELIVERED') data.delivered_at = now
      if (status === 'READ') data.read_at = now
      if (status === 'FAILED') data.failed_at = now

      const updated = await pb.collection('nox_messages').update<NoxMessageRecord>(messageId, data)
      return okResult(updated)
    } catch (err: any) {
      return failResult(err)
    }
  }
}

export const messageService = new MessageService()
