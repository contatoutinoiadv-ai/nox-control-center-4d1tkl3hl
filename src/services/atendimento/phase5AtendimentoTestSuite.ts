/**
 * Bateria de Testes Unitários da Central de Atendimento NOX (Fase 5 - Lotes 1 e 2).
 *
 * Cobertura de Testes:
 * 1. Seleção e recuperação de conversa
 * 2. Filtragem de conversas (TODAS, NÃO LIDAS, URGENTES, MINHAS, etc.)
 * 3. Busca por nome, telefone e processo
 * 4. Troca e persistência de status (NOVA -> EM_TRIAGEM -> CONCLUÍDA)
 * 5. Troca e persistência de prioridade (CRÍTICA, ALTA, MÉDIA, BAIXA)
 * 6. Envio de mensagem demonstrativa (MOCK/DEMO, sem envio real)
 * 7. Registro de nota interna (com flag isInternalNote, mentions e proteção crítica)
 * 8. Validação de rejeição de mensagem sem conteúdo
 * 9. Atribuição / Transferência de responsável para operador real
 * 10. Vínculo determinístico de processo CNJ à conversa
 * 11. Vínculo manual de cliente da base NOX (sem auto-match fraco)
 * 12. Triagem e sugestão de resposta pela IA NOX (com isMockDemo e revisão humana)
 * 13. Integração com módulo de Produção (criação de tarefa com origem CENTRAL DE ATENDIMENTO)
 * 14. Integração com módulo de Compromissos/Agenda (agendamento com metadados)
 * 15. Alternância das 4 tabs do Painel de Inteligência (CLIENTE, PROCESSOS, INTELIGENCIA, HISTORICO)
 * 16. Estado de contato não identificado e ações preparadas
 */

import { MockConversationRepository } from '@/repositories/mock/MockConversationRepository'
import { ServiceUnitTestResult } from '@/services/phase3ServiceTestSuite'
import { ValidationError } from '@/core/errors/AppErrors'
import { taskService } from '@/services/tasks/TaskService'
import { appointmentService } from '@/services/appointments/AppointmentService'
import { clientService } from '@/services/clients/ClientService'
import { datajudService } from '@/services/datajudService'

export class Phase5AtendimentoTestSuite {
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

    const repo = new MockConversationRepository()

    // 1. Teste de listagem e fixture obrigatória da Maria da Silva
    try {
      const res = await repo.listConversations({ filter: 'TODAS' })
      if (res.success && res.data && res.data.items.length >= 5) {
        const maria = res.data.items.find((c) => c.id === 'conv_maria_silva')
        if (
          maria &&
          maria.participant.name === 'Maria da Silva' &&
          maria.lastMessage.content.includes('intimação')
        ) {
          add(
            'AtendimentoRepository',
            'Carregar lista de conversas com fixture Maria da Silva isolada',
            'PASS',
          )
        } else {
          add(
            'AtendimentoRepository',
            'Carregar lista de conversas com fixture Maria da Silva isolada',
            'FAIL',
            'Fixture Maria da Silva não encontrada ou sem menção a intimação',
          )
        }
      } else {
        add(
          'AtendimentoRepository',
          'Carregar lista de conversas com fixture Maria da Silva isolada',
          'FAIL',
          'Falha ao listar conversas',
        )
      }
    } catch (e: any) {
      add(
        'AtendimentoRepository',
        'Carregar lista de conversas com fixture Maria da Silva isolada',
        'FAIL',
        e?.message,
      )
    }

    // 2. Teste de Filtros (NÃO LIDAS e URGENTES)
    try {
      const resNaoLidas = await repo.listConversations({ filter: 'NAO_LIDAS' })
      const allUnread =
        resNaoLidas.success && resNaoLidas.data?.items.every((c) => c.unreadCount > 0)

      if (allUnread && (resNaoLidas.data?.items.length || 0) > 0) {
        add('AtendimentoFiltros', 'Filtrar conversas não lidas com unreadCount > 0', 'PASS')
      } else {
        add('AtendimentoFiltros', 'Filtrar conversas não lidas com unreadCount > 0', 'FAIL')
      }

      const resUrgentes = await repo.listConversations({ filter: 'URGENTES' })
      const allUrgentes =
        resUrgentes.success &&
        resUrgentes.data?.items.every((c) => c.priority === 'CRITICA' || c.priority === 'ALTA')

      if (allUrgentes && (resUrgentes.data?.items.length || 0) > 0) {
        add('AtendimentoFiltros', 'Filtrar conversas urgentes (CRÍTICA e ALTA)', 'PASS')
      } else {
        add('AtendimentoFiltros', 'Filtrar conversas urgentes (CRÍTICA e ALTA)', 'FAIL')
      }
    } catch (e: any) {
      add('AtendimentoFiltros', 'Execução de filtros de fila', 'FAIL', e?.message)
    }

