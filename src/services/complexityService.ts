/**
 * Módulo de Classificação Automática de Complexidade de Tarefas Jurídicas
 *
 * NOTA DE ARQUITETURA JURÍDICA:
 * Esta tabela e as regras de pontuação são um PONTO DE PARTIDA JURÍDICO objetivo
 * e determinístico, e NÃO uma verdade fixa ou imutável.
 * A reclassificação manual pelo advogado titular/responsável SEMPRE tem precedência
 * absoluta e vence qualquer classificação automática.
 */

import { SentinelaTask } from '@/types/sentinela'
import { dataStore } from '@/services/dataStore'

export type ComplexidadeNivel = 'baixa' | 'media' | 'alta' | 'critica'

export interface ComplexidadeResultado {
  score: number // Pontuação de 0 a 100
  nivel: ComplexidadeNivel
  motivos: string[]
  isManualOverride?: boolean
}

// Sensor de grandes partes adversárias / complexidade de grande porte (mesmo sensor Nível 3 do Oráculo NOX)
export const GRANDES_LITIGANTES_REGEX =
  /(banco|institui[cç][aã]o\s+financeira|itau|bradesco|santander|caixa\s+econ[oô]mica|safra|bb\s|banco\s+do\s+brasil|seguradora|seguros|porto\s+seguro|sulamerica|bradesco\s+auto|tokio\s+marine|telef[oô]nica|claro|tim\s|vivo|magazine\s+luiza|magalu|via\s+varejo|casas\s+bahia|ponto\s+frio|americanas|mercado\s+livre|shopee|amazon|latam|gol\s+linhas|azul\s+linhas|enel|energisa|sabesp|sanepar|cedae)/i

/**
 * Avalia o Nível do Oráculo NOX (1, 2 ou 3) para uma peça ou contexto de produção.
 * Regra: Nível 3 é o padrão absoluto salvo indicação contrária;
 * O sensor de complexidade reclassifica automaticamente pra Nível 3 quando envolve grande litigante.
 */
export function classificarNivelProducao(
  textoOuContexto: string,
  indicacaoUsuario?: 1 | 2 | 3,
): { nivel: 1 | 2 | 3; motivo: string; reclassificadoAutomatico: boolean } {
  const isGrandeLitigante = GRANDES_LITIGANTES_REGEX.test(textoOuContexto)

  if (isGrandeLitigante) {
    return {
      nivel: 3,
      motivo:
        'Sensor de Complexidade ativado: Caso envolve Instituição Financeira, Grande Varejista ou Seguradora (Nível 3 Obrigatório)',
      reclassificadoAutomatico: indicacaoUsuario !== undefined && indicacaoUsuario !== 3,
    }
  }

  if (indicacaoUsuario) {
    return {
      nivel: indicacaoUsuario,
      motivo: `Nível ${indicacaoUsuario} definido manualmente pelo operador`,
      reclassificadoAutomatico: false,
    }
  }

  return {
    nivel: 3,
    motivo: 'Nível 3 (Padrão absoluto do Oráculo NOX)',
    reclassificadoAutomatico: false,
  }
}

/**
 * Calcula a complexidade determinística de uma tarefa jurídica.
 *
 * Nível base pela natureza do processo/tarefa (alinhado ao sistema de Níveis do Oráculo NOX):
 * - baixa: mero expediente: juntada de documento, cumprimento de sentença sem impugnação,
 *          audiência de conciliação simples em JEC, resposta a intimação sem exigência de tese.
 * - media: petição de rito comum sem grande volume probatório, contestação padrão, réplica,
 *          embargos de declaração, recurso inominado em JEC, audiência de instrução sem grande porte.
 * - alta: processo contra instituição financeira, grande varejista ou seguradora,
 *         apelação/recurso ordinário ao TJ/TRT, tutela de urgência/liminar, perícia ou litisconsórcio.
 * - critica: processo criminal com réu preso, recurso especial/extraordinário (STJ/STF),
 *            habeas corpus, ou qualquer tarefa que concorra no mesmo dia com outro prazo fatal já cadastrado.
 *
 * Fatores de ajuste de score DENTRO do nível:
 * estimatedHours alto, subtasks incompletas, priority urgente, legalDeadlineDate próximo, isBlocked/dependenciesTaskIds.
 */
