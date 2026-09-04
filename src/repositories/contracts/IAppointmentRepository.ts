/**
 * Contrato abstrato do repositorio de compromissos e agenda do CENTRAL NOX.
 */

import { AgendaEvent } from '@/types/sentinela'
import { PaginationMeta } from '@/core/results/ServiceResult'

export interface AppointmentFilterOptions {
  startDate?: string
  endDate?: string
  processNumber?: string
  clientId?: string
  eventType?: string
  page?: number
  perPage?: number
}

export interface AppointmentListResult {
  items: AgendaEvent[]
  meta: PaginationMeta
}

export interface IAppointmentRepository {
  list(options?: AppointmentFilterOptions): Promise<AppointmentListResult>
  getAll(): Promise<AgendaEvent[]>
  getById(id: string): Promise<AgendaEvent | null>
  getByProcessNumber(processNumber: string): Promise<AgendaEvent | null>
  create(event: Partial<AgendaEvent>): Promise<AgendaEvent>
  update(id: string, updates: Partial<AgendaEvent>): Promise<AgendaEvent>
  delete(id: string): Promise<boolean>
  subscribe(callback: (action: string, record: AgendaEvent) => void): () => void
}
