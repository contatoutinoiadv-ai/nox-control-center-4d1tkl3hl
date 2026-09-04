/**
 * Servico de dominio de Compromissos e Audiencias.
 * Concentra validacao de datas, controle de preparacao de audiencia e auditoria.
 */

import {
  IAppointmentRepository,
  AppointmentFilterOptions,
} from '@/repositories/contracts/IAppointmentRepository'
import { pocketBaseAppointmentRepository } from '@/repositories/pocketbase/PocketBaseAppointmentRepository'
import { AgendaEvent } from '@/types/sentinela'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError, normalizeError } from '@/core/errors/AppErrors'
import { auditService } from '../audit/AuditService'

export class AppointmentService {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository = pocketBaseAppointmentRepository,
  ) {}

  public async listAppointments(
    options?: AppointmentFilterOptions,
  ): Promise<ServiceResult<AgendaEvent[]>> {
    try {
      const result = await this.appointmentRepo.list(options)
      return okResult(result.items, result.meta)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao listar compromissos.'))
    }
  }

  public async getAllAppointments(): Promise<AgendaEvent[]> {
    return this.appointmentRepo.getAll()
  }

  public async getAppointmentById(id: string): Promise<ServiceResult<AgendaEvent>> {
    try {
      if (!id) return failResult(new ValidationError('ID nao informado.'))
      const ev = await this.appointmentRepo.getById(id)
      if (!ev) return failResult(new NotFoundError('Compromisso', id))
      return okResult(ev)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao buscar compromisso.'))
    }
  }

  public async createAppointment(
    event: Partial<AgendaEvent>,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<AgendaEvent>> {
    try {
      if (!event.title || !event.title.trim()) {
        return failResult(new ValidationError('Titulo do evento e obrigatorio.'))
      }
      if (!event.startDate) {
        return failResult(new ValidationError('Data de inicio e obrigatoria.'))
      }

      const created = await this.appointmentRepo.create(event)

      await auditService.log('EVENTO_AGENDA_CRIADO', 'sistema', actor, created.id, {
        title: created.title,
        startDate: created.startDate,
        processNumber: created.processNumber,
      })

      return okResult(created)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao cadastrar compromisso.'))
    }
  }

  public async updateAppointment(
    id: string,
    updates: Partial<AgendaEvent>,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<AgendaEvent>> {
    try {
      const existing = await this.appointmentRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Compromisso', id))

      const updated = await this.appointmentRepo.update(id, updates)

      await auditService.log('EVENTO_AGENDA_ATUALIZADO', 'sistema', actor, id, {
        campos: Object.keys(updates),
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao atualizar compromisso.'))
    }
  }

  public async deleteAppointment(
    id: string,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<boolean>> {
    try {
      const existing = await this.appointmentRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Compromisso', id))

      await this.appointmentRepo.delete(id)

      await auditService.log('EVENTO_AGENDA_EXCLUIDO', 'sistema', actor, id, {
        title: existing.title,
      })

      return okResult(true)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao excluir compromisso.'))
    }
  }

  public async togglePreparacao(
    id: string,
    habilitar?: boolean,
    actor = 'Higor Utinoi de Oliveira',
  ): Promise<ServiceResult<AgendaEvent>> {
    try {
      const existing = await this.appointmentRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Compromisso', id))

      const novoStatus = habilitar !== undefined ? habilitar : !existing.preparacaoHabilitada
      const updated = await this.appointmentRepo.update(id, { preparacaoHabilitada: novoStatus })

      await auditService.log(
        novoStatus ? 'PREPARACAO_AUDIENCIA_HABILITADA' : 'PREPARACAO_AUDIENCIA_DESABILITADA',
        'configuracao',
        actor,
        existing.clientId || id,
        {
          agendaId: id,
          title: existing.title,
          habilitada: novoStatus,
        },
      )

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao alterar preparacao de audiencia.'))
    }
  }

  public subscribe(callback: (action: string, record: AgendaEvent) => void): () => void {
    return this.appointmentRepo.subscribe(callback)
  }
}

export const appointmentService = new AppointmentService()