export function calcularComplexidadeTarefa(task: SentinelaTask): ComplexidadeResultado {
  const motivos: string[] = []
  const textContext =
    `${task.title} ${task.description} ${task.tags.join(' ')} ${task.clientName || ''} ${task.processNumber || ''}`.toLowerCase()

  // 1. Identificar Prazos Fatais concorrentes no mesmo dia
  let temPrazoConcorrenteNoMesmoDia = false
  if (task.legalDeadlineDate && dataStore && typeof dataStore.getCommunications === 'function') {
    const todosPrazos = dataStore.getCommunications() || []
    const taskDateOnly = task.legalDeadlineDate.split('T')[0]
    const concorrentes = todosPrazos.filter((c) => {
      const commDate = c.deadlineCalculated?.finalDeadlineDate?.split('T')[0]
      return commDate === taskDateOnly && c.numeroProcesso !== task.processNumber
    })
    if (concorrentes.length > 0) {
      temPrazoConcorrenteNoMesmoDia = true
    }
  }

  // 2. Determinação da Natureza e Nível Base
  let nivel: ComplexidadeNivel = 'media' // fallback padrão equilibrado
  let baseScore = 50

  // 2.1 Critica
  const isCriminalReuPreso =
    textContext.includes('réu preso') ||
    textContext.includes('reu preso') ||
    (textContext.includes('criminal') && textContext.includes('prisão'))
  const isRecursoSuperior =
    textContext.includes('recurso especial') ||
    textContext.includes('resp') ||
    textContext.includes('recurso extraordinário') ||
    textContext.includes('recurso extraordinario') ||
    textContext.includes('stj') ||
    textContext.includes('stf') ||
    textContext.includes('superior tribunal') ||
    textContext.includes('supremo tribunal')
  const isHabeasCorpus = textContext.includes('habeas corpus') || textContext.includes(' hc ')

  if (isCriminalReuPreso || isRecursoSuperior || isHabeasCorpus || temPrazoConcorrenteNoMesmoDia) {
    nivel = 'critica'
    baseScore = 85
    if (isCriminalReuPreso) motivos.push('Processo criminal com réu preso (liberdade em risco)')
    if (isRecursoSuperior) motivos.push('Recurso às instâncias extraordinárias (STJ/STF)')
    if (isHabeasCorpus) motivos.push('Medida constitucional de urgência (Habeas Corpus)')
    if (temPrazoConcorrenteNoMesmoDia) {
      motivos.push('Concorrência temporal: múltiplos prazos fatais no mesmo dia')
    }
  }
  // 2.2 Alta
  else if (
    GRANDES_LITIGANTES_REGEX.test(textContext) ||
    textContext.includes('apelação') ||
    textContext.includes('apelacao') ||
    textContext.includes('recurso ordinário') ||
    textContext.includes('recurso ordinario') ||
    textContext.includes('tutela de urgência') ||
    textContext.includes('tutela de urgencia') ||
    textContext.includes('liminar') ||
    textContext.includes('perícia') ||
    textContext.includes('pericia') ||
    textContext.includes('laudo pericial') ||
    textContext.includes('litisconsórcio') ||
    textContext.includes('litisconsorcio') ||
    textContext.includes('agravo de instrumento')
  ) {
    nivel = 'alta'
    baseScore = 65
    if (GRANDES_LITIGANTES_REGEX.test(textContext)) {
      motivos.push(
        'Parte adversária de grande porte (Instituição Financeira / Seguradora / Varejista)',
      )
    }
    if (
      textContext.includes('apelação') ||
      textContext.includes('apelacao') ||
      textContext.includes('recurso ordinário') ||
      textContext.includes('recurso ordinario')
    ) {
      motivos.push('Recurso de mérito a Tribunal (TJ/TRT)')
    }
    if (
      textContext.includes('tutela de urgência') ||
      textContext.includes('tutela de urgencia') ||
      textContext.includes('liminar')
    ) {
      motivos.push('Tutela provisória de urgência / liminar com risco imediato')
    }
    if (
      textContext.includes('perícia') ||
      textContext.includes('pericia') ||
      textContext.includes('laudo pericial')
    ) {
      motivos.push('Complexidade técnica probatória (Perícia judicial / quesitação)')
    }
    if (textContext.includes('litisconsórcio') || textContext.includes('litisconsorcio')) {
      motivos.push('Pluralidade de partes em litisconsórcio')
    }
  }
  // 2.3 Baixa
  else if (
    textContext.includes('juntada') ||
    textContext.includes('mero expediente') ||
    textContext.includes('cumprimento de sentença sem impugnação') ||
    textContext.includes('cumprimento de sentenca sem impugnacao') ||
    textContext.includes('guia de custas') ||
    textContext.includes('comprovante') ||
    textContext.includes('habilitação') ||
    textContext.includes('habilitacao') ||
    textContext.includes('conciliação simples') ||
    textContext.includes('conciliacao simples') ||
    (textContext.includes('jec') && textContext.includes('conciliação')) ||
    textContext.includes('sem exigência de tese') ||
    textContext.includes('sem exigencia de tese')
  ) {
    nivel = 'baixa'
    baseScore = 20
    motivos.push('Mero expediente processual ou ato ordinatório sem complexidade de tese')
  }
  // 2.4 Media (Rito comum padrão, contestação, réplica, embargos de declaração, recurso inominado JEC)
  else {
    nivel = 'media'
    baseScore = 45
    motivos.push('Petição de rito comum / manifestação de rotina sem litígio extraordinário')
  }

  // 3. Fatores que ajustam o score DENTRO da faixa do nível (sem alterar o nível sozinho)
  let adjustment = 0

  // 3.1 Carga horária estimada
  if (task.estimatedHours > 8) {
    adjustment += 6
    motivos.push(`Carga horária elevada (${task.estimatedHours}h estimadas)`)
  } else if (task.estimatedHours > 4) {
    adjustment += 3
  } else if (task.estimatedHours <= 1) {
    adjustment -= 3
  }

  // 3.2 Subtarefas pendentes
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0
  const uncompletedSubtasks = task.subtasks ? task.subtasks.filter((s) => !s.completed).length : 0
  if (uncompletedSubtasks >= 4) {
    adjustment += 4
    motivos.push(`${uncompletedSubtasks} subtarefas pendentes de execução`)
  }

  // 3.3 Prioridade
  if (task.priority === 'URGENTE') {
    adjustment += 5
    motivos.push('Prioridade classificada como Urgente')
  } else if (task.priority === 'BAIXA') {
    adjustment -= 4
  }

  // 3.4 Proximidade do Prazo Fatal
  if (task.legalDeadlineDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadline = new Date(task.legalDeadlineDate)
    deadline.setHours(0, 0, 0, 0)
    const diffDays = Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 1 && diffDays >= 0) {
      adjustment += 5
      motivos.push('Vencimento fatal iminente (hoje ou amanhã)')
    } else if (diffDays <= 3 && diffDays > 1) {
      adjustment += 3
      motivos.push(`Prazo fatal em ${diffDays} dias`)
    }
  }

  // 3.5 Bloqueio ou Dependências
  if (task.isBlocked) {
    adjustment += 4
    motivos.push(`Tarefa bloqueada: ${task.blockReason || 'Aguardando ação externa'}`)
  }
  if (task.dependenciesTaskIds && task.dependenciesTaskIds.length > 0) {
    adjustment += 3
    motivos.push(`Depende de ${task.dependenciesTaskIds.length} outra(s) tarefa(s)`)
  }

  // Faixas limites por nível para garantir coerência estrita
  let minScore = 0
  let maxScore = 100
  if (nivel === 'baixa') {
    minScore = 5
    maxScore = 35
  } else if (nivel === 'media') {
    minScore = 36
    maxScore = 60
  } else if (nivel === 'alta') {
    minScore = 61
    maxScore = 80
  } else if (nivel === 'critica') {
    minScore = 81
    maxScore = 100
  }

  const finalScore = Math.min(maxScore, Math.max(minScore, Math.round(baseScore + adjustment)))

  return {
    score: finalScore,
    nivel,
    motivos,
  }
}

