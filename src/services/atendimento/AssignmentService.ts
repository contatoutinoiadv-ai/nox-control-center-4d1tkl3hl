/**
 * AssignmentService — Gerenciamento e histórico de custódia/atribuição de conversas no NOX.
 *
 * Registra formalmente a custódia em nox_assignments, atualiza assigned_user_id
 * em nox_conversations e gera registro em audit_logs.
 */

import pb from '@/lib/pocketbase/client'
import { NoxAssignmentRecord } from '@/types/atendimento'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError } from '@/core/errors/AppErrors'
import { auditService } from '@/services/audit/AuditService'

export interface AssignConversationInput {
  conversationId: string
  newAssignedUserId: string
  assignedByUserId?: string
  reason?: string
}

export class AssignmentService {
  /**
   * Transfere a conversa para um novo operador, registrando o histórico de custódia
   */
  public async transferConversation(
    input: AssignConversationInput,
  ): Promise<ServiceResult<NoxAssignmentRecord>> {
    try {
      if (!input.conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }
      if (!input.newAssignedUserId) {
        return failResult(new ValidationError('newAssignedUserId é obrigatório.'))
      }

      const assignedBy = input.assignedByUserId || pb.authStore.model?.id || null
      const now = new Date().toISOString()

      // 1. Finaliza a última atribuição em aberto se houver
      try {
        const activeAssignments = await pb
          .collection('nox_assignments')
          .getList<NoxAssignmentRecord>(1, 1, {
            filter: `conversation_id="${input.conversationId}" && ended_at=null`,
            sort: '-created',
          })
        if (activeAssignments.items.length > 0) {
          await pb.collection('nox_assignments').update(activeAssignments.items[0].id, {
            ended_at: now,
          })
        }
      } catch {
        // Sem histórico anterior não é erro
      }

      // 2. Cria o novo registro em nox_assignments
      const newAssignment = await pb.collection('nox_assignments').create<NoxAssignmentRecord>(
        {
          conversation_id: input.conversationId,
          assigned_to_user_id: input.newAssignedUserId,
          assigned_by_user_id: assignedBy,
          reason: input.reason || 'Transferência operacional de atendimento',
          assigned_at: now,
        },
        {
          expand: 'assigned_to_user_id,assigned_by_user_id',
        },
      )

      // 3. Atualiza assigned_user_id na conversa
      await pb.collection('nox_conversations').update(input.conversationId, {
        assigned_user_id: input.newAssignedUserId,
      })

      // 4. Auditoria estruturada
      try {
        await auditService.log(
          'CONVERSATION_ASSIGNED',
          'atendimento',
          pb.authStore.model?.name || assignedBy || 'Operador NOX',
          input.conversationId,
          {
            newAssignedUserId: input.newAssignedUserId,
            assignedByUserId: assignedBy,
            reason: input.reason || null,
          },
        )
      } catch {
        // Ignora falha de log
      }

      return okResult(newAssignment)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Lista o histórico de atribuições de uma conversa
   */
  public async getAssignmentHistory(
    conversationId: string,
  ): Promise<ServiceResult<NoxAssignmentRecord[]>> {
    try {
      if (!conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }

      const list = await pb.collection('nox_assignments').getFullList<NoxAssignmentRecord>({
        filter: `conversation_id="${conversationId}"`,
        sort: '-created',
        expand: 'assigned_to_user_id,assigned_by_user_id',
      })

      return okResult(list)
    } catch (err: any) {
      return failResult(err)
    }
  }
}

export const assignmentService = new AssignmentService()
