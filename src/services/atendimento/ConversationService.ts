/**
 * ConversationService — Gerenciamento do ciclo de vida da conversa no NOX.
 *
 * Regras:
 * - Validação estrita de transição de status (isValidStatusTransition).
 * - Validação de prioridade (CRITICA, ALTA, MEDIA, BAIXA).
 * - client_id = null quando cliente não identificado; NUNCA cria cliente automaticamente.
 * - Normalização de telefone centralizada via normalizePhoneNumber.
 * - Registro em audit_logs com categoria 'atendimento'.
 */

import pb from '@/lib/pocketbase/client'
import {
  NoxConversationRecord,
  ConversationStatus,
  ConversationPriority,
  NoxConversationChannel,
} from '@/types/atendimento'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError } from '@/core/errors/AppErrors'
import { auditService } from '@/services/audit/AuditService'
import {
  STATUS_UI_TO_DB,
  STATUS_DB_TO_UI,
  PRIORITY_UI_TO_DB,
  PRIORITY_DB_TO_UI,
  isValidStatusTransition,
  isValidPriority,
} from '@/services/atendimento/statusTransitions'
import { normalizePhoneNumber } from '@/utils/phoneNormalization'

export interface CreateConversationInput {
  channel: NoxConversationChannel
  phoneRaw?: string
  contactName?: string
  clientId?: string
  processId?: string
  assignedUserId?: string
  status?: ConversationStatus
  priority?: ConversationPriority
  externalConversationId?: string
  initialMessagePreview?: string
}

