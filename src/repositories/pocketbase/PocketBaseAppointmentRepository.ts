/**
 * Implementacao PocketBase do repositorio de compromissos e agenda.
 */

import pb from '@/lib/pocketbase/client'
import { realtimeService } from '@/services/realtime/RealtimeService'
import {
  IAppointmentRepository,
  AppointmentFilterOptions,
  AppointmentListResult,
} from '../contracts/IAppointmentRepository'
import { AgendaEvent } from '@/types/sentinela'
import { mapRecordToAppointment, mapAppointmentToRecordPayload } from '../mappers'
import { normalizeError } from '@/core/errors/AppErrors'

export class PocketBaseAppointmentRepository implements IAppointmentRepository {
  private collectionName = 'sentinela_agenda'

  public async list(options: AppointmentFilterOptions = {}): Promise<AppointmentListResult> {
    try {
      const page = options.page || 1
      const perPage = options.perPage || 100
      const filterParts: string[] = []

      if (options.startDate) {
        filterParts.push(`start_date >= "${options.startDate.replace(/["\\]/g, '')}"`)
      }
      if (options.endDate) {
        filterParts.push(`start_date <= "${options.endDate.replace(/["\\]/g, '')}"`)
      }
      if (options.clientId) {
        filterParts.push(`client_id = "${options.clientId.replace(/["\\]/g, '')}"`)
      }
      if (options.processNumber) {
        filterParts.push(`process_number = "${options.processNumber.replace(/["\\]/g, '')}"`)
      }

      const filter = filterParts.join(' && ')

      const result = await pb.collection(this.collectionName).getList(page, perPage, {
        sort: '-start_date',
        filter: filter || undefined,
      })

      return {
        items: result.items.map(mapRecordToAppointment),
        meta: {
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
        },
      }
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao listar eventos de agenda.')
    }
  }

  public async getAll(): Promise<AgendaEvent[]> {
    try {
      const records = await pb.collection(this.collectionName).getFullList({
        sort: '-start_date',
      })
      return records.map(mapRecordToAppointment)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao carregar todos os compromissos.')
    }
  }

  public async getById(id: string): Promise<AgendaEvent | null> {
    try {
      if (!id) return null
      const rec = await pb.collection(this.collectionName).getOne(id)
      return mapRecordToAppointment(rec)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw normalizeError(err, `Falha ao buscar compromisso por ID: ${id}`)
    }
  }

  public async getByProcessNumber(processNumber: string): Promise<AgendaEvent | null> {
    try {
      const safeProc = processNumber.replace(/["\\]/g, '').trim()
      if (!safeProc) return null
      const rec = await pb
        .collection(this.collectionName)
        .getFirstListItem(`process_number="${safeProc}"`)
      return mapRecordToAppointment(rec)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw normalizeError(err, `Falha ao buscar compromisso por processo`)
    }
  }

  public async create(event: Partial<AgendaEvent>): Promise<AgendaEvent> {
    try {
      const payload = mapAppointmentToRecordPayload(event)
      const customId = event.id ? event.id.replace(/[^a-z0-9_]/gi, '').slice(0, 15) : undefined
      const createData = customId && customId.length === 15 ? { id: customId, ...payload } : payload

      const rec = await pb.collection(this.collectionName).create(createData)
      return mapRecordToAppointment(rec)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao criar compromisso.')
    }
  }

  public async update(id: string, updates: Partial<AgendaEvent>): Promise<AgendaEvent> {
    try {
      const payload = mapAppointmentToRecordPayload(updates)
      const rec = await pb.collection(this.collectionName).update(id, payload)
      return mapRecordToAppointment(rec)
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao atualizar compromisso ${id}`)
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await pb.collection(this.collectionName).delete(id)
      return true
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao excluir compromisso ${id}`)
    }
  }

  public subscribe(callback: (action: string, record: AgendaEvent) => void): () => void {
    let active = true
    const listener = (event: any) => {
      if (!active) return
      if (event?.payload) {
        callback(event.action, mapRecordToAppointment(event.payload))
      }
    }
    const unsub = realtimeService.subscribe<any>(this.collectionName, listener, 'sentinela_agenda')

    return () => {
      active = false
      unsub()
    }
  }
}

export const pocketBaseAppointmentRepository = new PocketBaseAppointmentRepository()