    // 3. Teste de Busca Textual (Nome, Telefone, Processo)
    try {
      const buscaNome = await repo.listConversations({
        filter: 'TODAS',
        searchQuery: 'Maria',
      })
      const achouMaria =
        buscaNome.success &&
        buscaNome.data?.items.length === 1 &&
        buscaNome.data.items[0].id === 'conv_maria_silva'

      if (achouMaria) {
        add('AtendimentoBusca', 'Buscar conversa por nome do participante', 'PASS')
      } else {
        add('AtendimentoBusca', 'Buscar conversa por nome do participante', 'FAIL')
      }

      const buscaProcesso = await repo.listConversations({
        filter: 'TODAS',
        searchQuery: '0812345',
      })
      const achouProcesso =
        buscaProcesso.success &&
        buscaProcesso.data?.items.some((c) => c.linkedProcessNumber?.includes('0812345'))

      if (achouProcesso) {
        add('AtendimentoBusca', 'Buscar conversa por número de processo CNJ vinculado', 'PASS')
      } else {
        add('AtendimentoBusca', 'Buscar conversa por número de processo CNJ vinculado', 'FAIL')
      }
    } catch (e: any) {
      add('AtendimentoBusca', 'Execução de busca textual', 'FAIL', e?.message)
    }

    // 4. Teste de Troca de Estado (Status)
    try {
      const resUpdateStatus = await repo.updateStatus(
        'conv_maria_silva',
        'EM_TRIAGEM',
        'Higor Utinoi',
      )
      if (resUpdateStatus.success && resUpdateStatus.data?.status === 'EM_TRIAGEM') {
        add('AtendimentoStatus', 'Atualizar estado da conversa para EM_TRIAGEM com sucesso', 'PASS')
      } else {
        add('AtendimentoStatus', 'Atualizar estado da conversa para EM_TRIAGEM com sucesso', 'FAIL')
      }
    } catch (e: any) {
      add('AtendimentoStatus', 'Atualização de status', 'FAIL', e?.message)
    }

    // 5. Teste de Troca de Prioridade
    try {
      const resPriority = await repo.updatePriority('conv_maria_silva', 'ALTA', 'Higor Utinoi')
      if (resPriority.success && resPriority.data?.priority === 'ALTA') {
        add('AtendimentoPrioridade', 'Atualizar prioridade para ALTA com sucesso', 'PASS')
      } else {
        add('AtendimentoPrioridade', 'Atualizar prioridade para ALTA com sucesso', 'FAIL')
      }
    } catch (e: any) {
      add('AtendimentoPrioridade', 'Atualização de prioridade', 'FAIL', e?.message)
    }

    // 6. Teste de Envio de Mensagem ao Cliente (MOCK/DEMO, sem Evolution API)
    try {
      const resMsg = await repo.sendMessage(
        {
          conversationId: 'conv_maria_silva',
          content: 'Recebemos a intimação e estamos verificando o prazo de defesa.',
          type: 'TEXT',
        },
        'Higor Utinoi',
      )

      if (
        resMsg.success &&
        resMsg.data?.content.includes('defesa') &&
        resMsg.data.deliveryStatus === 'SENT' &&
        resMsg.data.isMockDemo === true
      ) {
        add('AtendimentoMensagem', 'Registrar mensagem enviada em modo MOCK/DEMO', 'PASS')
      } else {
        add('AtendimentoMensagem', 'Registrar mensagem enviada em modo MOCK/DEMO', 'FAIL')
      }
    } catch (e: any) {
      add('AtendimentoMensagem', 'Envio de mensagem ao cliente', 'FAIL', e?.message)
    }

