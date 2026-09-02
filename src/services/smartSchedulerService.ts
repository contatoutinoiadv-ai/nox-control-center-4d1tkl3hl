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
  dataAConfirmar?: boolean
  horaDetectada?: string
  localOuLink?: string
  tipoAudiencia: string
  trechoExtraido: string
  rascunhoEvento: AgendaEvent
}

/**
 * Meses em português (incluindo variações sem acento)
 */
const MESES_MAP: Record<string, string> = {
  janeiro: '01',
  jan: '01',
  fevereiro: '02',
  fev: '02',
  marco: '03',
  março: '03',
  mar: '03',
  abril: '04',
  abr: '04',
  maio: '05',
  mai: '05',
  junho: '06',
  jun: '06',
  julho: '07',
  jul: '07',
  agosto: '08',
  ago: '08',
  setembro: '09',
  set: '09',
  outubro: '10',
  out: '10',
  novembro: '11',
  nov: '11',
  dezembro: '12',
  dez: '12',
}

/**
 * Padrões de exclusão: eventos já realizados no passado (não são designação futura)
 */
const AUDIENCIA_PASSADA_EXCLUDE_PATTERNS = [
  /audi[eê]ncia\s+realizada\s+em/i,
  /ata\s+d[aeo]\s+audi[eê]ncia\s+realizada/i,
  /termo\s+d[aeo]\s+audi[eê]ncia\s+realizada/i,
  /audi[eê]ncia\s+ocorrida\s+em/i,
  /sess[aã]o\s+realizada\s+em/i,
  /ata\s+da\s+sess[aã]o\s+realizada/i,
  /per[ií]cia\s+realizada\s+em/i,
  /laudo\s+da\s+per[ií]cia\s+realizada/i,
]

/**
 * Padrões diretos de designação / aprazamento / perícia / atos
 */
const DIRECT_TRIGGER_PATTERNS = [
  /aprazad[oa]\s+audi[eê]ncia/i,
  /audi[eê]ncia\s+aprazada/i,
  /fica(?:m)?\s+aprazad[oa]\s+audi[eê]ncia/i,
  /designe-se\s+audi[eê]ncia/i,
  /designada\s+audi[eê]ncia/i,
  /audi[eê]ncia\s+designada/i,
  /desde\s+j[aá]\s+designada\s+audi[eê]ncia/i,
  /redesigno\s+a?\s*audi[eê]ncia/i,
  /audi[eê]ncia\s+redesignada/i,
  /audi[eê]ncia\s+para\s+o\s+dia/i,
  /ficam?\s+as\s+partes\s+intimadas\s+da\s+audi[eê]ncia/i,
  /designo\s+audi[eê]ncia/i,
  /pauta\s+de\s+audi[eê]ncias/i,
  /\bAIJ\b/i,
  /sess[aã]o\s+de\s+concilia[cç][aã]o/i,
  /sess[aã]o\s+de\s+julgamento\s+designada/i,
  /ato\s+conciliat[oó]rio\s+designado/i,
  /solenidade\s+agendada/i,
  /solenidade\s+designada/i,
  /per[ií]cia\s+designada/i,
  /per[ií]cia\s+agendada/i,
  /per[ií]cia\s+marcada/i,
  /designo\s+per[ií]cia/i,
  /designada\s+per[ií]cia/i,
]

/**
 * Termos de audiência / solenidade / perícia para busca por proximidade
 */
const AUDIENCIA_NOUN_REGEX =
  /(?:audi[eê]ncia\s+(?:una|de\s+concilia[cç][aã]o|de\s+instru[cç][aã]o\s+e\s+julgamento|de\s+instru[cç][aã]o|conciliat[oó]ria|inaugural|de\s+justifica[cç][aã]o|geral)?|audi[eê]ncia\b|\bAIJ\b|sess[aã]o\s+de\s+concilia[cç][aã]o|sess[aã]o\s+de\s+julgamento|ato\s+conciliat[oó]rio|solenidade|per[ií]cia(?:\s+m[eé]dica|\s+cont[aá]bil|\s+t[eé]cnica)?)/gi

