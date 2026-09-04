/**
 * Servico central de regras de negocio e persistencia de auditoria imutavel.
 */

import { IAuditRepository, AuditLogCategory } from '@/repositories/contracts/IAuditRepository'
import { pocketBaseAuditRepository } from '@/repositories/pocketbase/PocketBaseAuditRepository'
import { AuditLogEntry } from '@/types/nox'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { normalizeError } from '@/core/errors/AppErrors'

export class AuditService {
  constructor(private readonly auditRepo: IAuditRepository = pocketBaseAuditRepository) {}

  public async log(
    action: string,
    category: AuditLogCategory,
    actor: string,
    targetId?: string,
    details?: Record<string, unknown>,
  ): Promise<AuditLogEntry> {
    return this.auditRepo.create({
      action,
      category,
      actor: actor || 'Operador NOX',
      targetId: targetId || '',
      details: details || {},
    })
  }

  public async getLogs(): Promise<ServiceResult<AuditLogEntry[]>> {
    try {
      const logs = await this.auditRepo.getAll()
      return okResult(logs)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao buscar logs de auditoria.'))
    }
  }
}

export const auditService = new AuditService()
