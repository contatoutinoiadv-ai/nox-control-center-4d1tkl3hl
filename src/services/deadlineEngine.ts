// Deterministic Brazilian Legal Calendar & Explainable Deadline Calculator
// Fonte do calendário: Calendário Forense TJMS e Art. 268 do Código de Organização e Divisão Judiciárias (CODJ)
import {
  DeadlineMemorial,
  DeadlineStep,
  HolidayOrSuspension,
  RuleCalculationType,
  PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE,
} from '@/types/sentinela'

/**
 * Normaliza o nome da comarca para correspondência exata sem discrepância de acento ou caixa.
 * Regra: match exato de comarca/município, sem vincular por coincidência de dígitos ou parcial.
 */
export function normalizeComarcaName(name?: string): string {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/^(comarca de|comarca da|comarca do|municipio de|municipio da|municipio do)\s+/i, '')
    .trim()
}

/**
 * Lista anual/recorrente de feriados municipais do TJMS informados textualmente:
 * - Feriados municipais suspendem prazo SOMENTE para processos da comarca correspondente.
 */
export interface TjmsRecurringMunicipalHoliday {
  month: number // 1-12 (9: Setembro, 10: Outubro, 11: Novembro, 12: Dezembro)
  day: number
  comarcas: string[] // nomes canônicos das comarcas onde é feriado municipal
  name: string
}

export const TJMS_RECURRING_MUNICIPAL_HOLIDAYS: TjmsRecurringMunicipalHoliday[] = [
  // SETEMBRO
  {
    month: 9,
    day: 21,
    comarcas: ['Corumba'],
    name: 'Feriado municipal em Corumbá (Fundação do Município)',
  },
  {
    month: 9,
    day: 28,
    comarcas: ['Amambai', 'Aparecida do Taboado'],
    name: 'Feriado municipal em Amambai (Emancipação do município) e Aparecida do Taboado (Aniversário da cidade)',
  },
  {
    month: 9,
    day: 29,
    comarcas: ['Sao Gabriel do Oeste', 'Deodapolis'],
    name: 'Feriado municipal em São Gabriel do Oeste (Arcanjo São Gabriel - Padroeiro da cidade) e Deodápolis (Homenagem ao Fundador do Município)',
  },
  {
    month: 9,
    day: 30,
    comarcas: ['Camapua'],
    name: 'Feriado municipal em Camapuã (Aniversário da cidade)',
  },

  // OUTUBRO
  {
    month: 10,
    day: 2,
    comarcas: ['Bonito'],
    name: 'Feriado municipal em Bonito (Aniversário da cidade)',
  },
  {
    month: 10,
    day: 7,
    comarcas: ['Dois Irmaos do Buriti'],
    name: 'Feriado municipal em Dois Irmãos do Buriti (Padroeira da Cidade)',
  },
  {
    month: 10,
    day: 8,
    comarcas: ['Anaurilandia'],
    name: 'Feriado municipal em Anaurilândia (São João Calábria)',
  },
  {
    month: 10,
    day: 23,
    comarcas: ['Chapadao do Sul'],
    name: 'Feriado municipal em Chapadão do Sul (Aniversário da cidade)',
  },
  {
    month: 10,
    day: 27,
    comarcas: ['Nova Alvorada do Sul'],
    name: 'Feriado municipal em Nova Alvorada do Sul (Aniversário da cidade)',
  },

  // NOVEMBRO
  {
    month: 11,
    day: 11,
    comarcas: ['Anaurilandia', 'Ivinhema', 'Navirai', 'Pedro Gomes'],
    name: 'Feriado municipal em Anaurilândia, Ivinhema, Naviraí e Pedro Gomes (Aniversário da cidade)',
  },
  {
    month: 11,
    day: 12,
    comarcas: ['Bataypora'],
    name: 'Feriado municipal em Batayporã (Aniversário da cidade)',
  },
  {
    month: 11,
    day: 13,
    comarcas: ['Dois Irmaos do Buriti'],
    name: 'Feriado municipal em Dois Irmãos do Buriti (Emancipação da Cidade)',
  },
  {
    month: 11,
    day: 27,
    comarcas: ['Mundo Novo'],
    name: 'Feriado municipal em Mundo Novo (Padroeira do Município - Nossa Senhora das Graças)',
  },

  // DEZEMBRO
  {
    month: 12,
    day: 8,
    comarcas: [
      'Aquidauana',
      'Dourados',
      'Iguatemi',
      'Miranda',
      'Porto Murtinho',
      'Rio Brilhante',
      'Ribas do Rio Pardo',
      'Sete Quedas',
      'Coronel Sapucaia',
    ],
    name: 'Feriado municipal (Nossa Senhora do Cacupê / Nossa Senhora da Conceição)',
  },
  {
    month: 12,
    day: 10,
    comarcas: ['Itapora'],
    name: 'Feriado municipal em Itaporã (Aniversário da cidade)',
  },
  {
    month: 12,
    day: 11,
    comarcas: ['Bataguassu', 'Sidrolandia'],
    name: 'Feriado municipal em Bataguassu e Sidrolândia (Aniversário da cidade)',
  },
  {
    month: 12,
    day: 15,
    comarcas: ['Coronel Sapucaia'],
    name: 'Feriado municipal em Coronel Sapucaia (Aniversário da cidade)',
  },
  {
    month: 12,
    day: 16,
    comarcas: ['Rio Verde de Mato Grosso'],
    name: 'Feriado municipal em Rio Verde de Mato Grosso (Aniversário da cidade)',
  },
]

