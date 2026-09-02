// Deterministic Brazilian Legal Calendar & Explainable Deadline Calculator
import {
  DeadlineMemorial,
  DeadlineStep,
  HolidayOrSuspension,
  RuleCalculationType,
  PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE,
} from '@/types/sentinela'

// Base National Holidays (Brazil) + Regimental Court Suspensões (2025-2027)
export const BRAZILIAN_HOLIDAYS_AND_SUSPENSIONS: HolidayOrSuspension[] = [
  { date: '2025-01-01', name: 'Confraternização Universal', type: 'FERIADO_NACIONAL' },
  { date: '2025-03-03', name: 'Carnaval (Segunda-feira)', type: 'FERIADO_REGIMENTAL' },
  { date: '2025-03-04', name: 'Carnaval (Terça-feira)', type: 'FERIADO_REGIMENTAL' },
  {
    date: '2025-03-05',
    name: 'Quarta-feira de Cinzas (Expediente até 14h)',
    type: 'SUSPENSAO_EXPEDIENTE',
  },
  { date: '2025-04-18', name: 'Sexta-feira Santa', type: 'FERIADO_NACIONAL' },
  { date: '2025-04-21', name: 'Tiradentes', type: 'FERIADO_NACIONAL' },
  { date: '2025-05-01', name: 'Dia do Trabalho', type: 'FERIADO_NACIONAL' },
  { date: '2025-06-19', name: 'Corpus Christi', type: 'FERIADO_NACIONAL' },
  {
    date: '2025-08-11',
    name: 'Dia da Criação dos Cursos Jurídicos / Dia do Advogado',
    type: 'FERIADO_REGIMENTAL',
  },
  { date: '2025-09-07', name: 'Independência do Brasil', type: 'FERIADO_NACIONAL' },
  { date: '2025-10-12', name: 'Nossa Senhora Aparecida', type: 'FERIADO_NACIONAL' },
  { date: '2025-10-28', name: 'Dia do Servidor Público (Art. 236)', type: 'FERIADO_REGIMENTAL' },
  { date: '2025-11-02', name: 'Finados', type: 'FERIADO_NACIONAL' },
  { date: '2025-11-15', name: 'Proclamação da República', type: 'FERIADO_NACIONAL' },
  {
    date: '2025-11-20',
    name: 'Dia Nacional de Zumbi e Consciência Negra',
    type: 'FERIADO_NACIONAL',
  },
  {
    date: '2025-12-08',
    name: 'Dia da Justiça (Art. 62, I, Lei 5.010/66)',
    type: 'FERIADO_REGIMENTAL',
  },
  { date: '2025-12-20', name: 'Início do Recesso Forense (Art. 220 CPC)', type: 'RECESSO_FORENSE' },
  { date: '2026-01-01', name: 'Confraternização Universal', type: 'FERIADO_NACIONAL' },
  {
    date: '2026-01-20',
    name: 'Término da Suspensão de Prazos CPC (Art. 220)',
    type: 'RECESSO_FORENSE',
  },
  { date: '2026-02-16', name: 'Carnaval', type: 'FERIADO_REGIMENTAL' },
  { date: '2026-02-17', name: 'Carnaval', type: 'FERIADO_REGIMENTAL' },
  { date: '2026-04-03', name: 'Sexta-feira Santa', type: 'FERIADO_NACIONAL' },
  { date: '2026-04-21', name: 'Tiradentes', type: 'FERIADO_NACIONAL' },
  { date: '2026-05-01', name: 'Dia do Trabalho', type: 'FERIADO_NACIONAL' },
  { date: '2026-06-04', name: 'Corpus Christi', type: 'FERIADO_NACIONAL' },
  { date: '2026-08-11', name: 'Dia da Justiça / Magistratura', type: 'FERIADO_REGIMENTAL' },
  { date: '2026-09-07', name: 'Independência', type: 'FERIADO_NACIONAL' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'FERIADO_NACIONAL' },
  { date: '2026-10-28', name: 'Dia do Servidor Público', type: 'FERIADO_REGIMENTAL' },
  { date: '2026-11-02', name: 'Finados', type: 'FERIADO_NACIONAL' },
  { date: '2026-11-15', name: 'Proclamação da República', type: 'FERIADO_NACIONAL' },
  { date: '2026-11-20', name: 'Consciência Negra', type: 'FERIADO_NACIONAL' },
  { date: '2026-12-08', name: 'Dia da Justiça', type: 'FERIADO_REGIMENTAL' },
]

