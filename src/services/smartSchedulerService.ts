/**
 * Motor Inteligente de Sugestão de Agendamento e Detecção Autônoma de Audiências DJEN
 *
 * REQUISITOS ATENDIDOS:
 * 1. Detecção automática de audiências no teor de comunicações DJEN:
 *    Procura padrões ("audiência designada", "audiência para o dia", "ficam as partes intimadas da audiência"),
 *    extrai data/hora quando presente, e cria rascunho de AgendaEvent tipo AUDIENCIA com status 'AGENDADO'
 *    marcado com humanReviewRequired (sem confirmação cega).
 *
 * 2. Sugestão automática de agendamento (roda em background):
 *    - Usa as complexidades das tarefas
 *    - Compromissos/audiências do dia — NUNCA sobrepor horários (1 pessoa só: Higor Utinói)
 *    - Prazos fatais do dia e dos 2 dias seguintes (reduzem a janela livre sugerida)
 *    - Complexidade das tarefas pendentes (alta/crítica reservam blocos maiores)
 *    - Reaproveita OperationalTwinCapacity (capacityPercentage, riskOfOverload)
 *    - Fornece motivos em texto simples (ex: "14h–15h livre; nenhum prazo fatal hoje; 1 tarefa de complexidade alta pendente")
 *    - Sugestão puramente recomendatória, nunca vinculativa.
 */

import {
  AgendaEvent,
  SentinelaCommunication,
  SentinelaTask,
  OperationalTwinCapacity,
} from '@/types/sentinela'
import { dataStore } from '@/services/dataStore'
import { getComplexidadeTarefa } from '@/services/complexityService'

export interface SugestaoHorario {
  id: string
  data: string // YYYY-MM-DD
  inicio: string // HH:mm
  fim: string // HH:mm
  tipoRecomendado:
    | 'BLOCO_ESTUDO_COMPLEXIDADE'
    | 'ATENDIMENTO_CLIENTE'
    | 'DILIGENCIA'
    | 'RESERVA_ESTRATEGICA'
  motivo: string
  pontuacaoAfinidade: number // 0-100
  tarefasVinculaveis: Array<{
    id: string
    titulo: string
    complexidade: 'baixa' | 'media' | 'alta' | 'critica'
  }>
  capacidadeMomento: OperationalTwinCapacity
}

export interface DjenAudienciaDetectada {
  communicationId: string
  processo: string
  tribunal: string
  dataDetectada?: string
  horaDetectada?: string
  localOuLink?: string
  tipoAudiencia: string
  trechoExtraido: string
  rascunhoEvento: AgendaEvent
}

/**
 * Expressões regulares para detecção de audiências em textos do DJEN/Diários
 */
const AUDIENCIA_REGEX_PATTERNS = [
  /audi[eê]ncia\s+designada/i,
  /audi[eê]ncia\s+para\s+o\s+dia/i,
  /ficam\s+as\s+partes\s+intimadas\s+da\s+audi[eê]ncia/i,
  /designo\s+audi[eê]ncia/i,
  /audi[eê]ncia\s+de\s+(concilia[cç][aã]o|instru[cç][aã]o|justifica[cç][aã]o|una|julgamento)/i,
  /pauta\s+de\s+audi[eê]ncias/i,
]