/**
 * Feriados Anuais e Fixos Nacionais / TJMS com suspensão geral em todas as comarcas:
 * - 07/09: Feriado (Independência do Brasil)
 * - 12/10: Feriado (Nossa Senhora Aparecida)
 * - 30/10: Feriado (Dia do Servidor Público)
 * - 02/11: Feriado (Finados)
 * - 15/11: Feriado (Proclamação da República)
 * - 20/11: Feriado nacional (Dia Nacional de Zumbi e da Consciência Negra)
 * - 08/12: Feriado Nacional (Dia da Justiça) suspende prazo em TODAS as comarcas
 * - 20 a 31/12: Feriado Forense (Art. 268, CODJ) suspende prazo em todas as comarcas
 * - 07/12: Ponto facultativo em todas as Comarcas (NÃO suspende prazo, dia útil informativo)
 */
export interface RecurringGeneralHoliday {
  month: number
  day: number
  name: string
  type: HolidayOrSuspension['type']
  suspendsDeadline: boolean // false para pontos facultativos
}

export const RECURRING_GENERAL_HOLIDAYS: RecurringGeneralHoliday[] = [
  {
    month: 1,
    day: 1,
    name: 'Confraternização Universal',
    type: 'FERIADO_NACIONAL',
    suspendsDeadline: true,
  },
  { month: 4, day: 21, name: 'Tiradentes', type: 'FERIADO_NACIONAL', suspendsDeadline: true },
  { month: 5, day: 1, name: 'Dia do Trabalho', type: 'FERIADO_NACIONAL', suspendsDeadline: true },
  {
    month: 8,
    day: 11,
    name: 'Dia da Criação dos Cursos Jurídicos / Magistratura',
    type: 'FERIADO_REGIMENTAL',
    suspendsDeadline: true,
  },
  {
    month: 9,
    day: 7,
    name: 'Feriado (Independência do Brasil)',
    type: 'FERIADO_NACIONAL',
    suspendsDeadline: true,
  },
  {
    month: 10,
    day: 12,
    name: 'Feriado (Nossa Senhora Aparecida)',
    type: 'FERIADO_NACIONAL',
    suspendsDeadline: true,
  },
  {
    month: 10,
    day: 30,
    name: 'Feriado (Dia do Servidor Público)',
    type: 'FERIADO_REGIMENTAL',
    suspendsDeadline: true,
  },
  {
    month: 11,
    day: 2,
    name: 'Feriado (Finados)',
    type: 'FERIADO_NACIONAL',
    suspendsDeadline: true,
  },
  {
    month: 11,
    day: 15,
    name: 'Proclamação da República',
    type: 'FERIADO_NACIONAL',
    suspendsDeadline: true,
  },
  {
    month: 11,
    day: 20,
    name: 'Feriado nacional (Dia Nacional de Zumbi e da Consciência Negra)',
    type: 'FERIADO_NACIONAL',
    suspendsDeadline: true,
  },
  {
    month: 12,
    day: 7,
    name: 'Ponto facultativo em todas as Comarcas',
    type: 'SUSPENSAO_EXPEDIENTE',
    suspendsDeadline: false,
  },
  {
    month: 12,
    day: 8,
    name: 'Feriado Nacional (Dia da Justiça)',
    type: 'FERIADO_NACIONAL',
    suspendsDeadline: true,
  },
  { month: 12, day: 25, name: 'Natal', type: 'FERIADO_NACIONAL', suspendsDeadline: true },
]

