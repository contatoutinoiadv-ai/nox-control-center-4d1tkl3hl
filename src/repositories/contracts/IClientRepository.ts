/**
 * Contrato abstrato do repositorio de clientes do CENTRAL NOX.
 */

import { NoxClient, ClientStage } from '@/types/nox'
import { PaginationMeta } from '@/core/results/ServiceResult'

export interface ClientFilterOptions {
  search?: string
  stage?: ClientStage
  page?: number
  perPage?: number
  sort?: string
}

export interface ClientListResult {
  items: NoxClient[]
  meta: PaginationMeta
}

export interface IClientRepository {
  list(options?: ClientFilterOptions): Promise<ClientListResult>
  getAll(): Promise<NoxClient[]>
  getById(id: string): Promise<NoxClient | null>
  getByCpf(cpf: string): Promise<NoxClient | null>
  getByCode(code: string): Promise<NoxClient | null>
  create(client: Partial<NoxClient>): Promise<NoxClient>
  update(id: string, updates: Partial<NoxClient>): Promise<NoxClient>
  delete(id: string): Promise<boolean>
  subscribe(callback: (action: string, record: NoxClient) => void): () => void
}
