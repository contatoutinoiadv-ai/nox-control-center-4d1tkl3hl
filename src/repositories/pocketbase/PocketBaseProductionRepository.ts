/**
 * Implementacao PocketBase do repositorio de producao juridica.
 */

import pb from '@/lib/pocketbase/client'
import {
  IProductionRepository,
  ProductionFilterOptions,
  ProductionListResult,
} from '../contracts/IProductionRepository'
import { ProductionItem } from '@/types/nox'
import { mapRecordToProductionItem, mapProductionItemToRecordPayload } from '../mappers'
import { normalizeError } from '@/core/errors/AppErrors'

export class PocketBaseProductionRepository implements IProductionRepository {
  private collectionName = 'production_items'

  public async list(options: ProductionFilterOptions = {}): Promise<ProductionListResult> {
    try {
      const page = options.page || 1
      const perPage = options.perPage || 100
      const filterParts: string[] = []

      if (options.clientId) {
        filterParts.push(`client_id = "${options.clientId.replace(/["\\]/g, '')}"`)
      }
      if (options.estagio) {
        filterParts.push(`estagio = "${options.estagio.replace(/["\\]/g, '')}"`)
      }

      const filter = filterParts.join(' && ')

      const result = await pb.collection(this.collectionName).getList(page, perPage, {
        sort: '-created',
        filter: filter || undefined,
      })

      return {
        items: result.items.map(mapRecordToProductionItem),
        meta: {
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
        },
      }
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao listar itens de producao.')
    }
  }

  public async getAll(): Promise<ProductionItem[]> {
    try {
      const records = await pb.collection(this.collectionName).getFullList({
        sort: '-created',
      })
      return records.map(mapRecordToProductionItem)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao carregar todos os itens de producao.')
    }
  }

  public async getById(id: string): Promise<ProductionItem | null> {
    try {
      if (!id) return null
      const rec = await pb.collection(this.collectionName).getOne(id)
      return mapRecordToProductionItem(rec)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw normalizeError(err, `Falha ao buscar item de producao: ${id}`)
    }
  }

  public async getByClientId(clientId: string): Promise<ProductionItem[]> {
    try {
      const safeId = clientId.replace(/["\\]/g, '').trim()
      if (!safeId) return []
      const records = await pb.collection(this.collectionName).getFullList({
        filter: `client_id = "${safeId}"`,
        sort: '-created',
      })
      return records.map(mapRecordToProductionItem)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao buscar producoes por cliente.')
    }
  }

  public async create(item: Partial<ProductionItem>): Promise<ProductionItem> {
    try {
      const payload = mapProductionItemToRecordPayload(item)
      const customId = item.id ? item.id.replace(/[^a-z0-9_]/gi, '').slice(0, 15) : undefined
      const createData = customId && customId.length === 15 ? { id: customId, ...payload } : payload

      const rec = await pb.collection(this.collectionName).create(createData)
      return mapRecordToProductionItem(rec)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao criar item de producao no PocketBase.')
    }
  }

  public async update(id: string, updates: Partial<ProductionItem>): Promise<ProductionItem> {
    try {
      const payload = mapProductionItemToRecordPayload(updates)
      const rec = await pb.collection(this.collectionName).update(id, payload)
      return mapRecordToProductionItem(rec)
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao atualizar item de producao ${id}`)
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await pb.collection(this.collectionName).delete(id)
      return true
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao excluir item de producao ${id}`)
    }
  }

  public subscribe(callback: (action: string, record: ProductionItem) => void): () => void {
    let active = true
    pb.collection(this.collectionName)
      .subscribe('*', (e: any) => {
        if (!active) return
        if (e?.record) {
          callback(e.action, mapRecordToProductionItem(e.record))
        }
      })
      .catch((err) => console.warn('Falha ao assinar realtime de production_items:', err))

    return () => {
      active = false
      pb.collection(this.collectionName)
        .unsubscribe('*')
        .catch(() => {})
    }
  }
}

export const pocketBaseProductionRepository = new PocketBaseProductionRepository()
