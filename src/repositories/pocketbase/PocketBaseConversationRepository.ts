/**
 * PocketBaseConversationRepository — Implementação real do contrato IConversationRepository.
 *
 * Utiliza as coleções reais criadas na migration 0020:
 * - nox_conversations
 * - nox_messages
 * - nox_internal_notes
 * - nox_assignments
 * - nox_ai_analysis
 *
 * Mantém integridade referencial com clients, processos_monitorados e users.
 * Proteção total contra quebras de UI: implementa o mesmo contrato IConversationRepository.
 */

import { IConversationRepository } from '@/repositories/contracts/IConversationRepository'
import {
  ConversationSummary,
  ConversationMessage,
  ConversationFilterParams,
  ConversationFilterResult,
  SendMessagePayload,
  ConversationStatus,
  ConversationPriority,
  NoxConversationRecord,
  NoxMessageRecord,
} from '@/types/atendimento'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { NotFoundError, ValidationError } from '@/core/errors/AppErrors'
import pb from '@/lib/pocketbase/client'
import { conversationService } from '@/services/atendimento/ConversationService'
import { messageService } from '@/services/atendimento/MessageService'
import { internalNoteService } from '@/services/atendimento/InternalNoteService'
import { assignmentService } from '@/services/atendimento/AssignmentService'
import { STATUS_UI_TO_DB, PRIORITY_UI_TO_DB } from '@/services/atendimento/statusTransitions'
import {
  mapRecordToConversationSummary,
  mapRecordToConversationMessage,
  mapInternalNoteToConversationMessage,
} from '@/repositories/mappersAtendimento'

export class PocketBaseConversationRepository implements IConversationRepository {
  private listeners: Array<(event: { type: string; payload: unknown }) => void> = []