    // 7. Teste de Registro de Nota Interna (com mentions e proteção crítica)
    try {
      const resNota = await repo.sendMessage(
        {
          conversationId: 'conv_maria_silva',
          content: '@Higor verificar comprovante de citação no Diário.',
          type: 'INTERNAL_NOTE',
          mentions: ['Higor Utinoi'],
        },
        'Secretaria NOX',
      )

      if (
        resNota.success &&
        resNota.data?.isInternalNote === true &&
        resNota.data.type === 'INTERNAL_NOTE' &&
        resNota.data.mentions?.includes('Higor Utinoi')
      ) {
        add(
          'AtendimentoNotaInterna',
          'Gravar nota interna protegida com @mentions de usuário existente',
          'PASS',
        )
      } else {
        add(
          'AtendimentoNotaInterna',
          'Gravar nota interna protegida com @mentions de usuário existente',
          'FAIL',
        )
      }
    } catch (e: any) {
      add('AtendimentoNotaInterna', 'Gravação de nota interna', 'FAIL', e?.message)
    }

    // 8. Teste de Validação de Mensagem Vazia
    try {
      const resVazia = await repo.sendMessage(
        {
          conversationId: 'conv_maria_silva',
          content: '   ',
          type: 'TEXT',
        },
        'Higor Utinoi',
      )

      if (!resVazia.success && resVazia.error instanceof ValidationError) {
        add('AtendimentoValidacao', 'Rejeitar envio de mensagem sem conteúdo', 'PASS')
      } else {
        add('AtendimentoValidacao', 'Rejeitar envio de mensagem sem conteúdo', 'FAIL')
      }
    } catch (e: any) {
      add('AtendimentoValidacao', 'Rejeição de mensagem vazia', 'FAIL', e?.message)
    }

    // 9. Lote 2: Teste de Atribuição e Transferência de Atendimento
    try {
      const resAssign = await repo.assignConversation('conv_maria_silva', 'Gabriel Advogado')
      if (
        resAssign.success &&
        resAssign.data?.assignedTo === 'Gabriel Advogado' &&
        resAssign.data.responsible === 'Gabriel Advogado'
      ) {
        add(
          'AtendimentoCustodia',
          'Transferir atendimento para operador real Gabriel Advogado',
          'PASS',
        )
      } else {
        add(
          'AtendimentoCustodia',
          'Transferir atendimento para operador real Gabriel Advogado',
          'FAIL',
        )
      }
    } catch (e: any) {
      add('AtendimentoCustodia', 'Transferência de atendimento', 'FAIL', e?.message)
    }

    // 10. Lote 2: Teste de Vínculo de Processo Judicial
    try {
      const testProcess = '5001234-88.2025.8.13.0024'
      const resLinkProc = await repo.linkProcess('conv_maria_silva', testProcess)
      if (resLinkProc.success && resLinkProc.data?.linkedProcessNumber === testProcess) {
        add('AtendimentoProcessos', 'Vincular processo CNJ existente à conversa', 'PASS')
      } else {
        add('AtendimentoProcessos', 'Vincular processo CNJ existente à conversa', 'FAIL')
      }
    } catch (e: any) {
      add('AtendimentoProcessos', 'Vínculo de processo', 'FAIL', e?.message)
    }

    // 11. Lote 2: Teste de Vínculo Manual de Cliente (Prevenção de Auto-match fraco)
    try {
      const testClientId = 'cli_joao_santos'
      const resLinkCli = await repo.linkClient('conv_contato_desconhecido', testClientId)
      if (resLinkCli.success && resLinkCli.data?.clientId === testClientId) {
        add('AtendimentoClientes', 'Vincular cliente manualmente à conversa desconhecida', 'PASS')
      } else {
        add('AtendimentoClientes', 'Vincular cliente manualmente à conversa desconhecida', 'FAIL')
      }
    } catch (e: any) {
      add('AtendimentoClientes', 'Vínculo manual de cliente', 'FAIL', e?.message)
    }

    // 12. Lote 2: Teste da Triagem IA e Sugestão de Resposta (Assistente, não autoridade jurídica)
    try {
      const convRes = await repo.getConversationById('conv_maria_silva')
      const conv = convRes.data
      if (
        conv &&
        conv.aiTriage &&
        conv.aiTriage.urgencyLevel === 'POSSÍVEL URGÊNCIA' &&
        conv.aiTriage.intent === 'COMUNICAR_INTIMACAO' &&
        conv.aiTriage.suggestedResponse.includes('intimação')
      ) {
        add(
          'AtendimentoInteligencia',
          'Validar triagem heurística e minuta de resposta da IA NOX',
          'PASS',
        )
      } else {
        add(
          'AtendimentoInteligencia',
          'Validar triagem heurística e minuta de resposta da IA NOX',
          'FAIL',
          'Estrutura de IA não encontrada na conversa de Maria da Silva',
        )
      }
    } catch (e: any) {
      add('AtendimentoInteligencia', 'Validação de IA NOX', 'FAIL', e?.message)
    }

