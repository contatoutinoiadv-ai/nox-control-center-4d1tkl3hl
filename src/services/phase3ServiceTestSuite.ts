/**
 * Bateria de Testes Unitarios da Camada de Services e Repositories (Fase 3).
 * Testa contratos, validacoes, categorizacao de erros, maquina de estados e integridade sem travesao.
 */

import { ClientService } from '@/services/clients/ClientService'
import { AppointmentService } from '@/services/appointments/AppointmentService'
import { TaskService } from '@/services/tasks/TaskService'
import { ProductionService } from '@/services/production/ProductionService'
import { ProcessService } from '@/services/processes/ProcessService'
import { IClientRepository } from '@/repositories/contracts/IClientRepository'
import { IAppointmentRepository } from '@/repositories/contracts/IAppointmentRepository'
import { ITaskRepository } from '@/repositories/contracts/ITaskRepository'
import { IProductionRepository } from '@/repositories/contracts/IProductionRepository'
import { IProcessRepository } from '@/repositories/contracts/IProcessRepository'
import { NoxClient, ProductionItem } from '@/types/nox'
import { AgendaEvent, SentinelaTask } from '@/types/sentinela'
import { ProcessoMonitorado, MovimentacaoProcesso } from '@/services/datajudService'
import { ValidationError, NotFoundError, NetworkError } from '@/core/errors/AppErrors'

export interface ServiceUnitTestResult {
  suite: string
  test: string
  status: 'PASS' | 'FAIL'
  error?: string
}

