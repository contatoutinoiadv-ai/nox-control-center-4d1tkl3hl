/**
 * AIAnalysisService — Registro e revisão humana de análises de IA no NOX.
 *
 * REGRA ABSOLUTA:
 * - A IA NÃO É VERDADE CANÔNICA. Análises são sugestões (review_status = PENDING/APPROVED/REJECTED).
 * - NUNCA sobrescreve dados canônicos de cliente/processo automaticamente.
 * - Registra em nox_ai_analysis e audita.
 */

import pb from '@/lib/pocketbase/client'
import { NoxAiAnalysisRecord, NoxAiAnalysisType, NoxAiReviewStatus } from '@/types/atendimento'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError } from '@/core/errors/AppErrors'
import { auditService } from '@/services/audit/AuditService'

export interface CreateAiAnalysisInput {
  conversationId: string
  messageId?: string
  analysisType: NoxAiAnalysisType
  provider?: string
  model?: string
  resultJson: any
  confidence?: number
  reviewStatus?: NoxAiReviewStatus
}

export class AIAnalysisService {
  /**
   * Registra uma nova análise ou sugestão de IA no PocketBase
   */
  public async createAnalysis(
    input: CreateAiAnalysisInput,
  ): Promise<ServiceResult<NoxAiAnalysisRecord>> {
    try {
      if (!input.conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }
      if (!input.resultJson) {
        return failResult(new ValidationError('resultJson da análise de IA é obrigatório.'))
      }

      const recordData = {
        conversation_id: input.conversationId,
        message_id: input.messageId || null,
        analysis_type: input.analysisType,
        provider: input.provider || 'NOX_AI_ORACULO',
        model: input.model || 'oraculo-triage-v1',
        result_json: input.resultJson,
        confidence: typeof input.confidence === 'number' ? input.confidence : 0.85,
        review_status: input.reviewStatus || 'PENDING',
        reviewed_by: null,
      }

      const created = await pb.collection('nox_ai_analysis').create<NoxAiAnalysisRecord>(recordData)

      try {
        await auditService.log('AI_ANALYSIS_CREATED', 'atendimento', 'NOX AI Service', created.id, {
          conversationId: input.conversationId,
          analysisType: input.analysisType,
          reviewStatus: created.review_status,
        })
      } catch {
        // Ignora falha de log
      }

      return okResult(created)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Revisão humana de uma sugestão de IA (Aprovar, Rejeitar, Editar)
   */
  public async reviewAnalysis(
    analysisId: string,
    status: NoxAiReviewStatus,
    reviewerUserId?: string,
  ): Promise<ServiceResult<NoxAiAnalysisRecord>> {
    try {
      const reviewer = reviewerUserId || pb.authStore.model?.id || null
      const updated = await pb
        .collection('nox_ai_analysis')
        .update<NoxAiAnalysisRecord>(analysisId, {
          review_status: status,
          reviewed_by: reviewer,
        })

      return okResult(updated)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Lista análises de uma conversa
   */
  public async listAnalyses(conversationId: string): Promise<ServiceResult<NoxAiAnalysisRecord[]>> {
    try {
      if (!conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }

      const list = await pb.collection('nox_ai_analysis').getFullList<NoxAiAnalysisRecord>({
        filter: `conversation_id="${conversationId}"`,
        sort: '-created',
        expand: 'reviewed_by',
      })

      return okResult(list)
    } catch (err: any) {
      return failResult(err)
    }
  }
}

export const aiAnalysisService = new AIAnalysisService()