// Base National Holidays móveis (Carnaval, Sexta-feira Santa, Corpus Christi etc.) pré-cadastrados por ano
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
  { date: '2025-09-07', name: 'Feriado (Independência do Brasil)', type: 'FERIADO_NACIONAL' },
  { date: '2025-10-12', name: 'Feriado (Nossa Senhora Aparecida)', type: 'FERIADO_NACIONAL' },
  { date: '2025-10-30', name: 'Feriado (Dia do Servidor Público)', type: 'FERIADO_REGIMENTAL' },
  { date: '2025-11-02', name: 'Feriado (Finados)', type: 'FERIADO_NACIONAL' },
  { date: '2025-11-15', name: 'Proclamação da República', type: 'FERIADO_NACIONAL' },
  {
    date: '2025-11-20',
    name: 'Feriado nacional (Dia Nacional de Zumbi e da Consciência Negra)',
    type: 'FERIADO_NACIONAL',
  },
  {
    date: '2025-12-07',
    name: 'Ponto facultativo em todas as Comarcas',
    type: 'SUSPENSAO_EXPEDIENTE',
  },
  { date: '2025-12-08', name: 'Feriado Nacional (Dia da Justiça)', type: 'FERIADO_NACIONAL' },
  { date: '2025-12-25', name: 'Natal', type: 'FERIADO_NACIONAL' },

  { date: '2026-01-01', name: 'Confraternização Universal', type: 'FERIADO_NACIONAL' },
  { date: '2026-02-16', name: 'Carnaval (Segunda-feira)', type: 'FERIADO_REGIMENTAL' },
  { date: '2026-02-17', name: 'Carnaval (Terça-feira)', type: 'FERIADO_REGIMENTAL' },
  { date: '2026-02-18', name: 'Quarta-feira de Cinzas', type: 'SUSPENSAO_EXPEDIENTE' },
  {
    date: '2026-04-02',
    name: 'Quinta-feira Santa (Art. 164, §2º CODJ)',
    type: 'FERIADO_REGIMENTAL',
  },
  { date: '2026-04-03', name: 'Sexta-feira Santa', type: 'FERIADO_NACIONAL' },
  { date: '2026-04-21', name: 'Tiradentes', type: 'FERIADO_NACIONAL' },
  { date: '2026-05-01', name: 'Dia do Trabalho', type: 'FERIADO_NACIONAL' },
  { date: '2026-06-04', name: 'Corpus Christi', type: 'FERIADO_NACIONAL' },
  {
    date: '2026-08-11',
    name: 'Dia da Justiça / Magistratura (Art. 164, §2º CODJ)',
    type: 'FERIADO_REGIMENTAL',
  },
  { date: '2026-09-07', name: 'Feriado (Independência do Brasil)', type: 'FERIADO_NACIONAL' },
  { date: '2026-10-12', name: 'Feriado (Nossa Senhora Aparecida)', type: 'FERIADO_NACIONAL' },
  { date: '2026-10-30', name: 'Feriado (Dia do Servidor Público)', type: 'FERIADO_REGIMENTAL' },
  { date: '2026-11-02', name: 'Feriado (Finados)', type: 'FERIADO_NACIONAL' },
  { date: '2026-11-15', name: 'Proclamação da República', type: 'FERIADO_NACIONAL' },
  {
    date: '2026-11-20',
    name: 'Feriado nacional (Dia Nacional de Zumbi e da Consciência Negra)',
    type: 'FERIADO_NACIONAL',
  },
  {
    date: '2026-12-07',
    name: 'Ponto facultativo em todas as Comarcas',
    type: 'SUSPENSAO_EXPEDIENTE',
  },
  { date: '2026-12-08', name: 'Feriado Nacional (Dia da Justiça)', type: 'FERIADO_NACIONAL' },
  { date: '2026-12-25', name: 'Natal', type: 'FERIADO_NACIONAL' },

  { date: '2027-01-01', name: 'Confraternização Universal', type: 'FERIADO_NACIONAL' },
  { date: '2027-02-08', name: 'Carnaval (Segunda-feira)', type: 'FERIADO_REGIMENTAL' },
  { date: '2027-02-09', name: 'Carnaval (Terça-feira)', type: 'FERIADO_REGIMENTAL' },
  { date: '2027-03-26', name: 'Sexta-feira Santa', type: 'FERIADO_NACIONAL' },
  { date: '2027-04-21', name: 'Tiradentes', type: 'FERIADO_NACIONAL' },
  { date: '2027-05-01', name: 'Dia do Trabalho', type: 'FERIADO_NACIONAL' },
  { date: '2027-05-27', name: 'Corpus Christi', type: 'FERIADO_NACIONAL' },
  { date: '2027-09-07', name: 'Feriado (Independência do Brasil)', type: 'FERIADO_NACIONAL' },
  { date: '2027-10-12', name: 'Feriado (Nossa Senhora Aparecida)', type: 'FERIADO_NACIONAL' },
  { date: '2027-10-30', name: 'Feriado (Dia do Servidor Público)', type: 'FERIADO_REGIMENTAL' },
  { date: '2027-11-02', name: 'Feriado (Finados)', type: 'FERIADO_NACIONAL' },
  { date: '2027-11-15', name: 'Proclamação da República', type: 'FERIADO_NACIONAL' },
  {
    date: '2027-11-20',
    name: 'Feriado nacional (Dia Nacional de Zumbi e da Consciência Negra)',
    type: 'FERIADO_NACIONAL',
  },
  {
    date: '2027-12-07',
    name: 'Ponto facultativo em todas as Comarcas',
    type: 'SUSPENSAO_EXPEDIENTE',
  },
  { date: '2027-12-08', name: 'Feriado Nacional (Dia da Justiça)', type: 'FERIADO_NACIONAL' },
  { date: '2027-12-25', name: 'Natal', type: 'FERIADO_NACIONAL' },
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