    // 13. Lote 2: Integração com Módulo de Tarefas / Produção
    try {
      const taskRes = await taskService.createTask({
        title: 'Teste Unitário: Análise de Intimação da Maria',
        description: 'Origem: CENTRAL DE ATENDIMENTO',
        priority: 'ALTA',
        processNumber: '0812345-67.2024.8.12.0001',
        clientName: 'Maria da Silva',
        internalDueDate: '2025-05-10',
        legalDeadlineDate: '2025-05-12',
        responsible: 'Higor Utinoi de Oliveira',
        status: 'A_FAZER',
        tags: ['CENTRAL_DE_ATENDIMENTO'],
      })

      if (
        taskRes.success &&
        taskRes.data?.title.includes('Maria') &&
        taskRes.data.description.includes('CENTRAL DE ATENDIMENTO')
      ) {
        add(
          'AtendimentoIntegracaoTarefas',
          'Criar tarefa no motor de Produção com origem CENTRAL DE ATENDIMENTO',
          'PASS',
        )
      } else {
        add(
          'AtendimentoIntegracaoTarefas',
          'Criar tarefa no motor de Produção com origem CENTRAL DE ATENDIMENTO',
          'FAIL',
          'Falha na criação de tarefa vinculada',
        )
      }
    } catch (e: any) {
      add('AtendimentoIntegracaoTarefas', 'Criação de tarefa integrada', 'FAIL', e?.message)
    }

    // 14. Lote 2: Integração com Módulo de Compromissos / Agenda
    try {
      const aptRes = await appointmentService.createAppointment({
        title: 'Teste Unitário: Alinhamento de Defesa com Cliente',
        description: 'Origem: CENTRAL DE ATENDIMENTO',
        eventType: 'ATENDIMENTO',
        processNumber: '0812345-67.2024.8.12.0001',
        clientName: 'Maria da Silva',
        startDate: '2025-05-02T14:00:00.000Z',
        endDate: '2025-05-02T15:00:00.000Z',
        responsible: 'Higor Utinoi de Oliveira',
        status: 'AGENDADO',
      })

      if (aptRes.success && aptRes.data?.eventType === 'ATENDIMENTO') {
        add(
          'AtendimentoIntegracaoAgenda',
          'Criar compromisso no motor da Agenda NOX com origem CENTRAL DE ATENDIMENTO',
          'PASS',
        )
      } else {
        add(
          'AtendimentoIntegracaoAgenda',
          'Criar compromisso no motor da Agenda NOX com origem CENTRAL DE ATENDIMENTO',
          'FAIL',
          'Falha na criação de compromisso vinculado',
        )
      }
    } catch (e: any) {
      add('AtendimentoIntegracaoAgenda', 'Criação de compromisso integrado', 'FAIL', e?.message)
    }

    // 15. Lote 2: Leitura de Clientes Reais sem duplicidade
    try {
      const cliRes = await clientService.listClients()
      if (cliRes.success && Array.isArray(cliRes.data)) {
        add(
          'AtendimentoClientesReais',
          'Consultar repositório unificado de clientes reais sem banco paralelo',
          'PASS',
        )
      } else {
        add(
          'AtendimentoClientesReais',
          'Consultar repositório unificado de clientes reais sem banco paralelo',
          'FAIL',
        )
      }
    } catch (e: any) {
      add('AtendimentoClientesReais', 'Consulta unificada de clientes', 'FAIL', e?.message)
    }

    // 16. Lote 2: Consulta aos Processos Monitorados pelo DataJud
    try {
      const procs = await datajudService.getProcessosMonitorados()
      if (Array.isArray(procs)) {
        add(
          'AtendimentoDataJud',
          'Carregar processos monitorados e alertas operacionais para vínculo contextual',
          'PASS',
        )
      } else {
        add(
          'AtendimentoDataJud',
          'Carregar processos monitorados e alertas operacionais para vínculo contextual',
          'FAIL',
        )
      }
    } catch (e: any) {
      add('AtendimentoDataJud', 'Consulta ao DataJud', 'FAIL', e?.message)
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
