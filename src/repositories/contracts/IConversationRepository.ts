import {
  ConversationSummary,
  ConversationMessage,
  ConversationFilterParams,
  ConversationFilterResult,
  SendMessagePayload,
  ConversationStatus,
  ConversationPriority,
} from '@/types/atendimento'
import { ServiceResult } from '@/core/results/ServiceResult'

export interface IConversationRepository {
  /**
   * Lista conversas conforme filtros, busca e paginação
   */
  listConversations(
    params: ConversationFilterParams,
  ): Promise<ServiceResult<ConversationFilterResult>>

  /**
   * Obtém os detalhes de uma conversa por ID
   */
  getConversationById(id: string): Promise<ServiceResult<ConversationSummary>>

  /**
   * Obtém a timeline completa de mensagens de uma conversa
   */
  getMessages(conversationId: string): Promise<ServiceResult<ConversationMessage[]>>

  /**
   * Envia uma mensagem ou registra uma nota interna
   */
  sendMessage(
    payload: SendMessagePayload,
    currentActor: string,
  ): Promise<ServiceResult<ConversationMessage>>

  /**
   * Atualiza o estado da conversa (ex: NOVA -> EM_TRIAGEM)
   */
  updateStatus(
    conversationId: string,
    status: ConversationStatus,
    actor: string,
  ): Promise<ServiceResult<ConversationSummary>>

  /**
   * Atualiza a prioridade da conversa
   */
  updatePriority(
    conversationId: string,
    priority: ConversationPriority,
    actor: string,
  ): Promise<ServiceResult<ConversationSummary>>

  /**
   * Marca mensagens como lidas
   */
  markAsRead(conversationId: string): Promise<ServiceResult<boolean>>

  /**
   * Vincula um processo da base NOX à conversa
   */
  linkProcess(
    conversationId: string,
    processNumber: string,
  ): Promise<ServiceResult<ConversationSummary>>

  /**
   * Vincula um cliente da base NOX à conversa
   */
  linkClient(conversationId: string, clientId: string): Promise<ServiceResult<ConversationSummary>>

  /**
   * Atribui responsável à conversa
   */
  assignResponsible(
    conversationId: string,
    responsibleName: string,
  ): Promise<ServiceResult<ConversationSummary>>

  /**
   * Assina atualizações em tempo real (callback para reatividade)
   */
  subscribe(callback: (event: { type: string; payload: unknown }) => void): () => void
}
