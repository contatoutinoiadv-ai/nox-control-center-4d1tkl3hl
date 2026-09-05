import { IConversationRepository } from '@/repositories/contracts/IConversationRepository'
import { mockConversationRepository } from '@/repositories/mock/MockConversationRepository'
import { pocketBaseConversationRepository } from '@/repositories/pocketbase/PocketBaseConversationRepository'

/**
 * Adapter provider para a Central de Atendimento NOX V2.
 *
 * Fase 6 Lote 2:
 * Por padrão, opera com o PocketBaseConversationRepository real (backend Skip Cloud).
 * Em caso de ambiente de testes isolados ou quando explicitamente solicitado,
 * permite chaveamento via `setConversationRepository`.
 */
let currentRepository: IConversationRepository = pocketBaseConversationRepository

export const getConversationRepository = (): IConversationRepository => {
  return currentRepository
}

export const setConversationRepository = (repo: IConversationRepository) => {
  currentRepository = repo
}

export const useMockConversationRepository = () => {
  currentRepository = mockConversationRepository
}

export const usePocketBaseConversationRepository = () => {
  currentRepository = pocketBaseConversationRepository
}