export interface LegalRulePreset {
  id: string
  name: string
  article: string
  daysCount: number
  daysType: RuleCalculationType
  tribunalScope?: string
  keywords: string[]
  description: string
}

export const LEGAL_RULES_PRESETS: LegalRulePreset[] = [
  {
    id: 'CPC_APELACAO_15D',
    name: 'Apelação Cível / Recurso Ordinário',
    article: 'Art. 1.003, § 5º c/c Art. 219 do CPC',
    daysCount: 15,
    daysType: 'uteis',
    keywords: ['apelação', 'sentença', 'recurso de apelação', 'apelar'],
    description: 'Prazo comum de 15 dias úteis para interposição de apelação cível',
  },
  {
    id: 'CPC_AGRAVO_INSTRUMENTO_15D',
    name: 'Agravo de Instrumento',
    article: 'Art. 1.003, § 5º c/c Art. 1.015 do CPC',
    daysCount: 15,
    daysType: 'uteis',
    keywords: [
      'agravo de instrumento',
      'tutela de urgência',
      'decisão interlocutória',
      'liminar indeferida',
    ],
    description: 'Prazo de 15 dias úteis contra decisões interlocutórias cabíveis',
  },
  {
    id: 'CPC_EMBARGOS_DECLARACAO_5D',
    name: 'Embargos de Declaração',
    article: 'Art. 1.023 c/c Art. 219 do CPC',
    daysCount: 5,
    daysType: 'uteis',
    keywords: [
      'embargos de declaração',
      'omissão',
      'contradição',
      'obscuridade',
      'acórdão',
      'embargar',
    ],
    description: 'Prazo estrito de 5 dias úteis para sanar vícios',
  },
  {
    id: 'CPC_CONTESTACAO_15D',
    name: 'Contestação Cível',
    article: 'Art. 335 c/c Art. 219 do CPC',
    daysCount: 15,
    daysType: 'uteis',
    keywords: ['contestação', 'citar', 'para contestar', 'resposta do réu'],
    description: '15 dias úteis a partir da audiência ou da juntada/intimação',
  },
  {
    id: 'CPC_MANIFESTACAO_GERAL_5D',
    name: 'Manifestação Geral sobre Documentos',
    article: 'Art. 218, § 3º do CPC',
    daysCount: 5,
    daysType: 'uteis',
    keywords: ['manifeste-se', 'diga o autor', 'digam as partes', 'manifestar sobre'],
    description: 'Prazo supletivo de 5 dias úteis quando o juiz não estipula outro',
  },
  {
    id: 'CLT_RECURSO_ORDINARIO_8D',
    name: 'Recurso Ordinário Trabalhista',
    article: 'Art. 895, I da CLT c/c Art. 775 da CLT',
    daysCount: 8,
    daysType: 'uteis',
    tribunalScope: 'TRT',
    keywords: ['recurso ordinário trabalhista', 'trt', 'sentença trabalhista', 'clt'],
    description: 'Prazo de 8 dias úteis contados na forma do art. 775 da CLT',
  },
  {
    id: 'CPP_RESPOSTA_ACUSACAO_10D',
    name: 'Resposta à Acusação (CPP)',
    article: 'Art. 396 e 396-A do CPP c/c Art. 798 do CPP',
    daysCount: 10,
    daysType: 'corridos',
    keywords: ['resposta à acusação', 'defesa prévia criminal', 'denúncia recebida', 'cpp'],
    description: 'Prazo de 10 dias corridos em matéria processual penal (dias contínuos)',
  },
  {
    id: 'JEF_RECURSO_INOMINADO_10D',
    name: 'Recurso Inominado (Juizados Especiais)',
    article: 'Art. 42 da Lei 9.099/95 c/c Art. 219 CPC',
    daysCount: 10,
    daysType: 'uteis',
    keywords: ['recurso inominado', 'juizado especial', 'turma recursal', 'jef'],
    description: 'Prazo de 10 dias úteis para recorrer de sentença nos Juizados',
  },
]

export function isDateWeekend(dateObj: Date): boolean {
  const day = dateObj.getDay()
  return day === 0 || day === 6
}

export function getHolidayOrSuspension(
  dateStr: string,
  tribunal?: string,
  comarca?: string,
  customSuspensions: HolidayOrSuspension[] = [],
): HolidayOrSuspension | undefined {
  const all = [...BRAZILIAN_HOLIDAYS_AND_SUSPENSIONS, ...customSuspensions]
  return all.find((h) => {
    if (h.date !== dateStr) return false
    if (h.tribunal && tribunal && h.tribunal !== tribunal) return false
    if (h.comarca && comarca && h.comarca !== comarca) return false
    return true
  })
}

