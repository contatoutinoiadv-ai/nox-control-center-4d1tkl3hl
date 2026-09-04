/**
 * Servico de dominio de Producao Juridica.
 * Concentra esteira de pecas, 5 camadas de triagem de evidencias, stress-test e auditoria.
 */

import {
  IProductionRepository,
  ProductionFilterOptions,
} from '@/repositories/contracts/IProductionRepository'
import { pocketBaseProductionRepository } from '@/repositories/pocketbase/PocketBaseProductionRepository'
import {
  ProductionItem,
  ProductionStage,
  TriagemEvidenciasCamadas,
  StressTestValidation,
  ProductionStageHistory,
} from '@/types/nox'
import { ServiceResult, okResult, failResult } from '@/core/results/ServiceResult'
import { ValidationError, NotFoundError, normalizeError } from '@/core/errors/AppErrors'
import { auditService } from '../audit/AuditService'

export class ProductionService {
  constructor(private readonly prodRepo: IProductionRepository = pocketBaseProductionRepository) {}

  public async listProductionItems(
    options?: ProductionFilterOptions,
  ): Promise<ServiceResult<ProductionItem[]>> {
    try {
      const result = await this.prodRepo.list(options)
      return okResult(result.items, result.meta)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao listar itens de producao.'))
    }
  }

  public async getAllProductionItems(): Promise<ProductionItem[]> {
    return this.prodRepo.getAll()
  }

  public async getProductionItemById(id: string): Promise<ServiceResult<ProductionItem>> {
    try {
      if (!id) return failResult(new ValidationError('ID nao informado.'))
      const item = await this.prodRepo.getById(id)
      if (!item) return failResult(new NotFoundError('Item de producao', id))
      return okResult(item)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao buscar item de producao.'))
    }
  }

  public async getProductionItemsByClientId(clientId: string): Promise<ProductionItem[]> {
    return this.prodRepo.getByClientId(clientId)
  }

  public async createProductionItem(
    item: Partial<ProductionItem>,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<ProductionItem>> {
    try {
      if (!item.tituloPeca || !item.tituloPeca.trim()) {
        return failResult(new ValidationError('Titulo da peca e obrigatorio.'))
      }
      if (!item.clientId) {
        return failResult(new ValidationError('Client ID e obrigatorio para criar peca.'))
      }

      const stage = item.estagio || 'triagem_evidencias'
      const initialHistory: ProductionStageHistory = {
        stage,
        enteredAt: new Date().toISOString(),
        actor,
      }

      const created = await this.prodRepo.create({
        ...item,
        nivel: item.nivel || 1,
        estagio: stage,
        responsavel: item.responsavel || 'Higor Utinoi de Oliveira',
        dataEntradaEstagioAtual: new Date().toISOString(),
        historicoEstagios: [initialHistory],
      })

      await auditService.log('PRODUCAO_PECA_CRIADA', 'sistema', actor, created.id, {
        titulo: created.tituloPeca,
        cliente: created.clientName,
        nivel: created.nivel,
      })

      return okResult(created)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao cadastrar peca de producao.'))
    }
  }

  public async updateProductionItem(
    id: string,
    updates: Partial<ProductionItem>,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<ProductionItem>> {
    try {
      const existing = await this.prodRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Item de producao', id))

      const updated = await this.prodRepo.update(id, updates)

      await auditService.log('PRODUCAO_PECA_ATUALIZADA', 'sistema', actor, id, {
        campos: Object.keys(updates),
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao atualizar peca.'))
    }
  }

  public async advanceStage(
    id: string,
    nextStage: ProductionStage,
    motivoTravamento?: string,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<ProductionItem>> {
    try {
      const existing = await this.prodRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Item de producao', id))

      const prevStage = existing.estagio
      const newHistoryEntry: ProductionStageHistory = {
        stage: nextStage,
        enteredAt: new Date().toISOString(),
        actor,
        justification: motivoTravamento,
      }
      const novoHistorico = [...(existing.historicoEstagios || []), newHistoryEntry]

      const updated = await this.prodRepo.update(id, {
        estagio: nextStage,
        motivoTravamento: motivoTravamento || '',
        dataEntradaEstagioAtual: new Date().toISOString(),
        historicoEstagios: novoHistorico,
      })

      await auditService.log('PRODUCAO_ESTAGIO_AVANCADO', 'sistema', actor, id, {
        titulo: existing.tituloPeca,
        de: prevStage,
        para: nextStage,
        motivo: motivoTravamento,
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao avancar estagio da peca.'))
    }
  }

  public async updateTriagemEvidencias(
    id: string,
    triagem: TriagemEvidenciasCamadas,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<ProductionItem>> {
    try {
      const existing = await this.prodRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Item de producao', id))

      const updated = await this.prodRepo.update(id, { triagemEvidencias: triagem })

      await auditService.log('PRODUCAO_EVIDENCIAS_ATUALIZADAS', 'sistema', actor, id, {
        essencial: triagem.essencial,
        util: triagem.util,
        perigoso: triagem.perigoso,
        completa: triagem.completa,
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao atualizar triagem de evidencias.'))
    }
  }

  public async evaluateStressTest(
    id: string,
    detalhes: StressTestValidation,
    aprovado: boolean,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<ProductionItem>> {
    try {
      const existing = await this.prodRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Item de producao', id))

      const updated = await this.prodRepo.update(id, {
        stressTestDetalhes: detalhes,
        stressTestAprovado: aprovado,
      })

      await auditService.log('PRODUCAO_STRESS_TEST_AVALIADO', 'sistema', actor, id, {
        aprovado,
        tecnicaJuridica: detalhes.tecnicaJuridica,
        coerenciaNarrativa: detalhes.coerenciaNarrativa,
        humanizacao: detalhes.humanizacao,
      })

      return okResult(updated)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao registrar stress test.'))
    }
  }

  public async deleteProductionItem(
    id: string,
    actor = 'Operador NOX',
  ): Promise<ServiceResult<boolean>> {
    try {
      const existing = await this.prodRepo.getById(id)
      if (!existing) return failResult(new NotFoundError('Item de producao', id))

      await this.prodRepo.delete(id)

      await auditService.log('PRODUCAO_PECA_EXCLUIDA', 'sistema', actor, id, {
        titulo: existing.tituloPeca,
      })

      return okResult(true)
    } catch (err: unknown) {
      return failResult(normalizeError(err, 'Falha ao excluir peca.'))
    }
  }

  public subscribe(callback: (action: string, record: ProductionItem) => void): () => void {
    return this.prodRepo.subscribe(callback)
  }
}

export const productionService = new ProductionService()