  public subscribe(callback: (event: { type: string; payload: unknown }) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback)
    }
  }

  private notify(type: string, payload: unknown) {
    this.listeners.forEach((cb) => {
      try {
        cb({ type, payload })
      } catch (err) {
        console.warn('[PocketBaseConversationRepository] Erro ao notificar listener:', err)
      }
    })
  }

  public async listConversations(
    params: ConversationFilterParams,
  ): Promise<ServiceResult<ConversationFilterResult>> {
    try {
      const page = params.page || 1
      const perPage = params.perPage || 100

      const filters: string[] = []

      // Filtro rápido
      switch (params.filter) {
        case 'NAO_LIDAS':
          filters.push('unread_count > 0')
          break
        case 'URGENTES':
          filters.push('(priority="CRITICAL" || priority="HIGH")')
          break
        case 'MINHAS':
          if (params.assignedTo) {
            filters.push(`assigned_user_id="${params.assignedTo}"`)
          } else if (pb.authStore.model?.id) {
            filters.push(`assigned_user_id="${pb.authStore.model.id}"`)
          }
          break
        case 'AGUARDANDO_CLIENTE':
          filters.push('status="WAITING_CLIENT"')
          break
        case 'AGUARDANDO_ESCRITORIO':
          filters.push('status="WAITING_OFFICE"')
          break
        case 'CONCLUIDAS':
          filters.push('(status="COMPLETED" || status="ARCHIVED")')
          break
        case 'TODAS':
        default:
          filters.push('status != "ARCHIVED"')
          break
      }

      // Filtro específico de status
      if (params.status) {
        const dbSt = STATUS_UI_TO_DB[params.status]
        if (dbSt) filters.push(`status="${dbSt}"`)
      }

      // Filtro específico de prioridade
      if (params.priority) {
        const dbPr = PRIORITY_UI_TO_DB[params.priority]
        if (dbPr) filters.push(`priority="${dbPr}"`)
      }

      // Busca textual
      if (params.searchQuery && params.searchQuery.trim()) {
        const q = params.searchQuery.trim()
        filters.push(
          `(contact_name ~ "${q}" || phone_normalized ~ "${q}" || external_conversation_id ~ "${q}")`,
        )
      }

      const filterClause = filters.join(' && ')

      const res = await pb
        .collection('nox_conversations')
        .getList<NoxConversationRecord>(page, perPage, {
          filter: filterClause || undefined,
          sort: '-last_message_at,-updated',
          expand: 'client_id,process_id,assigned_user_id',
        })

      const items: ConversationSummary[] = res.items.map(mapRecordToConversationSummary)

      // Totais para métricas de topo
      let unreadTotal = 0
      let urgentTotal = 0
      for (const item of items) {
        if (item.unreadCount > 0) unreadTotal++
        if (item.priority === 'CRITICA' || item.priority === 'ALTA') urgentTotal++
      }

      return okResult({
        items,
        totalItems: res.totalItems,
        unreadTotal,
        urgentTotal,
      })
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async getConversationById(id: string): Promise<ServiceResult<ConversationSummary>> {
    try {
      const res = await conversationService.getById(id)
      if (!res.success || !res.data) {
        return failResult(new NotFoundError(`Atendimento com id "${id}" não encontrado.`))
      }
      return okResult(mapRecordToConversationSummary(res.data))
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async getMessages(conversationId: string): Promise<ServiceResult<ConversationMessage[]>> {
    try {
      // 1. Mensagens reais
      const msgRes = await messageService.listMessages(conversationId, 1, 100)
      const msgs = (msgRes.data?.items || []).map((m) =>
        mapRecordToConversationMessage(m, 'Operador NOX'),
      )

      // 2. Notas internas (isoladas em nox_internal_notes)
      const notesRes = await internalNoteService.listNotes(conversationId)
      const notes = (notesRes.data || []).map(mapInternalNoteToConversationMessage)

      // Consolidação cronológica
      const combined = [...msgs, ...notes]
      combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      return okResult(combined)
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async sendMessage(
    payload: SendMessagePayload,
    currentActor: string,
  ): Promise<ServiceResult<ConversationMessage>> {
    try {
      if (payload.type === 'INTERNAL_NOTE') {
        // Grava EXCLUSIVAMENTE em nox_internal_notes
        const noteRes = await internalNoteService.createNote({
          conversationId: payload.conversationId,
          content: payload.content,
          mentions: payload.mentions,
        })
        if (!noteRes.success || !noteRes.data) {
          return failResult(noteRes.error || new ValidationError('Falha ao salvar nota interna.'))
        }

        const mapped = mapInternalNoteToConversationMessage(noteRes.data)
        this.notify('message:created', mapped)
        return okResult(mapped)
      }

      // Mensagem regular em nox_messages (OUTBOUND)
      const msgRes = await messageService.createMessage({
        conversationId: payload.conversationId,
        direction: 'OUTBOUND',
        type: payload.attachment ? 'DOCUMENT' : 'TEXT',
        contentText: payload.content,
        senderType: 'OPERADOR',
      })

      if (!msgRes.success || !msgRes.data) {
        return failResult(msgRes.error || new ValidationError('Falha ao enviar mensagem.'))
      }

      const mapped = mapRecordToConversationMessage(msgRes.data, currentActor)
      this.notify('message:created', mapped)

      // Atualiza a conversa
      const updatedConv = await this.getConversationById(payload.conversationId)
      if (updatedConv.success && updatedConv.data) {
        this.notify('conversation:updated', updatedConv.data)
      }

      return okResult(mapped)
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async updateStatus(
    conversationId: string,
    status: ConversationStatus,
    actor: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    try {
      const res = await conversationService.updateStatus(conversationId, status, actor)
      if (!res.success || !res.data) {
        return failResult(res.error || new ValidationError('Falha ao atualizar status.'))
      }
      const summary = mapRecordToConversationSummary(res.data)
      this.notify('conversation:updated', summary)
      return okResult(summary)
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async updatePriority(
    conversationId: string,
    priority: ConversationPriority,
    actor: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    try {
      const res = await conversationService.updatePriority(conversationId, priority, actor)
      if (!res.success || !res.data) {
        return failResult(res.error || new ValidationError('Falha ao atualizar prioridade.'))
      }
      const summary = mapRecordToConversationSummary(res.data)
      this.notify('conversation:updated', summary)
      return okResult(summary)
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async markAsRead(conversationId: string): Promise<ServiceResult<boolean>> {
    return conversationService.markAsRead(conversationId)
  }

  public async linkProcess(
    conversationId: string,
    processNumber: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    try {
      const res = await conversationService.linkProcess(conversationId, processNumber)
      if (!res.success || !res.data) {
        return failResult(res.error || new ValidationError('Falha ao vincular processo.'))
      }
      const summary = mapRecordToConversationSummary(res.data)
      this.notify('conversation:updated', summary)
      return okResult(summary)
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async linkClient(
    conversationId: string,
    clientId: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    try {
      const res = await conversationService.linkClient(conversationId, clientId)
      if (!res.success || !res.data) {
        return failResult(res.error || new ValidationError('Falha ao vincular cliente.'))
      }
      const summary = mapRecordToConversationSummary(res.data)
      this.notify('conversation:updated', summary)
      return okResult(summary)
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async assignResponsible(
    conversationId: string,
    responsibleNameOrId: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    try {
      // Tenta achar usuário por ID ou por nome
      let targetUserId = responsibleNameOrId
      try {
        const found = await pb
          .collection('users')
          .getFirstListItem(`name ~ "${responsibleNameOrId}" || id="${responsibleNameOrId}"`)
        if (found) {
          targetUserId = found.id
        }
      } catch {
        // Se não encontrar, usa o auth atual ou o ID fornecido
        targetUserId = pb.authStore.model?.id || responsibleNameOrId
      }

      const res = await assignmentService.transferConversation({
        conversationId,
        newAssignedUserId: targetUserId,
      })

      if (!res.success) {
        return failResult(res.error || new ValidationError('Falha ao transferir conversa.'))
      }

      return this.getConversationById(conversationId)
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async assignConversation(
    conversationId: string,
    responsibleName: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    return this.assignResponsible(conversationId, responsibleName)
  }
}

export const pocketBaseConversationRepository = new PocketBaseConversationRepository()
