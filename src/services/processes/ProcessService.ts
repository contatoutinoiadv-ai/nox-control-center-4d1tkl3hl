/**
 * Servico de dominio de Processos Monitorados.
 * Integra cadastro, linha do tempo unificada, vinculo com clientes e auditoria.
 */

import {
  IProcessRepository,
  ProcessFilterOptions,
} from '@/repositories/contracts/IProcessRepository'
import { pocketBaseProcessRepository } from '@/repositories/pocketbase/PocketBaseProcessRepository'
import { ProcessoMonitorado, MovimentacaoProcesso } from '@/services/datajudService'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError, normalizeError } from '@/core/errors/AppErrors'
import { auditService } from '../audit/AuditService'

export class ProcessService {
  constructor(private readonly processRepo: IProcessRepository = pocketBaseProcessRepository) {}

  public async listProcesses(
    options?: ProcessFilterOptions,
  ): Promise<ServiceResult<ProcessoMonitorado[]>> {
    try {
      const result = await this.processRepo.list(options)
      return okResult(result.items, result.meta)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao listar processos.'))
    }
  }

  public async getAllProcesses(): Promise<ProcessoMonitorado[]> {
    return this.processRepo.getAll()
  }

  public async getProcessByNumero(
    numeroProcesso: string,
  ): Promise<ServiceResult<ProcessoMonitorado>> {
    try {
      if (!numeroProcesso)
        return failResult(new ValidationError('Numero do processo nao informado.'))
      const proc = await this.processRepo.getByNumero(numeroProcesso)
      if (!proc) return failResult(new NotFoundError('Processo', numeroProcesso))
      return okResult(proc)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao buscar processo.'))
    }
  }

  public async addMonitoredProcess(
    data: {
      numeroProcesso: string
      cliente: string
      tribunal: string
      clientId?: string
    },
    actor = 'Operador NOX',
  ): Promise<ServiceResult<ProcessoMonitorado>> {
    try {
      const cleanNumero = data.numeroProcesso.trim()
      if (!cleanNumero) {
        return failResult(new ValidationError('Numero do processo e obrigatorio.'))
      }

      const existing = await this.processRepo.getByNumero(cleanNumero)
      if (existing) {
        return failResult(
          new ValidationError('Processo ja esta monitorado.', { numeroProcesso: 'Duplicado' }),
        )
      }

      const created = await this.processRepo.create({
        numero_processo: cleanNumero,
        cliente: data.cliente || 'Nao informado',
        tribunal: data.tribunal || 'TJMS',
        ativo: true,
        tem_prazo_aberto: false,
        client_id: data.clientId,
      })

      await auditService.log('PROCESSO_MONITORADO_ADICIONADO', 'sistema', actor, created.id, {
        numeroProcesso: cleanNumero,
        tribunal: data.tribunal,
        cliente: data.cliente,
      })

      return okResult(created)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao adicionar processo monitorado.'))
    }
  }

  public async removeMonitoredProcess(
    id: string,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<boolean>> {
    try {
      await this.processRepo.delete(id)
      await auditService.log('PROCESSO_MONITORADO_REMOVIDO', 'sistema', actor, id)
      return okResult(true)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao remover processo monitorado.'))
    }
  }

  public async getMovimentacoes(
    numeroProcesso: string,
  ): Promise<ServiceResult<MovimentacaoProcesso[]>> {
    try {
      const list = await this.processRepo.getMovimentacoes(numeroProcesso)
      return okResult(list)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao obter movimentacoes do processo.'))
    }
  }

  public subscribe(callback: (action: string, record: ProcessoMonitorado) => void): () => void {
    return this.processRepo.subscribe(callback)
  }
}

export const processService = new ProcessService()
