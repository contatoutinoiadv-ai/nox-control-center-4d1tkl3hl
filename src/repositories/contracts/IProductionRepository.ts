/**
 * Contrato abstrato do repositorio de producao de pecas do CENTRAL NOX.
 */

import { ProductionItem } from '@/types/nox'
import { PaginationMeta } from '@/core/results/ServiceResult'

export interface ProductionFilterOptions {
  clientId?: string
  estagio?: string
  page?: number
  perPage?: number
}

export interface ProductionListResult {
  items: ProductionItem[]
  meta: PaginationMeta
}

export interface IProductionRepository {
  list(options?: ProductionFilterOptions): Promise<ProductionListResult>
  getAll(): Promise<ProductionItem[]>
  getById(id: string): Promise<ProductionItem | null>
  getByClientId(clientId: string): Promise<ProductionItem[]>
  create(item: Partial<ProductionItem>): Promise<ProductionItem>
  update(id: string, updates: Partial<ProductionItem>): Promise<ProductionItem>
  delete(id: string): Promise<boolean>
  subscribe(callback: (action: string, record: ProductionItem) => void): () => void
}
