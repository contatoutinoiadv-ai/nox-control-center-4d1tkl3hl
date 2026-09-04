/**
 * Servico de dominio de Tarefas Operacionais e prazos processuais.
 */

import { ITaskRepository, TaskFilterOptions } from '@/repositories/contracts/ITaskRepository'
import { pocketBaseTaskRepository } from '@/repositories/pocketbase/PocketBaseTaskRepository'
import { SentinelaTask } from '@/types/sentinela'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError, normalizeError } from '@/core/errors/AppErrors'
import { auditService } from '../audit/AuditService'

export class TaskService {
  constructor(private readonly taskRepo: ITaskRepository = pocketBaseTaskRepository) {}

  public async listTasks(options?: TaskFilterOptions): Promise<ServiceResult<SentinelaTask[]>> {
    try {
      const result = await this.taskRepo.list(options)
      return okResult(result.items, result.meta)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao listar tarefas.'))
    }
  }

  public async getAllTasks(): Promise<SentinelaTask[]> {
    return this.taskRepo.getAll()
  }

  public async getTaskById(id: string): Promise<ServiceResult<SentinelaTask>> {
    try {
      if (!id) return failResult(new ValidationError('ID de tarefa nao informado.'))
      const task = await this.taskRepo.getById(id)
      if (!task) return failResult(new NotFoundError('Tarefa', id))
      return okResult(task)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao buscar tarefa.'))
    }
  }

  public async createTask(
    task: Partial<SentinelaTask>,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<SentinelaTask>> {
    try {
      if (!task.title || !task.title.trim()) {
        return failResult(new ValidationError('Titulo da tarefa e obrigatorio.'))
      }

      const created = await this.taskRepo.create({
        ...task,
        status: task.status || 'A_FAZER',
        priority: task.priority || 'MEDIA',
        responsible: task.responsible || 'Higor Utinoi de Oliveira',
      })

      await auditService.log('TAREFA_CRIADA', 'sistema', actor, created.id, {
        title: created.title,
        priority: created.priority,
        processNumber: created.processNumber,
      })

      return okResult(created)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao cadastrar tarefa.'))
    }
  }

  public async updateTask(
    id: string,
    updates: Partial<SentinelaTask>,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<SentinelaTask>> {
    try {
      const existing = await this.taskRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Tarefa', id))

      const updated = await this.taskRepo.update(id, updates)

      await auditService.log('TAREFA_ATUALIZADA', 'sistema', actor, id, {
        campos: Object.keys(updates),
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao atualizar tarefa.'))
    }
  }

  public async deleteTask(id: string, actor = 'Operador NOX'): Promise<ServiceResult<boolean>> {
    try {
      const existing = await this.taskRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Tarefa', id))

      await this.taskRepo.delete(id)

      await auditService.log('TAREFA_EXCLUIDA', 'sistema', actor, id, {
        title: existing.title,
      })

      return okResult(true)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao excluir tarefa.'))
    }
  }

  public async toggleSubtask(
    taskId: string,
    subtaskId: string,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<SentinelaTask>> {
    try {
      const existing = await this.taskRepo.getById(taskId)
      if (!existing) return failResult(new NotFoundError('Tarefa', taskId))

      const subtasks = [...(existing.subtasks || [])]
      const st = subtasks.find((s) => s.id === subtaskId)
      if (!st) return failResult(new NotFoundError('Subtarefa', subtaskId))

      st.completed = !st.completed
      st.completedAt = st.completed ? new Date().toISOString() : undefined
      st.completedBy = st.completed ? actor : undefined

      const updated = await this.taskRepo.update(taskId, { subtasks })
      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao atualizar subtarefa.'))
    }
  }

  public subscribe(callback: (action: string, record: SentinelaTask) => void): () => void {
    return this.taskRepo.subscribe(callback)
  }
}

export const taskService = new TaskService()
