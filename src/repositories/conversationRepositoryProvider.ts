import { IConversationRepository } from '@/repositories/contracts/IConversationRepository'
import { mockConversationRepository } from '@/repositories/mock/MockConversationRepository'

/**
 * Adapter provider para a Central de Atendimento.
 * Hoje retorna MockConversationRepository.
 * No futuro (Fase 5/6), quando o PocketBase for integrado para mensageria,
 * bastará injetar `pocketBaseConversationRepository` aqui sem que nenhuma
 * tela ou componente precise ser modificado.
 */
let currentRepository: IConversationRepository = mockConversationRepository

export const getConversationRepository = (): IConversationRepository => {
  return currentRepository
}

export const setConversationRepository = (repo: IConversationRepository) => {
  currentRepository = repo
}
