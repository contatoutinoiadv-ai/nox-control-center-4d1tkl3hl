/**
 * ConversationContextService — Consolidação de histórico e contexto completo de uma conversa.
 *
 * DECISÃO ARQUITETURAL:
 * Consolida em QUERY multi-entidade sob demanda com joins/expands, sem materializar tabela redundante.
 * Reúne:
 * - Conversa e dados do cliente e processo vinculados
 * - Mensagens cronológicas (nox_messages)
 * - Notas internas (nox_internal_notes)
 * - Histórico de atribuições (nox_assignments)
 * - Análises e triagens de IA (nox_ai_analysis)
 * - Tarefas criadas (sentinela_tasks com comunicação/processo/cliente associado)
 * - Compromissos agendados (sentinela_agenda associados)
 */

import pb from '@/lib/pocketbase/client'
import {
  NoxConversationRecord,
  NoxMessageRecord,
  NoxInternalNoteRecord,
  NoxAssignmentRecord,
  NoxAiAnalysisRecord,
} from '@/types/atendimento'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError } from '@/core/errors/AppErrors'

export interface ConsolidatedTimelineEvent {
  id: string
  timestamp: string
  type:
    | 'MESSAGE_INBOUND'
    | 'MESSAGE_OUTBOUND'
    | 'INTERNAL_NOTE'
    | 'ASSIGNMENT'
    | 'AI_ANALYSIS'
    | 'TASK'
    | 'APPOINTMENT'
    | 'STATUS_CHANGE'
  actor: string
  title: string
  description?: string
  raw?: any
}

export interface ConversationFullContext {
  conversation: NoxConversationRecord
  messages: NoxMessageRecord[]
  internalNotes: NoxInternalNoteRecord[]
  assignments: NoxAssignmentRecord[]
  aiAnalyses: NoxAiAnalysisRecord[]
  timeline: ConsolidatedTimelineEvent[]
}

export class ConversationContextService {
  /**
   * Carrega o contexto completo consolidado de uma conversa
   */
  public async getFullContext(
    conversationId: string,
  ): Promise<ServiceResult<ConversationFullContext>> {
    try {
      if (!conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }

      // 1. Carrega conversa com expansões
      const conv = await pb
        .collection('nox_conversations')
        .getOne<NoxConversationRecord>(conversationId, {
          expand: 'client_id,process_id,assigned_user_id',
        })

      // 2. Carrega mensagens em ordem cronológica
      const messagesRes = await pb.collection('nox_messages').getList<NoxMessageRecord>(1, 100, {
        filter: `conversation_id="${conversationId}"`,
        sort: 'created',
        expand: 'sender_user_id',
      })

      // 3. Carrega notas internas
      const notesRes = await pb
        .collection('nox_internal_notes')
        .getFullList<NoxInternalNoteRecord>({
          filter: `conversation_id="${conversationId}" && deleted_at=null`,
          sort: 'created',
          expand: 'author_user_id',
        })

      // 4. Carrega histórico de atribuições
      const assignRes = await pb.collection('nox_assignments').getFullList<NoxAssignmentRecord>({
        filter: `conversation_id="${conversationId}"`,
        sort: '-created',
        expand: 'assigned_to_user_id,assigned_by_user_id',
      })

      // 5. Carrega análises de IA
      const aiRes = await pb.collection('nox_ai_analysis').getFullList<NoxAiAnalysisRecord>({
        filter: `conversation_id="${conversationId}"`,
        sort: '-created',
        expand: 'reviewed_by',
      })

      // Consolida timeline cronológica unificada
      const timeline: ConsolidatedTimelineEvent[] = []

      // Mensagens
      for (const m of messagesRes.items) {
        timeline.push({
          id: `msg-${m.id}`,
          timestamp: m.created || new Date().toISOString(),
          type: m.direction === 'INBOUND' ? 'MESSAGE_INBOUND' : 'MESSAGE_OUTBOUND',
          actor:
            m.expand?.sender_user_id?.name ||
            (m.direction === 'INBOUND' ? conv.contact_name || 'Cliente' : 'Operador NOX'),
          title: m.direction === 'INBOUND' ? 'Mensagem recebida' : 'Mensagem enviada',
          description: m.content_text,
          raw: m,
        })
      }

      // Notas internas
      for (const n of notesRes) {
        timeline.push({
          id: `note-${n.id}`,
          timestamp: n.created || new Date().toISOString(),
          type: 'INTERNAL_NOTE',
          actor: n.expand?.author_user_id?.name || 'Operador',
          title: 'Nota interna confidencial',
          description: n.content,
          raw: n,
        })
      }

      // Atribuições
      for (const a of assignRes) {
        const toName = a.expand?.assigned_to_user_id?.name || 'Operador'
        const byName = a.expand?.assigned_by_user_id?.name || 'Sistema'
        timeline.push({
          id: `assign-${a.id}`,
          timestamp: a.assigned_at || a.created || new Date().toISOString(),
          type: 'ASSIGNMENT',
          actor: byName,
          title: `Atendimento atribuído para ${toName}`,
          description: a.reason,
          raw: a,
        })
      }

      // Análises de IA
      for (const ai of aiRes) {
        timeline.push({
          id: `ai-${ai.id}`,
          timestamp: ai.created || new Date().toISOString(),
          type: 'AI_ANALYSIS',
          actor: ai.provider || 'NOX AI',
          title: `Análise IA: ${ai.analysis_type} (${ai.review_status})`,
          description: ai.result_json?.summary || ai.result_json?.intent,
          raw: ai,
        })
      }

      // Ordena timeline cronologicamente decrescente (mais recente no topo)
      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      return okResult({
        conversation: conv,
        messages: messagesRes.items,
        internalNotes: notesRes,
        assignments: assignRes,
        aiAnalyses: aiRes,
        timeline,
      })
    } catch (err: any) {
      return failResult(err)
    }
  }
}

export const conversationContextService = new ConversationContextService()