// Cache em memória de complexidades calculadas por id de tarefa
const complexidadeCache = new Map<string, ComplexidadeResultado>()

// Inicia o listener de dataStore para garantir atualização contínua e autônoma
let isSubscribed = false

export function initComplexityAutoClassifier(): void {
  if (isSubscribed) return

  const runClassifier = () => {
    if (!dataStore || typeof dataStore.getTasks !== 'function') return
    const tasks = dataStore.getTasks() || []
    for (const task of tasks) {
      const resultado = calcularComplexidadeTarefa(task)
      complexidadeCache.set(task.id, resultado)
    }
  }

  // Se dataStore já estiver disponível e inicializado, subscreve imediatamente
  if (dataStore && typeof dataStore.subscribe === 'function') {
    isSubscribed = true
    runClassifier()
    dataStore.subscribe(() => {
      runClassifier()
    })
  } else {
    // Se dataStore ainda estiver em inicialização (circular dependency), adia com microtask/setTimeout
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        if (dataStore && typeof dataStore.subscribe === 'function' && !isSubscribed) {
          isSubscribed = true
          runClassifier()
          dataStore.subscribe(() => {
            runClassifier()
          })
        }
      })
    } else {
      setTimeout(() => {
        if (dataStore && typeof dataStore.subscribe === 'function' && !isSubscribed) {
          isSubscribed = true
          runClassifier()
          dataStore.subscribe(() => {
            runClassifier()
          })
        }
      }, 0)
    }
  }
}

/**
 * Recupera o resultado de complexidade de uma tarefa (do cache ou calculando na hora).
 */
export function getComplexidadeTarefa(task: SentinelaTask): ComplexidadeResultado {
  if (!complexidadeCache.has(task.id)) {
    const resultado = calcularComplexidadeTarefa(task)
    complexidadeCache.set(task.id, resultado)
    return resultado
  }
  return complexidadeCache.get(task.id)!
}

// Inicializa no import
initComplexityAutoClassifier()