/**
 * Verbos / expressões de agendamento para busca por proximidade
 */
const SCHEDULING_VERB_REGEX =
  /(?:design(?:ar|o|a-se|e-se|ada|ado|adas|ados|ou|ara)?|apraz(?:ar|o|a-se|e-se|ada|ado|adas|ados|ou|ara)?|marc(?:ar|o|a-se|e-se|ada|ado|adas|ados|ou)?|remarc(?:ar|o|a-se|e-se|ada|ado|adas|ados|ou)?|redesign(?:ar|o|a-se|e-se|ada|ado|adas|ados|ou)?|agend(?:ar|o|a-se|e-se|ada|ado|adas|ados|ou)?|pauta(?:da|do|r)?)/gi

/**
 * Checa se há proximidade (~150 caracteres) entre um substantivo de audiência/ato e um verbo de agendamento.
 */
function testProximityMatch(texto: string): { matched: boolean; index: number; length: number } {
  AUDIENCIA_NOUN_REGEX.lastIndex = 0
  let nounMatch: RegExpExecArray | null

  while ((nounMatch = AUDIENCIA_NOUN_REGEX.exec(texto)) !== null) {
    const nounStart = nounMatch.index
    const nounEnd = nounStart + nounMatch[0].length

    // Janela de busca: até 150 caracteres antes e depois
    const windowStart = Math.max(0, nounStart - 150)
    const windowEnd = Math.min(texto.length, nounEnd + 150)
    const windowText = texto.substring(windowStart, windowEnd)

    SCHEDULING_VERB_REGEX.lastIndex = 0
    if (SCHEDULING_VERB_REGEX.test(windowText)) {
      return {
        matched: true,
        index: nounStart,
        length: nounMatch[0].length,
      }
    }
  }

  return { matched: false, index: -1, length: 0 }
}

/**
 * Extrai data tolerante de texto em português:
 * - dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa, dd.mm.aaaa, dd.mm.aa
 * - "16 de setembro de 2026", "dia 16 de setembro de 2026", "dia 16 de setembro"
 */
export function extrairDataTolerante(texto: string, anoReferencia?: number): string | undefined {
  const currentYear = anoReferencia || new Date().getFullYear()

  // 1. Regex de data por extenso com ano opcional
  // Ex: "dia 16 de setembro de 2026", "16 de setembro de 2026", "16 de setembro"
  const extensoRegex =
    /(?:dia\s+)?(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(?:\s+de\s+(\d{4}|\d{2}))?/i

  const extensoMatch = texto.match(extensoRegex)
  if (extensoMatch) {
    const d = extensoMatch[1].padStart(2, '0')
    const mesKey = extensoMatch[2].toLowerCase()
    const m = MESES_MAP[mesKey]
    if (m) {
      let yStr = extensoMatch[3]
      let y = currentYear
      if (yStr) {
        if (yStr.length === 2) {
          y = 2000 + parseInt(yStr, 10)
        } else {
          y = parseInt(yStr, 10)
        }
      }
      const dayNum = parseInt(d, 10)
      if (dayNum >= 1 && dayNum <= 31) {
        return `${y}-${m}-${d}`
      }
    }
  }

  // 2. Regex numérico tolerante: dd/mm/aaaa, dd.mm.aaaa, dd-mm-aaaa, dd/mm/aa, dd.mm.aa
  const numRegex = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/
  const numMatch = texto.match(numRegex)
  if (numMatch) {
    const d = numMatch[1].padStart(2, '0')
    const m = numMatch[2].padStart(2, '0')
    let yStr = numMatch[3]
    let y = currentYear
    if (yStr.length === 2) {
      y = 2000 + parseInt(yStr, 10)
    } else {
      y = parseInt(yStr, 10)
    }
    const dayNum = parseInt(d, 10)
    const monthNum = parseInt(m, 10)
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      return `${y}-${m}-${d}`
    }
  }

  return undefined
}

/**
 * Extrai horário com suporte ampliado:
 * - 14:00, 14:00h, 14h, 14h00, 14h30, 14h00min, 14h30min
 * - "às 14 horas", "as 14h", "horário: 14:30"
 */
