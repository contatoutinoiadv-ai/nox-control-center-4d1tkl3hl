/**
 * Implementacao PocketBase do repositorio de auditoria imutavel.
 */

import pb from '@/lib/pocketbase/client'
import {
  IAuditRepository,
  AuditFilterOptions,
  AuditListResult,
  AuditLogCategory,
} from '../contracts/IAuditRepository'
import { AuditLogEntry } from '@/types/nox'
import { mapRecordToAuditLog } from '../mappers'
import { normalizeError } from '@/core/errors/AppErrors'

export class PocketBaseAuditRepository implements IAuditRepository {
  private collectionName = 'audit_logs'

  public async list(options: AuditFilterOptions = {}): Promise<AuditListResult> {
    try {
      const page = options.page || 1
      const perPage = options.perPage || 100
      const filterParts: string[] = []

      if (options.category) {
        filterParts.push(`category = "${options.category.replace(/["\\]/g, '')}"`)
      }
      if (options.actor) {
        filterParts.push(`actor ~ "${options.actor.replace(/["\\]/g, '')}"`)
      }
      if (options.targetId) {
        filterParts.push(`target_id = "${options.targetId.replace(/["\\]/g, '')}"`)
      }

      const filter = filterParts.join(' && ')

      const result = await pb.collection(this.collectionName).getList(page, perPage, {
        sort: '-created',
        filter: filter || undefined,
      })

      return {
        items: result.items.map(mapRecordToAuditLog),
        meta: {
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
        },
      }
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao listar logs de auditoria.')
    }
  }

  public async getAll(): Promise<AuditLogEntry[]> {
    try {
      const records = await pb.collection(this.collectionName).getFullList({
        sort: '-created',
      })
      return records.map(mapRecordToAuditLog)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao carregar trilha de auditoria.')
    }
  }

  public async create(entry: {
    action: string
    category: AuditLogCategory
    actor: string
    targetId?: string
    details?: Record<string, unknown>
    ipAddress?: string
  }): Promise<AuditLogEntry> {
    try {
      const payload = {
        action: entry.action,
        category: entry.category,
        actor: entry.actor,
        target_id: entry.targetId || '',
        details: entry.details || {},
        ip_address: entry.ipAddress || 'local',
      }
      const rec = await pb.collection(this.collectionName).create(payload)
      return mapRecordToAuditLog(rec)
    } catch (err: unknown) {
      // Falha de auditoria nao deve quebrar o fluxo principal mas gera warning
      console.warn('PocketBase audit log create fallback:', err)
      return {
        id: `local_audit_${Date.now()}`,
        createdAt: new Date().toISOString(),
        action: entry.action,
        category: entry.category,
        actor: entry.actor,
        targetId: entry.targetId || '',
        details: entry.details || {},
        ipAddress: entry.ipAddress || 'local',
      }
    }
  }
}

export const pocketBaseAuditRepository = new PocketBaseAuditRepository()
