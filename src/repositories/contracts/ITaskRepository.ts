/**
 * Contrato abstrato do repositorio de tarefas operacionais do CENTRAL NOX.
 */

import { SentinelaTask } from '@/types/sentinela'
import { PaginationMeta } from '@/core/results/ServiceResult'

export interface TaskFilterOptions {
  status?: string
  priority?: string
  processNumber?: string
  page?: number
  perPage?: number
}

export interface TaskListResult {
  items: SentinelaTask[]
  meta: PaginationMeta
}

export interface ITaskRepository {
  list(options?: TaskFilterOptions): Promise<TaskListResult>
  getAll(): Promise<SentinelaTask[]>
  getById(id: string): Promise<SentinelaTask | null>
  create(task: Partial<SentinelaTask>): Promise<SentinelaTask>
  update(id: string, updates: Partial<SentinelaTask>): Promise<SentinelaTask>
  delete(id: string): Promise<boolean>
  subscribe(callback: (action: string, record: SentinelaTask) => void): () => void
}