export class ConversationService {
  /**
   * Cria nova conversa no PocketBase
   */
  public async createConversation(
    input: CreateConversationInput,
  ): Promise<ServiceResult<NoxConversationRecord>> {
    try {
      const normPhone = input.phoneRaw ? normalizePhoneNumber(input.phoneRaw) : null
      const phoneNormalized = normPhone?.isValid ? normPhone.e164 : input.phoneRaw || null

      const uiStatus: ConversationStatus = input.status || 'NOVA'
      const uiPriority: ConversationPriority = input.priority || 'MEDIA'

      const dbStatus = STATUS_UI_TO_DB[uiStatus] || 'NEW'
      const dbPriority = PRIORITY_UI_TO_DB[uiPriority] || 'MEDIUM'

      const recordData = {
        channel: input.channel,
        external_conversation_id: input.externalConversationId || null,
        phone_normalized: phoneNormalized,
        contact_name: input.contactName || null,
        client_id: input.clientId || null, // NUNCA cria cliente automático
        process_id: input.processId || null,
        assigned_user_id: input.assignedUserId || null,
        status: dbStatus,
        priority: dbPriority,
        last_message_at: new Date().toISOString(),
        last_message_preview: input.initialMessagePreview || 'Atendimento iniciado',
        unread_count: 0,
        is_archived: false,
      }

      const created = await pb
        .collection('nox_conversations')
        .create<NoxConversationRecord>(recordData, {
          expand: 'client_id,process_id,assigned_user_id',
        })

      try {
        await auditService.log(
          'CONVERSATION_CREATED',
          'atendimento',
          pb.authStore.model?.name || 'Operador NOX',
          created.id,
          {
            channel: input.channel,
            status: uiStatus,
            priority: uiPriority,
            hasClient: !!input.clientId,
            hasProcess: !!input.processId,
          },
        )
      } catch {
        // Falha no log de auditoria não quebra criação
      }

      return okResult(created)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Obtém conversa por ID com expands necessários
   */
  public async getById(id: string): Promise<ServiceResult<NoxConversationRecord>> {
    try {
      if (!id) return failResult(new ValidationError('ID do atendimento é obrigatório.'))
      const record = await pb.collection('nox_conversations').getOne<NoxConversationRecord>(id, {
        expand: 'client_id,process_id,assigned_user_id',
      })
      return okResult(record)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Atualiza status com validação estrita de transição
   */
  public async updateStatus(
    conversationId: string,
    newStatus: ConversationStatus,
    actor?: string,
  ): Promise<ServiceResult<NoxConversationRecord>> {
    try {
      const convRes = await this.getById(conversationId)
      if (!convRes.success || !convRes.data) {
        return failResult(new NotFoundError('Atendimento não encontrado.'))
      }

      const currentConv = convRes.data
      const currentUiStatus = STATUS_DB_TO_UI[currentConv.status] || 'NOVA'

      if (!isValidStatusTransition(currentUiStatus, newStatus)) {
        return failResult(
          new ValidationError(
            `Transição de estado inválida: de "${currentUiStatus}" para "${newStatus}".`,
          ),
        )
      }

      const targetDbStatus = STATUS_UI_TO_DB[newStatus]
      const updated = await pb.collection('nox_conversations').update<NoxConversationRecord>(
        conversationId,
        {
          status: targetDbStatus,
          is_archived: newStatus === 'ARQUIVADA',
        },
        { expand: 'client_id,process_id,assigned_user_id' },
      )

      try {
        await auditService.log(
          'CONVERSATION_STATUS_CHANGED',
          'atendimento',
          actor || pb.authStore.model?.name || 'Operador NOX',
          conversationId,
          {
            fromStatus: currentUiStatus,
            toStatus: newStatus,
          },
        )
      } catch {
        // Ignora falha de log
      }

      return okResult(updated)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Atualiza prioridade com validação
   */
  public async updatePriority(
    conversationId: string,
    newPriority: ConversationPriority,
    actor?: string,
  ): Promise<ServiceResult<NoxConversationRecord>> {
    try {
      if (!isValidPriority(newPriority)) {
        return failResult(new ValidationError(`Prioridade inválida: "${newPriority}".`))
      }

      const dbPriority = PRIORITY_UI_TO_DB[newPriority]
      const updated = await pb
        .collection('nox_conversations')
        .update<NoxConversationRecord>(
          conversationId,
          { priority: dbPriority },
          { expand: 'client_id,process_id,assigned_user_id' },
        )

      try {
        await auditService.log(
          'CONVERSATION_UPDATED',
          'atendimento',
          actor || pb.authStore.model?.name || 'Operador NOX',
          conversationId,
          { updatedField: 'priority', newPriority },
        )
      } catch {
        // Ignora falha de log
      }

      return okResult(updated)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Marca mensagens como lidas (zera unread_count no backend)
   */
  public async markAsRead(conversationId: string): Promise<ServiceResult<boolean>> {
    try {
      await pb.collection('nox_conversations').update(conversationId, {
        unread_count: 0,
      })
      return okResult(true)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Vincula um cliente da base NOX à conversa
   */
  public async linkClient(
    conversationId: string,
    clientId: string,
    actor?: string,
  ): Promise<ServiceResult<NoxConversationRecord>> {
    try {
      if (!clientId) {
        return failResult(new ValidationError('clientId é obrigatório.'))
      }

      const updated = await pb
        .collection('nox_conversations')
        .update<NoxConversationRecord>(
          conversationId,
          { client_id: clientId },
          { expand: 'client_id,process_id,assigned_user_id' },
        )

      try {
        await auditService.log(
          'CLIENT_LINKED',
          'atendimento',
          actor || pb.authStore.model?.name || 'Operador NOX',
          conversationId,
          { clientId },
        )
      } catch {
        // Ignora falha de log
      }

      return okResult(updated)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Vincula um processo monitorado à conversa
   */
  public async linkProcess(
    conversationId: string,
    processIdOrNumber: string,
    actor?: string,
  ): Promise<ServiceResult<NoxConversationRecord>> {
    try {
      if (!processIdOrNumber) {
        return failResult(new ValidationError('processId ou número do processo é obrigatório.'))
      }

      // Se for número de processo, busca o id correspondente em processos_monitorados
      let processRecordId = processIdOrNumber
      try {
        const found = await pb
          .collection('processos_monitorados')
          .getFirstListItem(`numero_processo="${processIdOrNumber}"`)
        if (found) {
          processRecordId = found.id
        }
      } catch {
        // Caso já seja um ID válido de registro
      }

      const updated = await pb
        .collection('nox_conversations')
        .update<NoxConversationRecord>(
          conversationId,
          { process_id: processRecordId },
          { expand: 'client_id,process_id,assigned_user_id' },
        )

      try {
        await auditService.log(
          'PROCESS_LINKED',
          'atendimento',
          actor || pb.authStore.model?.name || 'Operador NOX',
          conversationId,
          { processIdOrNumber, processRecordId },
        )
      } catch {
        // Ignora falha de log
      }

      return okResult(updated)
    } catch (err: any) {
      return failResult(err)
    }
  }
}

export const conversationService = new ConversationService()