export class Phase3ServiceTestSuite {
  public static async runAll(): Promise<{
    total: number
    passed: number
    failed: number
    results: ServiceUnitTestResult[]
  }> {
    const results: ServiceUnitTestResult[] = []

    const add = (suite: string, test: string, status: 'PASS' | 'FAIL', error?: string) => {
      results.push({ suite, test, status, error })
    }

    // 1. Suite ClientService (Validacao e Regras)
    try {
      const mockClients: NoxClient[] = [
        {
          id: 'cli_01',
          clientCode: 'CLI-2026-001',
          protocolo: 'INT-001',
          nome: 'Jose da Silva',
          cpf: '12345678901',
          origem: 'manual',
          estagio: 'novo',
          demanda: 'civel',
          processosVinculados: ['0000001-00.2026.8.12.0001'],
          docsGerados: [],
          responsavel: 'Higor Utinoi',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const mockClientRepo: IClientRepository = {
        async list() {
          return {
            items: mockClients,
            meta: { page: 1, perPage: 10, totalPages: 1, totalItems: mockClients.length },
          }
        },
        async getAll() {
          return mockClients
        },
        async getById(id: string) {
          return mockClients.find((c) => c.id === id) || null
        },
        async getByCpf(cpf: string) {
          return mockClients.find((c) => c.cpf === cpf) || null
        },
        async getByCode(code: string) {
          return mockClients.find((c) => c.clientCode === code) || null
        },
        async create(c: Partial<NoxClient>) {
          const created = { ...mockClients[0], ...c, id: `cli_${Date.now()}` }
          mockClients.push(created)
          return created
        },
        async update(id: string, updates: Partial<NoxClient>) {
          const item = mockClients.find((c) => c.id === id)
          if (!item) throw new Error('Not found')
          Object.assign(item, updates)
          return item
        },
        async delete(id: string) {
          const idx = mockClients.findIndex((c) => c.id === id)
          if (idx !== -1) mockClients.splice(idx, 1)
          return true
        },
        subscribe() {
          return () => {}
        },
      }

      const clientService = new ClientService(mockClientRepo)

      // Teste 1.1: Criar cliente sem nome deve falhar com ValidationError
      const r1 = await clientService.createClient({ nome: '' })
      if (!r1.success && r1.error instanceof ValidationError) {
        add('ClientService', 'Rejeitar criacao de cliente com nome vazio', 'PASS')
      } else {
        add(
          'ClientService',
          'Rejeitar criacao de cliente com nome vazio',
          'FAIL',
          'Deveria ter retornado ValidationError',
        )
      }

      // Teste 1.2: Criar cliente com CPF duplicado deve falhar
      const r2 = await clientService.createClient({ nome: 'Outro Jose', cpf: '123.456.789-01' })
      if (!r2.success && r2.error instanceof ValidationError) {
        add('ClientService', 'Bloquear criacao de cliente com CPF duplicado', 'PASS')
      } else {
        add(
          'ClientService',
          'Bloquear criacao de cliente com CPF duplicado',
          'FAIL',
          'Permitiu duplicidade de CPF',
        )
      }

      // Teste 1.3: Transicao de estagio Kanban
      const r3 = await clientService.updateStage('cli_01', 'em_atendimento')
      if (r3.success && r3.data?.estagio === 'em_atendimento') {
        add('ClientService', 'Atualizar estagio de cliente com sucesso', 'PASS')
      } else {
        add(
          'ClientService',
          'Atualizar estagio de cliente com sucesso',
          'FAIL',
          'Estagio nao foi alterado',
        )
      }

      // Teste 1.4: Vinculacao de processo ao cliente
      const r4 = await clientService.linkProcess('cli_01', '0000002-00.2026.8.12.0001')
      if (r4.success && r4.data?.processosVinculados?.includes('0000002-00.2026.8.12.0001')) {
        add('ClientService', 'Vincular processo com sucesso ao cliente', 'PASS')
      } else {
        add(
          'ClientService',
          'Vincular processo com sucesso ao cliente',
          'FAIL',
          'Processo nao vinculado',
        )
      }
    } catch (e: any) {
      add('ClientService', 'Execucao da suite de clientes', 'FAIL', e?.message)
    }

    // 2. Suite AppointmentService (Agenda e Preparacao)
    try {
      const mockEvents: AgendaEvent[] = [
        {
          id: 'ev_01',
          title: 'Audiencia de Conciliacao',
          eventType: 'AUDIENCIA',
          startDate: '2026-04-10T14:00:00Z',
          endDate: '2026-04-10T15:00:00Z',
          isAllDay: false,
          isVirtual: false,
          remindersMinutesBefore: [1440, 60],
          processNumber: '0000001-00.2026.8.12.0001',
          responsible: 'Higor Utinoi',
          participants: [],
          status: 'CONFIRMADO',
          preparacaoHabilitada: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const mockAppointmentRepo: IAppointmentRepository = {
        async list() {
          return {
            items: mockEvents,
            meta: { page: 1, perPage: 10, totalPages: 1, totalItems: mockEvents.length },
          }
        },
        async getAll() {
          return mockEvents
        },
        async getById(id: string) {
          return mockEvents.find((e) => e.id === id) || null
        },
        async getByProcessNumber(num: string) {
          return mockEvents.find((e) => e.processNumber === num) || null
        },
        async create(ev: Partial<AgendaEvent>) {
          const item = { ...mockEvents[0], ...ev, id: `ev_${Date.now()}` }
          mockEvents.push(item)
          return item
        },
        async update(id: string, updates: Partial<AgendaEvent>) {
          const item = mockEvents.find((e) => e.id === id)
          if (!item) throw new Error('Not found')
          Object.assign(item, updates)
          return item
        },
        async delete(id: string) {
          const idx = mockEvents.findIndex((e) => e.id === id)
          if (idx !== -1) mockEvents.splice(idx, 1)
          return true
        },
        subscribe() {
          return () => {}
        },
      }

      const appointmentService = new AppointmentService(mockAppointmentRepo)

      // Teste 2.1: Rejeitar criacao de evento sem titulo
      const ev1 = await appointmentService.createAppointment({ title: '', startDate: '2026-04-10' })
      if (!ev1.success && ev1.error instanceof ValidationError) {
        add('AppointmentService', 'Rejeitar evento de agenda sem titulo', 'PASS')
      } else {
        add('AppointmentService', 'Rejeitar evento de agenda sem titulo', 'FAIL')
      }

      // Teste 2.2: Toggle preparacao de audiencia
      const ev2 = await appointmentService.togglePreparacao('ev_01', true)
      if (ev2.success && ev2.data?.preparacaoHabilitada === true) {
        add('AppointmentService', 'Habilitar preparacao de audiencia com sucesso', 'PASS')
      } else {
        add('AppointmentService', 'Habilitar preparacao de audiencia com sucesso', 'FAIL')
      }
    } catch (e: any) {
      add('AppointmentService', 'Execucao da suite de agenda', 'FAIL', e?.message)
    }

    // 3. Suite ProductionService (Esteira e Stress Test)
    try {
      const mockProds: ProductionItem[] = [
        {
          id: 'prod_01',
          clientId: 'cli_01',
          clientName: 'Jose da Silva',
          clientCode: 'CLI-001',
          tituloPeca: 'Peticao Inicial Civel',
          nivel: 1,
          estagio: 'triagem_evidencias',
          responsavel: 'Higor Utinoi',
          triagemEvidencias: {
            essencial: 3,
            util: 1,
            neutro: 0,
            perigoso: 0,
            dispensavel: 0,
            completa: true,
            itensDetalhados: [],
          },
          teseDominante: 'Indenizacao por danos morais',
          motivoTravamento: '',
          dataEntradaEstagioAtual: new Date().toISOString(),
          stressTestAprovado: false,
          stressTestDetalhes: {
            tecnicaJuridica: false,
            coerenciaNarrativa: false,
            humanizacao: false,
          },
          historicoEstagios: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const mockProdRepo: IProductionRepository = {
        async list() {
          return {
            items: mockProds,
            meta: { page: 1, perPage: 10, totalPages: 1, totalItems: mockProds.length },
          }
        },
        async getAll() {
          return mockProds
        },
        async getById(id: string) {
          return mockProds.find((p) => p.id === id) || null
        },
        async getByClientId(cid: string) {
          return mockProds.filter((p) => p.clientId === cid)
        },
        async create(item: Partial<ProductionItem>) {
          const created = { ...mockProds[0], ...item, id: `prod_${Date.now()}` }
          mockProds.push(created)
          return created
        },
        async update(id: string, updates: Partial<ProductionItem>) {
          const item = mockProds.find((p) => p.id === id)
          if (!item) throw new Error('Not found')
          Object.assign(item, updates)
          return item
        },
        async delete(id: string) {
          const idx = mockProds.findIndex((p) => p.id === id)
          if (idx !== -1) mockProds.splice(idx, 1)
          return true
        },
        subscribe() {
          return () => {}
        },
      }

      const prodService = new ProductionService(mockProdRepo)

      // Teste 3.1: Avancar estagio de peca
      const p1 = await prodService.advanceStage('prod_01', 'em_redacao')
      if (p1.success && p1.data?.estagio === 'em_redacao' && p1.data.historicoEstagios?.length) {
        add('ProductionService', 'Avancar peca no fluxo produtivo e manter historico', 'PASS')
      } else {
        add('ProductionService', 'Avancar peca no fluxo produtivo e manter historico', 'FAIL')
      }

      // Teste 3.2: Avaliar stress test
      const p2 = await prodService.evaluateStressTest(
        'prod_01',
        { tecnicaJuridica: true, coerenciaNarrativa: true, humanizacao: true },
        true,
      )
      if (p2.success && p2.data?.stressTestAprovado) {
        add('ProductionService', 'Aprovar stress test de peca juridica', 'PASS')
      } else {
        add('ProductionService', 'Aprovar stress test de peca juridica', 'FAIL')
      }
    } catch (e: any) {
      add('ProductionService', 'Execucao da suite de producao', 'FAIL', e?.message)
    }

    // 4. Suite TaskService (Tarefas e Subtarefas)
    try {
      const mockTasks: SentinelaTask[] = [
        {
          id: 'tsk_01',
          title: 'Contestar Acao',
          description: 'Apresentar contestacao tempestiva',
          status: 'A_FAZER',
          priority: 'ALTA',
          responsible: 'Higor Utinoi',
          collaborators: [],
          dependenciesTaskIds: [],
          estimatedHours: 4,
          internalDueDate: '2026-04-15',
          legalDeadlineDate: '2026-04-20',
          processNumber: '0000001-00.2026.8.12.0001',
          isBlocked: false,
          subtasks: [{ id: 'sub_01', text: 'Redigir preliminares', completed: false }],
          tags: ['Contestacao'],
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const mockTaskRepo: ITaskRepository = {
        async list() {
          return {
            items: mockTasks,
            meta: { page: 1, perPage: 10, totalPages: 1, totalItems: mockTasks.length },
          }
        },
        async getAll() {
          return mockTasks
        },
        async getById(id: string) {
          return mockTasks.find((t) => t.id === id) || null
        },
        async create(t: Partial<SentinelaTask>) {
          const item = { ...mockTasks[0], ...t, id: `tsk_${Date.now()}` }
          mockTasks.push(item)
          return item
        },
        async update(id: string, updates: Partial<SentinelaTask>) {
          const item = mockTasks.find((t) => t.id === id)
          if (!item) throw new Error('Not found')
          Object.assign(item, updates)
          return item
        },
        async delete(id: string) {
          const idx = mockTasks.findIndex((t) => t.id === id)
          if (idx !== -1) mockTasks.splice(idx, 1)
          return true
        },
        subscribe() {
          return () => {}
        },
      }

      const taskService = new TaskService(mockTaskRepo)

      // Teste 4.1: Toggle de subtarefa
      const t1 = await taskService.toggleSubtask('tsk_01', 'sub_01')
      if (t1.success && t1.data?.subtasks?.[0].completed === true) {
        add('TaskService', 'Alternar conclusao de subtarefa com sucesso', 'PASS')
      } else {
        add('TaskService', 'Alternar conclusao de subtarefa com sucesso', 'FAIL')
      }
    } catch (e: any) {
      add('TaskService', 'Execucao da suite de tarefas', 'FAIL', e?.message)
    }

    const passed = results.filter((r) => r.status === 'PASS').length
    const failed = results.filter((r) => r.status === 'FAIL').length

    return {
      total: results.length,
      passed,
      failed,
      results,
    }
  }
}
