/**
 * Servico de dominio de Clientes do CENTRAL NOX.
 * Concentra validacao de CPF, integridade cadastral, transicao de estagios e auditoria.
 * Sem JSX.
 */

import { IClientRepository, ClientFilterOptions } from '@/repositories/contracts/IClientRepository'
import { pocketBaseClientRepository } from '@/repositories/pocketbase/PocketBaseClientRepository'
import { NoxClient, ClientStage } from '@/types/nox'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError, normalizeError } from '@/core/errors/AppErrors'
import { auditService } from '../audit/AuditService'

export class ClientService {
  constructor(private readonly clientRepo: IClientRepository = pocketBaseClientRepository) {}

  public async listClients(options?: ClientFilterOptions): Promise<ServiceResult<NoxClient[]>> {
    try {
      const result = await this.clientRepo.list(options)
      return okResult(result.items, result.meta)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao listar clientes.'))
    }
  }

  public async getAllClients(): Promise<NoxClient[]> {
    return this.clientRepo.getAll()
  }

  public async getClientById(id: string): Promise<ServiceResult<NoxClient>> {
    try {
      if (!id) {
        return failResult(new ValidationError('Identificador do cliente nao informado.'))
      }
      const client = await this.clientRepo.getById(id)
      if (!client) {
        return failResult(new NotFoundError('Cliente', id))
      }
      return okResult(client)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao buscar cliente.'))
    }
  }

  public async getClientByCpf(cpf: string): Promise<ServiceResult<NoxClient>> {
    try {
      const clean = cpf.replace(/\D/g, '')
      if (!clean) {
        return failResult(new ValidationError('CPF nao informado.'))
      }
      const client = await this.clientRepo.getByCpf(clean)
      if (!client) {
        return failResult(new NotFoundError('Cliente com CPF', cpf))
      }
      return okResult(client)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao buscar cliente por CPF.'))
    }
  }

  public async createClient(
    client: Partial<NoxClient>,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<NoxClient>> {
    try {
      if (!client.nome || !client.nome.trim()) {
        return failResult(
          new ValidationError('O nome completo do cliente e obrigatorio.', {
            nome: 'Campo obrigatorio',
          }),
        )
      }

      // Se tiver CPF, valida e verifica duplicidade
      if (client.cpf) {
        const cleanCpf = client.cpf.replace(/\D/g, '')
        if (cleanCpf.length === 11) {
          const existing = await this.clientRepo.getByCpf(cleanCpf)
          if (existing) {
            return failResult(
              new ValidationError(`Ja existe um cliente cadastrado com o CPF ${client.cpf}.`, {
                cpf: 'CPF duplicado',
              }),
            )
          }
        }
      }

      const clientCode =
        client.clientCode ||
        `CLI-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      const protocolo = client.protocolo || `INT-${Date.now().toString(36).toUpperCase()}`

      const payload: Partial<NoxClient> = {
        ...client,
        clientCode,
        protocolo,
        estagio: client.estagio || 'novo',
        origem: client.origem || 'manual',
        responsavel: client.responsavel || 'Higor Utinoi de Oliveira',
      }

      const created = await this.clientRepo.create(payload)

      await auditService.log('CLIENTE_CRIADO', 'sistema', actor, created.id, {
        nome: created.nome,
        clientCode: created.clientCode,
        cpf: created.cpf,
      })

      return okResult(created)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao criar cliente.'))
    }
  }

  public async updateClient(
    id: string,
    updates: Partial<NoxClient>,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<NoxClient>> {
    try {
      if (!id) {
        return failResult(new ValidationError('ID de cliente obrigatorio para atualizacao.'))
      }
      const existing = await this.clientRepo.getById(id)
      if (!existing) {
        return failResult(new NotFoundError('Cliente', id))
      }

      const updated = await this.clientRepo.update(id, updates)

      await auditService.log('CLIENTE_ATUALIZADO', 'sistema', actor, id, {
        camposAtualizados: Object.keys(updates),
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao atualizar dados do cliente.'))
    }
  }

  public async updateStage(
    id: string,
    newStage: ClientStage,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<NoxClient>> {
    try {
      const existing = await this.clientRepo.getById(id)
      if (!existing) {
        return failResult(new NotFoundError('Cliente', id))
      }

      const prevStage = existing.estagio
      const updated = await this.clientRepo.update(id, { estagio: newStage })

      await auditService.log('CLIENTE_ESTAGIO_ALTERADO', 'sistema', actor, id, {
        de: prevStage,
        para: newStage,
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao atualizar estagio do cliente.'))
    }
  }

  public async linkProcess(
    id: string,
    processNumber: string,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<NoxClient>> {
    try {
      const existing = await this.clientRepo.getById(id)
      if (!existing) {
        return failResult(new NotFoundError('Cliente', id))
      }

      const cleanProc = processNumber.trim()
      const current = existing.processosVinculados || []
      if (current.includes(cleanProc)) {
        return okResult(existing)
      }

      const updatedList = [...current, cleanProc]
      const updated = await this.clientRepo.update(id, { processosVinculados: updatedList })

      await auditService.log('PROCESSO_VINCULADO_CLIENTE', 'sistema', actor, id, {
        processo: cleanProc,
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao vincular processo ao cliente.'))
    }
  }

  public async unlinkProcess(
    id: string,
    processNumber: string,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<NoxClient>> {
    try {
      const existing = await this.clientRepo.getById(id)
      if (!existing) {
        return failResult(new NotFoundError('Cliente', id))
      }

      const cleanProc = processNumber.trim()
      const current = existing.processosVinculados || []
      const updatedList = current.filter((p) => p !== cleanProc)

      const updated = await this.clientRepo.update(id, { processosVinculados: updatedList })

      await auditService.log('PROCESSO_DESVINCULADO_CLIENTE', 'sistema', actor, id, {
        processo: cleanProc,
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao desvincular processo do cliente.'))
    }
  }

  public async deleteClient(id: string, actor = 'Operador NOX'): Promise<ServiceResult<boolean>> {
    try {
      const existing = await this.clientRepo.getById(id)
      if (!existing) {
        return failResult(new NotFoundError('Cliente', id))
      }

      await this.clientRepo.delete(id)

      await auditService.log('CLIENTE_EXCLUIDO', 'sistema', actor, id, {
        nome: existing.nome,
        clientCode: existing.clientCode,
      })

      return okResult(true)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao excluir cliente.'))
    }
  }

  public subscribe(callback: (action: string, client: NoxClient) => void): () => void {
    return this.clientRepo.subscribe(callback)
  }
}

export const clientService = new ClientService()
