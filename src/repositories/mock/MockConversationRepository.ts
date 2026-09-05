/**
 * MOCK CONVERSATION REPOSITORY
 *
 * Implementação do contrato IConversationRepository para a Fase 5 Lote 1.
 * Isola completamente os dados fictícios e simula o comportamento
 * do PocketBase / WhatsApp de forma segura e determinística.
 *
 * NENHUM envio real de mensagens.
 * Todo conteúdo externo é tratado como texto puro.
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
} from '@/types/atendimento'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { NotFoundError, ValidationError } from '@/core/errors/AppErrors'
import { FIXTURE_CONVERSATIONS, FIXTURE_MESSAGES } from '@/dev/fixtures/atendimentoFixtures'

export class MockConversationRepository implements IConversationRepository {
  private conversations: ConversationSummary[] = []
  private messages: Record<string, ConversationMessage[]> = {}
  private listeners: Array<(event: { type: string; payload: unknown }) => void> = []

  constructor() {
    this.resetToFixtures()
  }

  public resetToFixtures() {
    // Clona profundamente as fixtures para garantir que testes e alterações fiquem isolados
    this.conversations = JSON.parse(JSON.stringify(FIXTURE_CONVERSATIONS))
    this.messages = JSON.parse(JSON.stringify(FIXTURE_MESSAGES))
  }

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
        console.warn('[MockConversationRepository] Erro ao notificar listener:', err)
      }
    })
  }

  public async listConversations(
    params: ConversationFilterParams,
  ): Promise<ServiceResult<ConversationFilterResult>> {
    try {
      let filtered = [...this.conversations]

      // Filtros rápidos principais
      switch (params.filter) {
        case 'NAO_LIDAS':
          filtered = filtered.filter((c) => c.unreadCount > 0)
          break
        case 'URGENTES':
          filtered = filtered.filter((c) => c.priority === 'CRITICA' || c.priority === 'ALTA')
          break
        case 'MINHAS':
          if (params.assignedTo) {
            filtered = filtered.filter(
              (c) =>
                c.responsible.toLowerCase() === params.assignedTo?.toLowerCase() ||
                c.responsibleId === params.assignedTo,
            )
          } else {
            // Default: Higor Utinoi
            filtered = filtered.filter((c) => c.responsible.toLowerCase().includes('higor'))
          }
          break
        case 'AGUARDANDO_CLIENTE':
          filtered = filtered.filter((c) => c.status === 'AGUARDANDO_CLIENTE')
          break
        case 'AGUARDANDO_ESCRITORIO':
          filtered = filtered.filter((c) => c.status === 'AGUARDANDO_ESCRITORIO')
          break
        case 'CONCLUIDAS':
          filtered = filtered.filter((c) => c.status === 'CONCLUIDA' || c.status === 'ARQUIVADA')
          break
        case 'TODAS':
        default:
          // Se não estiver no filtro concluídas, por padrão esconde arquivadas
          filtered = filtered.filter((c) => c.status !== 'ARQUIVADA')
          break
      }

      // Filtro de busca textual (Nome, Telefone, Processo vinculado, Código cliente)
      if (params.searchQuery && params.searchQuery.trim()) {
        const query = params.searchQuery.trim().toLowerCase()
        filtered = filtered.filter((c) => {
          const matchName = c.participant.name.toLowerCase().includes(query)
          const matchPhone = c.participant.phone.toLowerCase().includes(query)
          const matchCpf = c.participant.cpf?.toLowerCase().includes(query) || false
          const matchClientCode = c.participant.clientCode?.toLowerCase().includes(query) || false
          const matchProcess = c.linkedProcessNumber?.toLowerCase().includes(query) || false
          return matchName || matchPhone || matchCpf || matchClientCode || matchProcess
        })
      }

      // Filtro específico por status
      if (params.status) {
        filtered = filtered.filter((c) => c.status === params.status)
      }

      // Filtro específico por prioridade
      if (params.priority) {
        filtered = filtered.filter((c) => c.priority === params.priority)
      }

      // Ordenação: mais recente primeiro
      filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

      const unreadTotal = this.conversations.reduce(
        (acc, c) => acc + (c.unreadCount > 0 ? 1 : 0),
        0,
      )
      const urgentTotal = this.conversations.filter(
        (c) => c.priority === 'CRITICA' || c.priority === 'ALTA',
      ).length

      return okResult({
        items: filtered,
        totalItems: filtered.length,
        unreadTotal,
        urgentTotal,
      })
    } catch (err: any) {
      return failResult(err)
    }
  }

  public async getConversationById(id: string): Promise<ServiceResult<ConversationSummary>> {
    const conv = this.conversations.find((c) => c.id === id)
    if (!conv) {
      return failResult(new NotFoundError(`Atendimento com identificador "${id}" não encontrado.`))
    }
    return okResult(conv)
  }

  public async getMessages(conversationId: string): Promise<ServiceResult<ConversationMessage[]>> {
    const msgs = this.messages[conversationId] || []
    return okResult([...msgs])
  }

  public async sendMessage(
    payload: SendMessagePayload,
    currentActor: string,
  ): Promise<ServiceResult<ConversationMessage>> {
    const conv = this.conversations.find((c) => c.id === payload.conversationId)
    if (!conv) {
      return failResult(new NotFoundError(`Atendimento ${payload.conversationId} não encontrado.`))
    }

    const cleanContent = (payload.content || '').trim()
    if (!cleanContent && !payload.attachment) {
      return failResult(new ValidationError('O conteúdo da mensagem ou anexo não pode ser vazio.'))
    }

    const isInternal = payload.type === 'INTERNAL_NOTE'

    const newMessage: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId: payload.conversationId,
      direction: 'OUTGOING',
      type: isInternal ? 'INTERNAL_NOTE' : payload.attachment ? 'DOCUMENT' : 'TEXT',
      content: cleanContent,
      createdAt: new Date().toISOString(),
      senderName: currentActor || 'Operador NOX',
      senderRole: isInternal ? 'OPERADOR' : 'ADVOGADO',
      deliveryStatus: isInternal ? undefined : 'SENT',
      isInternalNote: isInternal,
      mentions: payload.mentions,
      attachment: payload.attachment,
      isMockDemo: true,
    }

    if (!this.messages[payload.conversationId]) {
      this.messages[payload.conversationId] = []
    }
    this.messages[payload.conversationId].push(newMessage)

    // Atualiza a conversa resumo
    conv.updatedAt = newMessage.createdAt
    if (!isInternal) {
      conv.lastMessage = {
        content: cleanContent || payload.attachment?.fileName || 'Anexo',
        createdAt: newMessage.createdAt,
        type: newMessage.type,
        senderName: newMessage.senderName,
        direction: 'OUTGOING',
      }
      // Se era aguardando escritório, passa para aguardando cliente
      if (conv.status === 'AGUARDANDO_ESCRITORIO') {
        conv.status = 'AGUARDANDO_CLIENTE'
      }
    }

    this.notify('message:created', newMessage)
    this.notify('conversation:updated', conv)

    return okResult(newMessage)
  }

  public async updateStatus(
    conversationId: string,
    status: ConversationStatus,
    _actor: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    const conv = this.conversations.find((c) => c.id === conversationId)
    if (!conv) {
      return failResult(new NotFoundError('Atendimento não encontrado.'))
    }

    conv.status = status
    conv.updatedAt = new Date().toISOString()
    this.notify('conversation:updated', conv)
    return okResult(conv)
  }

  public async updatePriority(
    conversationId: string,
    priority: ConversationPriority,
    _actor: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    const conv = this.conversations.find((c) => c.id === conversationId)
    if (!conv) {
      return failResult(new NotFoundError('Atendimento não encontrado.'))
    }

    conv.priority = priority
    conv.updatedAt = new Date().toISOString()
    this.notify('conversation:updated', conv)
    return okResult(conv)
  }

  public async markAsRead(conversationId: string): Promise<ServiceResult<boolean>> {
    const conv = this.conversations.find((c) => c.id === conversationId)
    if (!conv) {
      return failResult(new NotFoundError('Atendimento não encontrado.'))
    }
    conv.unreadCount = 0
    this.notify('conversation:updated', conv)
    return okResult(true)
  }

  public async linkProcess(
    conversationId: string,
    processNumber: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    const conv = this.conversations.find((c) => c.id === conversationId)
    if (!conv) {
      return failResult(new NotFoundError('Atendimento não encontrado.'))
    }

    conv.linkedProcessNumber = processNumber.trim()
    conv.updatedAt = new Date().toISOString()
    this.notify('conversation:updated', conv)
    return okResult(conv)
  }

  public async linkClient(
    conversationId: string,
    clientId: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    const conv = this.conversations.find((c) => c.id === conversationId)
    if (!conv) {
      return failResult(new NotFoundError('Atendimento não encontrado.'))
    }

    conv.participant.isClient = true
    conv.participant.clientId = clientId
    conv.clientId = clientId
    conv.isClientLead = 'CLIENTE'
    conv.updatedAt = new Date().toISOString()
    this.notify('conversation:updated', conv)
    return okResult(conv)
  }

  public async assignResponsible(
    conversationId: string,
    responsibleName: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    const conv = this.conversations.find((c) => c.id === conversationId)
    if (!conv) {
      return failResult(new NotFoundError('Atendimento não encontrado.'))
    }

    conv.responsible = responsibleName.trim()
    conv.assignedTo = responsibleName.trim()
    conv.updatedAt = new Date().toISOString()
    this.notify('conversation:updated', conv)
    return okResult(conv)
  }

  public async assignConversation(
    conversationId: string,
    responsibleName: string,
  ): Promise<ServiceResult<ConversationSummary>> {
    return this.assignResponsible(conversationId, responsibleName)
  }
}

// Instância singleton padrão para o módulo de atendimento
export const mockConversationRepository = new MockConversationRepository()