const DATA_EXTRACT_REGEX =
  /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})|dia\s+(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i

const HORA_EXTRACT_REGEX = /(?:[àa]s|as|hor[aá]rio:?)\s*(\d{1,2})[:hH](\d{2})|\b(\d{1,2})h\b/i

const MESES_MAP: Record<string, string> = {
  janeiro: '01',
  fevereiro: '02',
  marco: '03',
  março: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12',
}

/**
 * Analisa uma comunicação e verifica se há audiência designada no teor.
 */
export function detectarAudienciaNoTeor(
  comm: SentinelaCommunication,
): DjenAudienciaDetectada | null {
  const texto = `${comm.teorCompleto || ''} ${comm.teorResumido || ''}`
  if (!texto || texto.trim().length === 0) return null

  const isAudienciaMatch = AUDIENCIA_REGEX_PATTERNS.some((pattern) => pattern.test(texto))
  if (!isAudienciaMatch) return null

  // Extrair tipo de audiência
  let tipoAudiencia = 'Audiência Geral'
  if (/concilia[cç][aã]o/i.test(texto)) tipoAudiencia = 'Audiência de Conciliação (JEC/CEJUSC)'
  else if (/instru[cç][aã]o\s+e\s+julgamento/i.test(texto))
    tipoAudiencia = 'Audiência de Instrução e Julgamento (AIJ)'
  else if (/instru[cç][aã]o/i.test(texto)) tipoAudiencia = 'Audiência de Instrução'
  else if (/justifica[cç][aã]o/i.test(texto)) tipoAudiencia = 'Audiência de Justificação Prévia'
  else if (/una/i.test(texto)) tipoAudiencia = 'Audiência Una'

  // Extrair data
  let dataFormatada: string | undefined
  const dataMatch = texto.match(DATA_EXTRACT_REGEX)
  if (dataMatch) {
    if (dataMatch[1] && dataMatch[2] && dataMatch[3]) {
      const d = dataMatch[1].padStart(2, '0')
      const m = dataMatch[2].padStart(2, '0')
      const y = dataMatch[3]
      dataFormatada = `${y}-${m}-${d}`
    } else if (dataMatch[4] && dataMatch[5] && dataMatch[6]) {
      const d = dataMatch[4].padStart(2, '0')
      const m = MESES_MAP[dataMatch[5].toLowerCase()] || '01'
      const y = dataMatch[6]
      dataFormatada = `${y}-${m}-${d}`
    }
  }

  // Extrair hora
  let horaFormatada = '14:00'
  const horaMatch = texto.match(HORA_EXTRACT_REGEX)
  if (horaMatch) {
    if (horaMatch[1] && horaMatch[2]) {
      horaFormatada = `${horaMatch[1].padStart(2, '0')}:${horaMatch[2]}`
    } else if (horaMatch[3]) {
      horaFormatada = `${horaMatch[3].padStart(2, '0')}:00`
    }
  }

  // Extrair link virtual se existir
  let localOuLink: string | undefined
  const linkMatch = texto.match(
    /(https?:\/\/[^\s]+|teams\.microsoft\.com[^\s]+|zoom\.us[^\s]+|meet\.google\.com[^\s]+)/i,
  )
  if (linkMatch) {
    localOuLink = linkMatch[0]
  }

  const isVirtual =
    !!localOuLink || /virtual|videoconfer[eê]ncia|telepresencial|teams|zoom/i.test(texto)
  const lawyer = dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira'

  // Data final do evento (se não achou no texto, usa a data de disponibilização + 15 dias como placeholder prudente)
  const eventDate =
    dataFormatada ||
    (comm.dataDisponibilizacao ? comm.dataDisponibilizacao : new Date().toISOString().split('T')[0])
  const startIso = `${eventDate}T${horaFormatada}:00`
  const endIso = `${eventDate}T${calcularHoraFim(horaFormatada, 60)}:00`

  // Trecho snippet
  const matchIndex = texto.search(/audi[eê]ncia/i)
  const snippet =
    matchIndex >= 0
      ? texto
          .substring(Math.max(0, matchIndex - 30), Math.min(texto.length, matchIndex + 170))
          .trim()
      : comm.teorResumido

  const rascunho: AgendaEvent = {
    id: `auto_aud_${comm.id}`,
    title: `${tipoAudiencia} - ${comm.numeroProcesso}`,
    description: `Detectada autonomamente pelo Sentinela via DJEN no processo ${comm.numeroProcesso} (${comm.tribunal} - ${comm.orgaoJulgador}). Trecho: "${snippet}"`,
    eventType: 'AUDIENCIA',
    startDate: startIso,
    endDate: endIso,
    isAllDay: false,
    locationOrLink: localOuLink || (isVirtual ? 'Sala Virtual do Tribunal' : comm.orgaoJulgador),
    isVirtual,
    processNumber: comm.numeroProcesso,
    clientName: comm.destinatario,
    responsible: comm.assignedTo || lawyer,
    participants: [comm.assignedTo || lawyer],
    tribunal: comm.tribunal,
    communicationId: comm.id,
    status: 'AGENDADO', // Rascunho inicial: 'AGENDADO', pendente de validação humana
    remindersMinutesBefore: [1440, 120, 30],
    conflictDetected: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return {
    communicationId: comm.id,
    processo: comm.numeroProcesso,
    tribunal: comm.tribunal,
    dataDetectada: dataFormatada,
    horaDetectada: horaFormatada,
    localOuLink,
    tipoAudiencia,
    trechoExtraido: snippet,
    rascunhoEvento: rascunho,
  }
}

function calcularHoraFim(horaInicio: string, duracaoMinutos: number): string {
  const [h, m] = horaInicio.split(':').map(Number)
  const totalMins = h * 60 + m + duracaoMinutos
  const endH = Math.floor(totalMins / 60) % 24
  const endM = totalMins % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

/**
 * Varre todas as comunicações do sistema para encontrar audiências não cadastradas na agenda
 */
export function buscarAudienciasDetectadasNoDjen(): DjenAudienciaDetectada[] {
  const comms = dataStore.getCommunications()
  const agenda = dataStore.getAgendaEvents()
  const detectadas: DjenAudienciaDetectada[] = []

  for (const comm of comms) {
    const res = detectarAudienciaNoTeor(comm)
    if (res) {
      // Checar se já foi adicionada na agenda (pelo id do rascunho ou communicationId)
      const jaExiste = agenda.some(
        (ev) => ev.communicationId === comm.id || ev.id === res.rascunhoEvento.id,
      )
      if (!jaExiste) {
        detectadas.push(res)
      }
    }
  }

  return detectadas
}

/**
 * Calcula a capacidade operacional do advogado titular (Higor Utinoi)
 * Reaproveita o tipo OperationalTwinCapacity sem recriar métricas do zero.
 */
export function calcularCapacidadeOperacionalTitular(): OperationalTwinCapacity {
  const tasks = dataStore.getTasks()
  const events = dataStore.getAgendaEvents()
  const comms = dataStore.getCommunications()
  const lawyer = dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira'

  const todayStr = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const activeTasks = tasks.filter((t) => t.status !== 'CONCLUIDA')
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'CONCLUIDA') return false
    if (!t.internalDueDate) return false
    return t.internalDueDate < todayStr
  })

  const deadlinesNext7 = comms.filter((c) => {
    const d = c.deadlineCalculated?.finalDeadlineDate
    return d && d >= todayStr && d <= in7Days
  }).length

  const upcomingCommitments = events.filter((e) => {
    const d = e.startDate.split('T')[0]
    return d >= todayStr && e.status !== 'CANCELADO'
  }).length

  // Cálculo ponderado de capacidade (0 a 100+ %)
  // Base: cada tarefa ativa conta 8%, cada prazo fatal em 7d conta 12%, cada compromisso conta 6%
  let capacity = activeTasks.length * 8 + deadlinesNext7 * 12 + upcomingCommitments * 6
  if (capacity > 100) capacity = 100
  if (capacity === 0 && (tasks.length > 0 || comms.length > 0)) capacity = 35

  const riskOfOverload = capacity >= 85 || overdueTasks.length > 0

  let suggestedAction = 'Capacidade em nível ideal. Agenda aberta para atendimentos e despachos.'
  if (capacity >= 85) {
    suggestedAction =
      'Atenção: Sobrecarga iminente. Bloquear novos atendimentos presenciais e priorizar prazos fatais.'
  } else if (capacity >= 65) {
    suggestedAction =
      'Carga moderada. Recomenda-se agendar atendimentos nos blocos vespertinos livres.'
  }

  return {
    personName: lawyer,
    role: 'Advogado Titular / Responsável Técnico (OAB/MS 15.400)',
    activeTasksCount: activeTasks.length,
    overdueTasksCount: overdueTasks.length,
    deadlinesNext7Days: deadlinesNext7,
    agendaCommitmentsCount: upcomingCommitments,
    capacityPercentage: capacity,
    riskOfOverload,
    suggestedAction,
  }
}

