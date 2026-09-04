/**
 * Contrato abstrato do repositorio de processos monitorados e movimentacoes.
 */

import { PaginationMeta } from '@/core/results/ServiceResult'
import { ProcessoMonitorado, MovimentacaoProcesso } from '@/services/datajudService'

export interface ProcessFilterOptions {
  ativo?: boolean
  temPrazoAberto?: boolean
  clientId?: string
  search?: string
  page?: number
  perPage?: number
}

export interface ProcessListResult {
  items: ProcessoMonitorado[]
  meta: PaginationMeta
}

export interface IProcessRepository {
  list(options?: ProcessFilterOptions): Promise<ProcessListResult>
  getAll(): Promise<ProcessoMonitorado[]>
  getByNumero(numeroProcesso: string): Promise<ProcessoMonitorado | null>
  create(processo: {
    numero_processo: string
    cliente: string
    tribunal: string
    ativo?: boolean
    tem_prazo_aberto?: boolean
    client_id?: string
  }): Promise<ProcessoMonitorado>
  update(id: string, updates: Partial<ProcessoMonitorado>): Promise<ProcessoMonitorado>
  delete(id: string): Promise<boolean>
  getMovimentacoes(numeroProcesso: string): Promise<MovimentacaoProcesso[]>
  subscribe(callback: (action: string, record: ProcessoMonitorado) => void): () => void
}