export function extrairHoraTolerante(texto: string): string {
  // Padrão 1: "14h00min", "14h30min", "14h30", "14h00", "14h"
  const horaComHRegex = /\b(\d{1,2})h(?:(\d{2})(?:min)?)?\b/i
  const hMatch = texto.match(horaComHRegex)
  if (hMatch) {
    const h = parseInt(hMatch[1], 10)
    const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  // Padrão 2: "às 14 horas", "as 9 horas"
  const horaPorExtensoRegex = /(?:[àa]s|as)\s+(\d{1,2})\s+horas?/i
  const extMatch = texto.match(horaPorExtensoRegex)
  if (extMatch) {
    const h = parseInt(extMatch[1], 10)
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:00`
    }
  }

  // Padrão 3: "14:00", "14:00h", "horário: 14:30"
  const horaDoisPontosRegex = /(?:[àa]s|as|hor[aá]rio:?)?\s*(\d{1,2}):(\d{2})(?:h)?/i
  const dpMatch = texto.match(horaDoisPontosRegex)
  if (dpMatch) {
    const h = parseInt(dpMatch[1], 10)
    const m = parseInt(dpMatch[2], 10)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  return '14:00'
}

/**
 * Determina o tipo descritivo da audiência/perícia/solenidade a partir do texto
 */
function identificarTipoEvento(texto: string): {
  tipoDescricao: string
  eventType: AgendaEvent['eventType']
} {
  // Perícia
  if (/per[ií]cia/i.test(texto)) {
    let sub = 'Perícia Judicial'
    if (/m[eé]dica/i.test(texto)) sub = 'Perícia Médica Judicial'
    else if (/cont[aá]bil/i.test(texto)) sub = 'Perícia Contábil Judicial'
    else if (/t[eé]cnica|engenharia/i.test(texto)) sub = 'Perícia Técnica / Engenharia'
    return { tipoDescricao: sub, eventType: 'PERICIA' }
  }

  // Ato conciliatório / Sessão de conciliação / Conciliação
  if (
    /ato\s+conciliat[oó]rio/i.test(texto) ||
    /sess[aã]o\s+de\s+concilia[cç][aã]o/i.test(texto) ||
    /concilia[cç][aã]o/i.test(texto) ||
    /conciliat[oó]ria/i.test(texto)
  ) {
    return {
      tipoDescricao: 'Audiência / Sessão de Conciliação (CEJUSC/JEC)',
      eventType: 'AUDIENCIA',
    }
  }

  // AIJ / Instrução e Julgamento
  if (
    /\bAIJ\b/.test(texto) ||
    /instru[cç][aã]o\s+e\s+julgamento/i.test(texto) ||
    /sess[aã]o\s+de\s+julgamento/i.test(texto)
  ) {
    return {
      tipoDescricao: 'Audiência de Instrução e Julgamento (AIJ)',
      eventType: 'AUDIENCIA',
    }
  }

  // Instrução
  if (/instru[cç][aã]o/i.test(texto)) {
    return { tipoDescricao: 'Audiência de Instrução', eventType: 'AUDIENCIA' }
  }

  // Justificação
  if (/justifica[cç][aã]o/i.test(texto)) {
    return { tipoDescricao: 'Audiência de Justificação Prévia', eventType: 'AUDIENCIA' }
  }

  // Una
  if (/\buna\b/i.test(texto) || /audi[eê]ncia\s+una/i.test(texto)) {
    return { tipoDescricao: 'Audiência Una', eventType: 'AUDIENCIA' }
  }

  // Inaugural
  if (/inaugural/i.test(texto)) {
    return { tipoDescricao: 'Audiência Inaugural / Inicial', eventType: 'AUDIENCIA' }
  }

  // Solenidade
  if (/solenidade/i.test(texto)) {
    return { tipoDescricao: 'Solenidade Judicial', eventType: 'AUDIENCIA' }
  }

  return { tipoDescricao: 'Audiência Judicial Designada', eventType: 'AUDIENCIA' }
}

/**
 * Analisa uma comunicação e verifica se há audiência/perícia designada no teor.
 * Atende aos 4 requisitos ampliados:
 * 1. Gatilhos ampliados + proximidade (~150 chars) + AIJ + exclusão de passadas
 * 2. Extração tolerante de data/hora (extenso, ponto, formatos de hora) + fallback 'Data a confirmar'
 * 3. Cobertura de perícia, ato conciliatório e solenidade
 * 4. Rascunho com humanReviewRequired (sem confirmação automática)
 */
export function detectarAudienciaNoTeor(
  comm: SentinelaCommunication,
): DjenAudienciaDetectada | null {
  const texto = `${comm.teorCompleto || ''} ${comm.teorResumido || ''}`
  if (!texto || texto.trim().length === 0) return null

  // Regra de exclusão: Se é apenas menção a audiência / perícia já realizada no passado, ignorar
  const isPassada = AUDIENCIA_PASSADA_EXCLUDE_PATTERNS.some((pattern) => pattern.test(texto))
  if (isPassada) {
    // Se o texto só fala de realizada e não contém nenhuma designação nova explícita, descarta
    const temDesignacaoNova = DIRECT_TRIGGER_PATTERNS.some((pattern) => pattern.test(texto))
    if (!temDesignacaoNova) {
      return null
    }
  }

  // 1. Checagem de gatilhos diretos ou proximidade (~150 chars)
  const isDirectMatch = DIRECT_TRIGGER_PATTERNS.some((pattern) => pattern.test(texto))
  const proximityResult = testProximityMatch(texto)

  if (!isDirectMatch && !proximityResult.matched) {
    return null
  }

  // 2. Identificar Tipo de Evento
  const { tipoDescricao, eventType } = identificarTipoEvento(texto)

  // 3. Extrair Data Tolerante
  const anoReferencia = comm.dataDisponibilizacao
    ? parseInt(comm.dataDisponibilizacao.split('-')[0], 10)
    : undefined
  const dataFormatada = extrairDataTolerante(texto, anoReferencia)
  const isDataAConfirmar = !dataFormatada

  // 4. Extrair Hora Tolerante
  const horaFormatada = extrairHoraTolerante(texto)

  // 5. Extrair link virtual se existir
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

  // Data base do evento (se não encontrada, usa data da publicação para ordenar e sinaliza 'Data a confirmar')
  const eventDate =
    dataFormatada ||
    (comm.dataDisponibilizacao ? comm.dataDisponibilizacao : new Date().toISOString().split('T')[0])
  const startIso = `${eventDate}T${horaFormatada}:00`
  const endIso = `${eventDate}T${calcularHoraFim(horaFormatada, 60)}:00`

  // 6. Trecho snippet para auditoria
  let matchIndex = texto.search(
    /audi[eê]ncia|AIJ|sess[aã]o|solenidade|per[ií]cia|aprazad[oa]|designad[oa]/i,
  )
  if (matchIndex < 0) matchIndex = 0
  const snippet =
    matchIndex >= 0
      ? texto
          .substring(Math.max(0, matchIndex - 30), Math.min(texto.length, matchIndex + 170))
          .trim()
      : comm.teorResumido || texto.slice(0, 200)

  const labelData = isDataAConfirmar ? 'Data a confirmar' : dataFormatada

  const rascunho: AgendaEvent = {
    id: `auto_aud_${comm.id}`,
    title: `${tipoDescricao}${isDataAConfirmar ? ' (Data a confirmar)' : ''} - ${comm.numeroProcesso}`,
    description: `Detectada autonomamente pelo Sentinela via DJEN no processo ${comm.numeroProcesso} (${comm.tribunal} - ${comm.orgaoJulgador}). Status da data: ${labelData}. Trecho: "${snippet}"`,
    eventType,
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
    status: 'AGENDADO', // Rascunho inicial: pendente de revisão e homologação humana
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
    dataAConfirmar: isDataAConfirmar,
    horaDetectada: horaFormatada,
    localOuLink,
    tipoAudiencia: tipoDescricao,
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
