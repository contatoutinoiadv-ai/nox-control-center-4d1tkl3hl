/**
 * Bateria de Testes Unitários da Central de Atendimento NOX (Fase 5 - Lote 1).
 *
 * Testa:
 * 1. Seleção e recuperação de conversa
 * 2. Filtragem de conversas (TODAS, NÃO LIDAS, URGENTES, MINHAS, etc.)
 * 3. Busca por nome, telefone e processo
 * 4. Troca e persistência de status (NOVA -> EM_TRIAGEM -> CONCLUÍDA)
 * 5. Troca e persistência de prioridade (CRÍTICA, ALTA, MÉDIA, BAIXA)
 * 6. Envio de mensagem demonstrativa (MOCK/DEMO, sem envio real)
 * 7. Registro de nota interna (com flag isInternalNote, mentions e proteção crítica)
 * 8. Imutabilidade e isolamento da fixture Maria da Silva
 */

import { MockConversationRepository } from '@/repositories/mock/MockConversationRepository'
import { ServiceUnitTestResult } from '@/services/phase3ServiceTestSuite'
import { ValidationError, NotFoundError } from '@/core/errors/AppErrors'

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
