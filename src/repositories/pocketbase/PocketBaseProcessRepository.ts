/**
 * Implementacao PocketBase do repositorio de processos monitorados e movimentacoes.
 */

import pb from '@/lib/pocketbase/client'
import {
  IProcessRepository,
  ProcessFilterOptions,
  ProcessListResult,
} from '../contracts/IProcessRepository'
import { ProcessoMonitorado, MovimentacaoProcesso } from '@/services/datajudService'
import { normalizeError } from '@/core/errors/AppErrors'

export class PocketBaseProcessRepository implements IProcessRepository {
  private colProcessos = 'processos_monitorados'
  private colMovimentacoes = 'movimentacoes_processo'

  public async list(options: ProcessFilterOptions = {}): Promise<ProcessListResult> {
    try {
      const page = options.page || 1
      const perPage = options.perPage || 100
      const filterParts: string[] = []

      if (options.ativo !== undefined) {
        filterParts.push(`ativo = ${options.ativo ? 'true' : 'false'}`)
      }
      if (options.temPrazoAberto !== undefined) {
        filterParts.push(`tem_prazo_aberto = ${options.temPrazoAberto ? 'true' : 'false'}`)
      }
      if (options.clientId) {
        filterParts.push(`client_id = "${options.clientId.replace(/["\\]/g, '')}"`)
      }
      if (options.search) {
        const safeSearch = options.search.replace(/["\\]/g, '')
        filterParts.push(`(numero_processo ~ "${safeSearch}" || cliente ~ "${safeSearch}")`)
      }

      const filter = filterParts.join(' && ')

      const result = await pb
        .collection(this.colProcessos)
        .getList<ProcessoMonitorado>(page, perPage, {
          sort: '-created',
          filter: filter || undefined,
          expand: 'client_id',
        })

      return {
        items: result.items,
        meta: {
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
        },
      }
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao listar processos monitorados.')
    }
  }

  public async getAll(): Promise<ProcessoMonitorado[]> {
    try {
      return await pb.collection(this.colProcessos).getFullList<ProcessoMonitorado>({
        sort: '-created',
        expand: 'client_id',
      })
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao buscar todos os processos.')
    }
  }

  public async getByNumero(numeroProcesso: string): Promise<ProcessoMonitorado | null> {
    try {
      const safe = numeroProcesso.replace(/["\\]/g, '').trim()
      if (!safe) return null
      return await pb
        .collection(this.colProcessos)
        .getFirstListItem<ProcessoMonitorado>(`numero_processo="${safe}"`, { expand: 'client_id' })
    } catch (err: any) {
      if (err?.status === 404) return null
      throw normalizeError(err, 'Falha ao buscar processo por numero')
    }
  }

  public async create(processo: {
    numero_processo: string
    cliente: string
    tribunal: string
    ativo?: boolean
    tem_prazo_aberto?: boolean
    client_id?: string
  }): Promise<ProcessoMonitorado> {
    try {
      return await pb.collection(this.colProcessos).create<ProcessoMonitorado>({
        numero_processo: processo.numero_processo,
        cliente: processo.cliente,
        tribunal: processo.tribunal,
        ativo: processo.ativo !== false,
        tem_prazo_aberto: !!processo.tem_prazo_aberto,
        client_id: processo.client_id || undefined,
      })
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao registrar processo monitorado.')
    }
  }

  public async update(
    id: string,
    updates: Partial<ProcessoMonitorado>,
  ): Promise<ProcessoMonitorado> {
    try {
      return await pb.collection(this.colProcessos).update<ProcessoMonitorado>(id, updates)
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao atualizar processo monitorado ${id}`)
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await pb.collection(this.colProcessos).delete(id)
      return true
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao remover processo monitorado ${id}`)
    }
  }

  public async getMovimentacoes(numeroProcesso: string): Promise<MovimentacaoProcesso[]> {
    try {
      const safe = numeroProcesso.replace(/["\\]/g, '').trim()
      if (!safe) return []
      return await pb.collection(this.colMovimentacoes).getFullList<MovimentacaoProcesso>({
        filter: `numero_processo = "${safe}"`,
        sort: '-data_hora_movimento',
      })
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao buscar movimentacoes do processo.')
    }
  }

  public subscribe(callback: (action: string, record: ProcessoMonitorado) => void): () => void {
    let active = true
    pb.collection(this.colProcessos)
      .subscribe('*', (e: any) => {
        if (!active) return
        if (e?.record) {
          callback(e.action, e.record as ProcessoMonitorado)
        }
      })
      .catch((err) => console.warn('Falha ao assinar realtime de processos_monitorados:', err))

    return () => {
      active = false
      pb.collection(this.colProcessos)
        .unsubscribe('*')
        .catch(() => {})
    }
  }
}

export const pocketBaseProcessRepository = new PocketBaseProcessRepository()
