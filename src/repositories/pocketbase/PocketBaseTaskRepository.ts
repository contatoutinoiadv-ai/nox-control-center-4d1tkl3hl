/**
 * Implementacao PocketBase do repositorio de tarefas operacionais.
 */

import pb from '@/lib/pocketbase/client'
import { realtimeService } from '@/services/realtime/RealtimeService'
import { ITaskRepository, TaskFilterOptions, TaskListResult } from '../contracts/ITaskRepository'
import { SentinelaTask } from '@/types/sentinela'
import { mapRecordToTask, mapTaskToRecordPayload } from '../mappers'
import { normalizeError } from '@/core/errors/AppErrors'

export class PocketBaseTaskRepository implements ITaskRepository {
  private collectionName = 'sentinela_tasks'

  public async list(options: TaskFilterOptions = {}): Promise<TaskListResult> {
    try {
      const page = options.page || 1
      const perPage = options.perPage || 100
      const filterParts: string[] = []

      if (options.status) {
        filterParts.push(`status = "${options.status.replace(/["\\]/g, '')}"`)
      }
      if (options.priority) {
        filterParts.push(`priority = "${options.priority.replace(/["\\]/g, '')}"`)
      }
      if (options.processNumber) {
        filterParts.push(`process_number = "${options.processNumber.replace(/["\\]/g, '')}"`)
      }

      const filter = filterParts.join(' && ')

      const result = await pb.collection(this.collectionName).getList(page, perPage, {
        sort: '-created',
        filter: filter || undefined,
      })

      return {
        items: result.items.map(mapRecordToTask),
        meta: {
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          totalItems: result.totalItems,
        },
      }
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao listar tarefas operacionais.')
    }
  }

  public async getAll(): Promise<SentinelaTask[]> {
    try {
      const records = await pb.collection(this.collectionName).getFullList({
        sort: '-created',
      })
      return records.map(mapRecordToTask)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao carregar todas as tarefas.')
    }
  }

  public async getById(id: string): Promise<SentinelaTask | null> {
    try {
      if (!id) return null
      const rec = await pb.collection(this.collectionName).getOne(id)
      return mapRecordToTask(rec)
    } catch (err: any) {
      if (err?.status === 404) return null
      throw normalizeError(err, `Falha ao buscar tarefa por ID: ${id}`)
    }
  }

  public async create(task: Partial<SentinelaTask>): Promise<SentinelaTask> {
    try {
      const payload = mapTaskToRecordPayload(task)
      const customId = task.id ? task.id.replace(/[^a-z0-9_]/gi, '').slice(0, 15) : undefined
      const createData = customId && customId.length === 15 ? { id: customId, ...payload } : payload

      const rec = await pb.collection(this.collectionName).create(createData)
      return mapRecordToTask(rec)
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao criar tarefa no PocketBase.')
    }
  }

  public async update(id: string, updates: Partial<SentinelaTask>): Promise<SentinelaTask> {
    try {
      const payload = mapTaskToRecordPayload(updates)
      const rec = await pb.collection(this.collectionName).update(id, payload)
      return mapRecordToTask(rec)
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao atualizar tarefa ${id}`)
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      await pb.collection(this.collectionName).delete(id)
      return true
    } catch (err: unknown) {
      throw normalizeError(err, `Falha ao excluir tarefa ${id}`)
    }
  }

  public subscribe(callback: (action: string, record: SentinelaTask) => void): () => void {
    let active = true
    const listener = (event: any) => {
      if (!active) return
      if (event?.payload) {
        callback(event.action, mapRecordToTask(event.payload))
      }
    }
    const unsub = realtimeService.subscribe<any>(this.collectionName, listener, 'sentinela_tasks')

    return () => {
      active = false
      unsub()
    }
  }
}

export const pocketBaseTaskRepository = new PocketBaseTaskRepository()
