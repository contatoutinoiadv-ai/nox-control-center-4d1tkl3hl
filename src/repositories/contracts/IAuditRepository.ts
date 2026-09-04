/**
 * Contrato abstrato do repositorio de auditoria imutavel do CENTRAL NOX.
 */

import { AuditLogEntry } from '@/types/nox'
import { PaginationMeta } from '@/core/results/ServiceResult'

export type AuditLogCategory = AuditLogEntry['category']

export interface AuditFilterOptions {
  category?: AuditLogCategory
  actor?: string
  targetId?: string
  page?: number
  perPage?: number
}

export interface AuditListResult {
  items: AuditLogEntry[]
  meta: PaginationMeta
}

export interface IAuditRepository {
  list(options?: AuditFilterOptions): Promise<AuditListResult>
  getAll(): Promise<AuditLogEntry[]>
  create(entry: {
    action: string
    category: AuditLogCategory
    actor: string
    targetId?: string
    details?: Record<string, unknown>
    ipAddress?: string
  }): Promise<AuditLogEntry>
}
