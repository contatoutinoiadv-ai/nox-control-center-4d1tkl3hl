/**
 * Implementacao PocketBase do repositorio de clientes.
 */

import pb from '@/lib/pocketbase/client'
import { realtimeService } from '@/services/realtime/RealtimeService'
import {
  IClientRepository,
  ClientFilterOptions,
  ClientListResult,
} from '../contracts/IClientRepository'
import { NoxClient } from '@/types/nox'
import { mapRecordToClient, mapClientToRecordPayload } from '../mappers'
import {
  NetworkError,
  NotFoundError,
  ValidationError,
  normalizeError,
} from '@/core/errors/AppErrors'

export class PocketBaseClientRepository implements IClientRepository {
  private collectionName = 'clients'

  public async list(options: ClientFilterOptions = {}): Promise<ClientListResult> {
    try {
      const page = options.page || 1
      const perPage = options.perPage || 50
      const sort = options.sort || '-created'

      const filterParts: string[] = []
      if (options.stage) {
        // Sanitiza valor enum
        const safeStage = options.stage.replace(/[^a-z0-9_]/gi, '')
        filterParts.push(`estagio = "${safeStage}"`)
      }
      if (options.search) {
        const safeSearch = options.search.replace(/["\\]/g, '')
        filterParts.push(
          `(nome ~ "${safeSearch}" || cpf ~ "${safeSearch}" || client_code ~ "${safeSearch}")`,
        )
      }

      const filter = filterParts.join(' && ')

      const result = await pb.collection(this.collectionName).getList(page, perPage, {
        sort,
        filter: filter || undefined,
      })

      return {
        items: result.items.map(mapRecordToClient),
        meta: {
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
        },
      }
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao listar clientes no PocketBase.')
    }
  }

  public async getAll(): Promise<NoxClient[]> {
    try {
      const records = await pb.collection(this.collectionName).getFullList({
        sort: '-created',
      })
      return records.map(mapRecordToClient)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao buscar todos os clientes.')
    }
  }

  public async getById(id: string): Promise<NoxClient | null> {
    try {
      if (!id) return null
      const rec = await pb.collection(this.collectionName).getOne(id)
      return mapRecordToClient(rec)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw normalizeError(err, `Falha ao buscar cliente por ID: ${id}`)
    }
  }

  public async getByCpf(cpf: string): Promise<NoxClient | null> {
    try {
      const cleanCpf = cpf.replace(/\D/g, '')
      if (!cleanCpf) return null
      const rec = await pb.collection(this.collectionName).getFirstListItem(`cpf="${cleanCpf}"`)
      return mapRecordToClient(rec)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw normalizeError(err, `Falha ao buscar cliente por CPF`)
    }
  }

  public async getByCode(code: string): Promise<NoxClient | null> {
    try {
      const safeCode = code.replace(/["\\]/g, '').trim()
      if (!safeCode) return null
      const rec = await pb
        .collection(this.collectionName)
        .getFirstListItem(`client_code="${safeCode}"`)
      return mapRecordToClient(rec)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw normalizeError(err, `Falha ao buscar cliente por codigo`)
    }
  }

  public async create(client: Partial<NoxClient>): Promise<NoxClient> {
    try {
      const payload = mapClientToRecordPayload(client)
      const customId = client.id ? client.id.replace(/[^a-z0-9_]/gi, '').slice(0, 15) : undefined
      const createData = customId && customId.length === 15 ? { id: customId, ...payload } : payload

      const rec = await pb.collection(this.collectionName).create(createData)
      return mapRecordToClient(rec)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao cadastrar cliente no PocketBase.')
    }
  }

  public async update(id: string, updates: Partial<NoxClient>): Promise<NoxClient> {
    try {
      const payload = mapClientToRecordPayload(updates)
      const rec = await pb.collection(this.collectionName).update(id, payload)
      return mapRecordToClient(rec)
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao atualizar cliente ${id}`)
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await pb.collection(this.collectionName).delete(id)
      return true
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao excluir cliente ${id}`)
    }
  }

  public subscribe(callback: (action: string, record: NoxClient) => void): () => void {
    let active = true
    const listener = (event: any) => {
      if (!active) return
      if (event?.payload) {
        callback(event.action, mapRecordToClient(event.payload))
      }
    }
    const unsub = realtimeService.subscribe<any>(this.collectionName, listener, 'clients')

    return () => {
      active = false
      unsub()
    }
  }
}

export const pocketBaseClientRepository = new PocketBaseClientRepository()