export function formatDateIso(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateIso(str: string): Date {
  const parts = str.split('T')[0].split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

/**
 * Deterministic Legal Deadline Calculation with Step-by-Step Memorial
 */
export function calculateLegalDeadline(params: {
  originText: string
  generatingAct?: string
  rulePresetId?: string
  customDays?: number
  customDaysType?: RuleCalculationType
  initialDate: string // e.g. "2026-09-01" (Disponibilização ou Intimação)
  tribunal: string
  comarca?: string
  customSuspensions?: HolidayOrSuspension[]
  reviewer?: string
}): DeadlineMemorial {
  const {
    originText,
    generatingAct = 'Intimação eletrônica / Publicação DJEN',
    rulePresetId,
    customDays,
    customDaysType,
    initialDate,
    tribunal,
    comarca = 'Capital',
    customSuspensions = [],
    reviewer = 'Sistema Sentinela NOX',
  } = params

  let preset = LEGAL_RULES_PRESETS.find((p) => p.id === rulePresetId)
  if (!preset && !customDays) {
    // Attempt keyword heuristic detection
    const lower = originText.toLowerCase()
    preset = LEGAL_RULES_PRESETS.find((p) => p.keywords.some((k) => lower.includes(k)))
  }

  const daysCount = customDays !== undefined ? customDays : preset?.daysCount || 15
  const daysType = customDaysType || preset?.daysType || 'uteis'
  const ruleName = preset?.name || `Prazo Específico (${daysCount} dias ${daysType})`
  const ruleArticle = preset?.article || 'Art. 219 do Código de Processo Civil'

  // Safety check: Never infer deadline without certainty if text is completely ambiguous
  if (!originText || originText.trim().length < 5) {
    return {
      id: `dead_${Date.now()}`,
      numeroProcesso: '',
      originText: originText || '[Texto vazio]',
      generatingAct,
      legalRuleName: 'Indeterminável',
      legalRuleArticle: 'Exige intervenção humana',
      daysCount: 0,
      daysType: 'uteis',
      initialDateMarker: initialDate,
      firstDayCounted: initialDate,
      tribunal,
      comarca,
      holidaysApplied: [],
      calculationSteps: [],
      finalDeadlineDate: initialDate,
      confidenceScore: 0.1,
      confidenceLevel: 'INCONCLUSIVA',
      isDeterminable: false,
      notDeterminableCode: PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE,
      divergences: ['Texto da publicação excessivamente curto ou ambíguo.'],
      missingData: ['Tipo de ato não identificado com precisão.'],
      reviewApprovalStatus: 'PENDENTE',
      ruleVersion: 'v1.4-CPC',
      internalDeadlineDate: initialDate,
    }
  }

  const initialD = parseDateIso(initialDate)
  const steps: DeadlineStep[] = []
  const holidaysApplied: HolidayOrSuspension[] = []

  // Step 0: Publication / Availability Day (Dia do começo NÃO se inclui no cômputo - Art. 224 CPC)
  const pubHoliday = getHolidayOrSuspension(initialDate, tribunal, comarca, customSuspensions)
  const isPubWeekend = isDateWeekend(initialD)
  const pubDayName = WEEKDAY_NAMES[initialD.getDay()]

  steps.push({
    stepNumber: 0,
    date: initialDate,
    dayOfWeek: pubDayName,
    isBusinessDay: !isPubWeekend && !pubHoliday,
    description: `Disponibilização/Publicação do ato no DJEN/PJe. (Exclui-se o dia do começo - Art. 224 CPC)`,
    reasonIfNotBusinessDay: pubHoliday
      ? pubHoliday.name
      : isPubWeekend
        ? 'Final de semana'
        : undefined,
  })

  // Find First Counted Day (Primeiro dia útil subsequente)
  const curr = new Date(initialD)
  curr.setDate(curr.getDate() + 1)

  let firstDayFound = false
  let firstDayStr = ''

  while (!firstDayFound) {
    const dStr = formatDateIso(curr)
    const hol = getHolidayOrSuspension(dStr, tribunal, comarca, customSuspensions)
    const isWk = isDateWeekend(curr)
    const dayName = WEEKDAY_NAMES[curr.getDay()]

    if (!isWk && !hol) {
      firstDayFound = true
      firstDayStr = dStr
      steps.push({
        stepNumber: 1,
        date: dStr,
        dayOfWeek: dayName,
        isBusinessDay: true,
        description: `1º dia do prazo (Início do cômputo do prazo processual)`,
      })
    } else {
      if (hol) holidaysApplied.push(hol)
      steps.push({
        stepNumber: steps.length,
        date: dStr,
        dayOfWeek: dayName,
        isBusinessDay: false,
        description: `Prorrogação do início: dia não útil (${hol?.name || 'Final de semana'})`,
        reasonIfNotBusinessDay: hol ? hol.name : 'Final de semana',
      })
      curr.setDate(curr.getDate() + 1)
    }
  }

  // Count remaining days
  let counted = 1
  while (counted < daysCount) {
    curr.setDate(curr.getDate() + 1)
    const dStr = formatDateIso(curr)
    const hol = getHolidayOrSuspension(dStr, tribunal, comarca, customSuspensions)
    const isWk = isDateWeekend(curr)
    const dayName = WEEKDAY_NAMES[curr.getDay()]

    if (daysType === 'uteis') {
      if (!isWk && !hol) {
        counted++
        steps.push({
          stepNumber: steps.length,
          date: dStr,
          dayOfWeek: dayName,
          isBusinessDay: true,
          description: `${counted}º dia útil contado`,
        })
      } else {
        if (hol) holidaysApplied.push(hol)
        steps.push({
          stepNumber: steps.length,
          date: dStr,
          dayOfWeek: dayName,
          isBusinessDay: false,
          description: `Dia suspenso/não útil (${hol?.name || 'Final de semana'}) - não computado`,
          reasonIfNotBusinessDay: hol ? hol.name : 'Final de semana',
        })
      }
    } else {
      // Dias corridos
      counted++
      if (hol) holidaysApplied.push(hol)
      steps.push({
        stepNumber: steps.length,
        date: dStr,
        dayOfWeek: dayName,
        isBusinessDay: !isWk && !hol,
        description: `${counted}º dia corrido contado`,
        reasonIfNotBusinessDay: hol ? hol.name : isWk ? 'Final de semana' : undefined,
      })
    }
  }

  // Check if final day falls on weekend/holiday -> prolong to next business day (Art. 224, § 1º CPC)
  let finalDStr = formatDateIso(curr)
  let isFinalDayAdjusted = false
  while (true) {
    const hol = getHolidayOrSuspension(finalDStr, tribunal, comarca, customSuspensions)
    const isWk = isDateWeekend(curr)
    if (!isWk && !hol) {
      break
    }
    isFinalDayAdjusted = true
    if (hol) holidaysApplied.push(hol)
    curr.setDate(curr.getDate() + 1)
    finalDStr = formatDateIso(curr)
    const dayName = WEEKDAY_NAMES[curr.getDay()]
    steps.push({
      stepNumber: steps.length,
      date: finalDStr,
      dayOfWeek: dayName,
      isBusinessDay: true,
      description: `Prorrogação do dia fatal para o 1º dia útil subsequente (Art. 224, § 1º CPC)`,
    })
  }

  // Calculate internal deadline (2 days before fatal deadline or 1 day if short)
  const internalD = new Date(curr)
  const subtractDays = daysCount <= 5 ? 1 : 2
  internalD.setDate(internalD.getDate() - subtractDays)
  // Ensure internal deadline is business day
  while (
    isDateWeekend(internalD) ||
    getHolidayOrSuspension(formatDateIso(internalD), tribunal, comarca, customSuspensions)
  ) {
    internalD.setDate(internalD.getDate() - 1)
  }
  const internalDeadlineDate = formatDateIso(internalD)

  const confidenceScore = preset ? 0.96 : 0.82
  const confidenceLevel = confidenceScore >= 0.9 ? 'ALTA' : 'MODERADA'

  return {
    id: `dead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    numeroProcesso: '',
    originText,
    generatingAct,
    legalRuleName: ruleName,
    legalRuleArticle: ruleArticle,
    daysCount,
    daysType,
    initialDateMarker: initialDate,
    firstDayCounted: firstDayStr,
    tribunal,
    comarca,
    holidaysApplied,
    calculationSteps: steps,
    finalDeadlineDate: finalDStr,
    finalDeadlineTime: '23:59:59 (PJe)',
    confidenceScore,
    confidenceLevel,
    isDeterminable: true,
    divergences: isFinalDayAdjusted
      ? ['Vencimento original coincidiu com feriado/fim de semana; prorrogado ex vi legis.']
      : [],
    missingData: [],
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
    reviewApprovalStatus: 'APROVADO',
    ruleVersion: 'CPC/2015-v2.1',
    internalDeadlineDate,
    notes: `Cálculo memorial auditável gerado pelo Motor de Verdade Temporal NOX.`,
  }
}