/**
 * Consulta unificada e auditável de feriados e suspensões.
 *
 * REGRAS APLICADAS (Retificação de Prazos):
 * 1. Feriados Nacionais/Estaduais e Feriado Nacional do Dia da Justiça (08/12) suspendem prazo em TODAS as comarcas.
 * 2. Feriado Forense de 20 a 31 de dezembro (Art. 268, CODJ) suspende prazos em TODAS as comarcas (Art. 268 CODJ).
 * 3. Feriados MUNICIPAIS suspendem prazo SOMENTE para processos da comarca correspondente (match exato comarca/município).
 * 4. Ponto Facultativo (ex.: 07/12): NÃO suspende prazo (dia útil), mas fica registrado no calendário com isSuspension = false.
 *
 * @param onlySuspensions Quando true (default para cálculo de prazo), ignora pontos facultativos pois são dias úteis.
 */
export function getHolidayOrSuspension(
  dateStr: string,
  tribunal?: string,
  comarca?: string,
  customSuspensions: HolidayOrSuspension[] = [],
  onlySuspensions: boolean = true,
): HolidayOrSuspension | undefined {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)

  // 1. Feriado Forense 20 a 31 de Dezembro (Art. 268 CODJ)
  if (month === 12 && day >= 20 && day <= 31) {
    return {
      date: dateStr,
      name: 'Feriado Forense de 20 a 31 de dezembro (Art. 268, CODJ)',
      type: 'RECESSO_FORENSE',
      tribunal: 'TJMS',
    }
  }

  // 2. Feriado Nacional do Dia da Justiça (08/12) e demais gerais fixos recorrentes
  const recurringGeneral = RECURRING_GENERAL_HOLIDAYS.find(
    (h) => h.month === month && h.day === day,
  )
  if (recurringGeneral) {
    if (onlySuspensions && !recurringGeneral.suspendsDeadline) {
      // Ponto facultativo não suspende prazo (é dia útil)
      // Não retorna como suspensão para que o loop de dias continue contando
    } else {
      return {
        date: dateStr,
        name: recurringGeneral.name,
        type: recurringGeneral.type,
      }
    }
  }

  // 3. Feriados Municipais TJMS (recorrentes / anuais)
  // Match exato de comarca
  if (comarca) {
    const normComarca = normalizeComarcaName(comarca)
    const munHoliday = TJMS_RECURRING_MUNICIPAL_HOLIDAYS.find((m) => {
      if (m.month !== month || m.day !== day) return false
      return m.comarcas.some((c) => normalizeComarcaName(c) === normComarca)
    })
    if (munHoliday) {
      return {
        date: dateStr,
        name: munHoliday.name,
        type: 'FERIADO_REGIMENTAL',
        comarca,
      }
    }
  }

  // 4. Base de feriados móveis ou explícitos por data (ex.: Carnaval, Sexta-feira Santa, Corpus Christi)
  const allBase = [...BRAZILIAN_HOLIDAYS_AND_SUSPENSIONS, ...customSuspensions]
  const matchBase = allBase.find((h) => {
    if (h.date !== dateStr) return false
    if (h.tribunal && tribunal && h.tribunal !== tribunal) return false
    if (h.comarca && comarca && normalizeComarcaName(h.comarca) !== normalizeComarcaName(comarca)) {
      return false
    }
    return true
  })

  if (matchBase) {
    // 07/12 é Ponto Facultativo: não suspende prazo
    if (onlySuspensions && matchBase.name.toLowerCase().includes('ponto facultativo')) {
      return undefined
    }
    return matchBase
  }

  return undefined
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
    comarca = 'Campo Grande',
    customSuspensions = [],
    reviewer = 'Sistema Sentinela NOX',
  } = params

  let preset = LEGAL_RULES_PRESETS.find((p) => p.id === rulePresetId)
  if (!preset && !customDays) {
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
      ruleVersion: 'v2.2-TJMS-CODJ',
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
      // Dias corridos (Art. 798 CPP etc.)
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

  const confidenceScore = preset ? 0.98 : 0.88
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
    finalDeadlineTime: '23:59:59 (PJe/TJMS)',
    confidenceScore,
    confidenceLevel,
    isDeterminable: true,
    divergences: isFinalDayAdjusted
      ? ['Vencimento original coincidiu com feriado/fim de semana/recesso; prorrogado ex vi legis.']
      : [],
    missingData: [],
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
    reviewApprovalStatus: 'APROVADO',
    ruleVersion: 'CPC/2015-CODJ-TJMS-v2.2',
    internalDeadlineDate,
    notes: `Cálculo memorial auditável gerado com Calendário Forense TJMS e Art. 268 CODJ.`,
  }
}