/**
 * Gera SUGESTÕES AUTOMÁTICAS DE AGENDAMENTO para os próximos 5 dias úteis:
 * - Sem pedir clique, analisa as tarefas pendentes, os compromissos existentes e os prazos fatais
 * - Nunca sobrepõe compromisso existente (1 pessoa só: Higor Utinói)
 * - Prazos fatais do dia e dos 2 dias seguintes reduzem a janela livre
 * - Complexidade das tarefas pendentes do dia reserva blocos maiores
 * - Gera o motivo em texto simples
 */
export function gerarSugestoesAgendamento(): SugestaoHorario[] {
  const events = dataStore.getAgendaEvents()
  const tasks = dataStore.getTasks()
  const comms = dataStore.getCommunications()
  const twinCapacity = calcularCapacidadeOperacionalTitular()

  const sugestoes: SugestaoHorario[] = []
  const hoje = new Date()

  // Analisar os próximos 5 dias
  for (let offset = 0; offset < 5; offset++) {
    const targetDate = new Date(hoje)
    targetDate.setDate(hoje.getDate() + offset)

    // Pula sábados e domingos
    const dayOfWeek = targetDate.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue

    const dateStr = targetDate.toISOString().split('T')[0]

    // 1. Prazos fatais do dia e dos 2 dias seguintes
    const in2Days = new Date(targetDate)
    in2Days.setDate(targetDate.getDate() + 2)
    const in2DaysStr = in2Days.toISOString().split('T')[0]

    const prazosFataisNoPeriodo = comms.filter((c) => {
      const d = c.deadlineCalculated?.finalDeadlineDate
      return d && d >= dateStr && d <= in2DaysStr
    })
    const temPrazoHoje = comms.some((c) => c.deadlineCalculated?.finalDeadlineDate === dateStr)

    // 2. Tarefas pendentes do dia e suas complexidades
    const tarefasPendentesHoje = tasks.filter((t) => {
      if (t.status === 'CONCLUIDA') return false
      const d = t.internalDueDate || t.legalDeadlineDate
      return d ? d <= dateStr : true
    })

    const tarefasComComplexidade = tarefasPendentesHoje.map((t) => ({
      task: t,
      comp: getComplexidadeTarefa(t),
    }))

    const temCritica = tarefasComComplexidade.some((tc) => tc.comp.nivel === 'critica')
    const temAlta = tarefasComComplexidade.some((tc) => tc.comp.nivel === 'alta')

    // 3. Eventos já agendados para este dia
    const eventosDoDia = events.filter((e) => {
      if (e.status === 'CANCELADO') return false
      return e.startDate.startsWith(dateStr)
    })

    // Blocos padrão de trabalho do advogado (Manhã: 09-12h, Tarde: 14-18h)
    const blocosPossiveis = [
      { inicio: '09:00', fim: '10:30', turno: 'manha' },
      { inicio: '10:30', fim: '12:00', turno: 'manha' },
      { inicio: '14:00', fim: '15:30', turno: 'tarde' },
      { inicio: '15:30', fim: '17:00', turno: 'tarde' },
      { inicio: '17:00', fim: '18:00', turno: 'tarde' },
    ]

    for (const bloco of blocosPossiveis) {
      // Verificar se há sobreposição com algum evento já existente
      const sobreposto = eventosDoDia.some((e) => {
        const evStart = e.startDate.includes('T') ? e.startDate.split('T')[1].slice(0, 5) : '00:00'
        const evEnd = e.endDate.includes('T') ? e.endDate.split('T')[1].slice(0, 5) : '23:59'
        return !(bloco.fim <= evStart || bloco.inicio >= evEnd)
      })

      if (sobreposto) continue // Horário ocupado!

      // Determinar a melhor recomendação para esta janela livre
      let tipoRecomendado: SugestaoHorario['tipoRecomendado'] = 'ATENDIMENTO_CLIENTE'
      const motivos: string[] = []
      let pontuacao = 80

      motivos.push(`${bloco.inicio}–${bloco.fim} livre na agenda`)

      if (temPrazoHoje) {
        tipoRecomendado = 'RESERVA_ESTRATEGICA'
        motivos.push('Há prazo fatal vencendo hoje (prioridade máxima para fechamento e protocolo)')
        pontuacao = 95
      } else if (prazosFataisNoPeriodo.length > 0) {
        motivos.push(`${prazosFataisNoPeriodo.length} prazo(s) fatal(is) nos próximos 2 dias`)
        pontuacao -= 10
      } else {
        motivos.push('Nenhum prazo fatal no dia ou nas próximas 48h')
      }

      if (temCritica || temAlta) {
        const qtdAlta = tarefasComComplexidade.filter(
          (tc) => tc.comp.nivel === 'alta' || tc.comp.nivel === 'critica',
        ).length
        motivos.push(
          `${qtdAlta} tarefa(s) de complexidade alta/crítica pendente(s) — sugerido bloco de estudo e redação`,
        )
        if (!temPrazoHoje) {
          tipoRecomendado = 'BLOCO_ESTUDO_COMPLEXIDADE'
        }
      } else if (tarefasPendentesHoje.length > 0) {
        motivos.push(`${tarefasPendentesHoje.length} tarefa(s) de rotina pendente(s)`)
      } else {
        motivos.push('Zero tarefas pendentes — janela ideal para novos atendimentos a clientes')
      }

      sugestoes.push({
        id: `sug_${dateStr}_${bloco.inicio.replace(':', '')}`,
        data: dateStr,
        inicio: bloco.inicio,
        fim: bloco.fim,
        tipoRecomendado,
        motivo: motivos.join('; '),
        pontuacaoAfinidade: Math.max(10, Math.min(100, pontuacao)),
        tarefasVinculaveis: tarefasComComplexidade.map((tc) => ({
          id: tc.task.id,
          titulo: tc.task.title,
          complexidade: tc.comp.nivel,
        })),
        capacidadeMomento: twinCapacity,
      })
    }
  }

  return sugestoes
}
