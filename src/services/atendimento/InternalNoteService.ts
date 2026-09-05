/**
 * InternalNoteService — Gerenciamento exclusivo de notas internas em nox_internal_notes.
 *
 * SEPARAÇÃO ESTRUTURAL ESTATUTÁRIA:
 * - Notas internas nunca residem em nox_messages.
 * - Possuem regras próprias de autor, menções (@mentions) e arquivamento/soft-delete.
 * - Tipagem e coleções são estritamente isoladas.
 */

import pb from '@/lib/pocketbase/client'
import { NoxInternalNoteRecord } from '@/types/atendimento'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError } from '@/core/errors/AppErrors'
import { auditService } from '@/services/audit/AuditService'

export interface CreateInternalNoteInput {
  conversationId: string
  content: string
  mentions?: string[]
  authorUserId?: string
}

export class InternalNoteService {
  /**
   * Cria uma nova nota interna protegida em nox_internal_notes
   */
  public async createNote(
    input: CreateInternalNoteInput,
  ): Promise<ServiceResult<NoxInternalNoteRecord>> {
    try {
      if (!input.conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }

      const content = (input.content || '').trim()
      if (!content) {
        return failResult(new ValidationError('O conteúdo da nota interna não pode ser vazio.'))
      }

      const authorId = input.authorUserId || pb.authStore.model?.id
      if (!authorId) {
        return failResult(
          new ValidationError('Autor autenticado obrigatório para criar nota interna.'),
        )
      }

      const recordData = {
        conversation_id: input.conversationId,
        author_user_id: authorId,
        content,
        mentions: input.mentions || [],
        is_archived: false,
      }

      const created = await pb
        .collection('nox_internal_notes')
        .create<NoxInternalNoteRecord>(recordData, {
          expand: 'author_user_id',
        })

      // Auditoria
      try {
        await auditService.log(
          'INTERNAL_NOTE_CREATED',
          'atendimento',
          pb.authStore.model?.name || authorId,
          created.id,
          {
            conversationId: input.conversationId,
            mentionsCount: input.mentions?.length || 0,
            contentLength: content.length,
          },
        )
      } catch {
        // Ignora falha de log
      }

      return okResult(created)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Lista notas internas de uma conversa
   */
  public async listNotes(conversationId: string): Promise<ServiceResult<NoxInternalNoteRecord[]>> {
    try {
      if (!conversationId) {
        return failResult(new ValidationError('conversationId é obrigatório.'))
      }

      const records = await pb.collection('nox_internal_notes').getFullList<NoxInternalNoteRecord>({
        filter: `conversation_id="${conversationId}" && deleted_at=null`,
        sort: 'created',
        expand: 'author_user_id',
      })

      return okResult(records)
    } catch (err: any) {
      return failResult(err)
    }
  }

  /**
   * Soft-delete de nota interna
   */
  public async deleteNote(noteId: string): Promise<ServiceResult<boolean>> {
    try {
      await pb.collection('nox_internal_notes').update(noteId, {
        deleted_at: new Date().toISOString(),
      })
      return okResult(true)
    } catch (err: any) {
      return failResult(err)
    }
  }
}

export const internalNoteService = new InternalNoteService()
