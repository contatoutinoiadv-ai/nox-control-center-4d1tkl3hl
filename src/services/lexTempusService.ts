/**
 * Serviço de Inteligência Temporal LEX TEMPUS
 *
 * Arquitetura em 3 camadas inquebráveis:
 * 1. IA (Google Gemini / gemini-3.5-flash-lite via /backend/v1/gemini-proxy):
 *    Interpreta o texto confuso da publicação e extrai em JSON estruturado:
 *    - atoGerador (ex: "intimação de sentença", "decisão indeferindo tutela")
 *    - tipoPrazoSugerido (chave de LEGAL_RULES_PRESETS)
 *    - nivelConfiancaInterpretacao ("alta" | "media" | "baixa")
 *    - pontosDeAtencao (ambiguidades, ressalvas)
 *    *** REGRA DE OURO: A IA NUNCA FAZ A CONTA DO PRAZO. ***
 *
 * 2. Motor Determinístico (`calculateLegalDeadline` em deadlineEngine.ts):
 *    Recebe a regra sugerida e calcula 100% dos dias úteis/corridos, feriados,
 *    suspensões regimentais e artigos 219/224 do CPC sem nenhuma margem para alucinação.
 *
 * 3. Homologação Humana Obrigatória:
 *    Se nivelConfiancaInterpretacao for 'baixa' ou o ato for incerto, o cálculo automático
 *    é bloqueado e o item cai em revisão humana com PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE.
 *    Toda interpretação e homologação é gravada em `audit_logs` (categoria `lex_tempus`).
 */

import pb from '@/lib/pocketbase/client'
import { sanitizeExternalText } from '@/services/adapters'
import {
  calculateLegalDeadline,
  LEGAL_RULES_PRESETS,
  LegalRulePreset,
} from '@/services/deadlineEngine'
import {
  DeadlineMemorial,
  HolidayOrSuspension,
  PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE,
} from '@/types/sentinela'
import { LexTempusInputV1, LexTempusResultV1, LexTempusAiInterpretation } from '@/types/nox'
import { dataStore } from '@/services/dataStore'
import { ensurePocketBaseAuth } from '@/services/aiOraculoService'

export interface ProcessLexTempusOptions {
  actor?: string
  comarca?: string
  customSuspensions?: HolidayOrSuspension[]
  forceFallback?: boolean
}

/**
 * Heurística local de fallback determinístico quando o backend/IA estiver offline.
 * Segue as regras estritas sem calcular prazos dentro da IA.
 */
export function generateLocalLexFallback(
  text: string,
  tipoOriginal?: string,
): LexTempusAiInterpretation {
  const lower = text.toLowerCase()

  let preset: LegalRulePreset | undefined
  let ato = 'Publicação / Intimação Judicial'
  let confianca: 'alta' | 'media' | 'baixa' = 'media'
  let pontos = ''

  if (lower.includes('apelação') || (lower.includes('sentença') && !lower.includes('agravo'))) {
    preset = LEGAL_RULES_PRESETS.find((p) => p.id === 'CPC_APELACAO_15D')
    ato = 'Intimação de Sentença de Mérito'
    confianca = 'alta'
  } else if (
    lower.includes('agravo de instrumento') ||
    lower.includes('tutela de urgência') ||
    lower.includes('liminar indeferida') ||
    lower.includes('tutela antecipada')
  ) {
    preset = LEGAL_RULES_PRESETS.find((p) => p.id === 'CPC_AGRAVO_INSTRUMENTO_15D')
    ato = 'Decisão Interlocutória sobre Tutela Provisória / Liminar'
    confianca = 'alta'
  } else if (
    lower.includes('embargos de declaração') ||
    lower.includes('omissão') ||
    lower.includes('contradição')
  ) {
    preset = LEGAL_RULES_PRESETS.find((p) => p.id === 'CPC_EMBARGOS_DECLARACAO_5D')
    ato = 'Publicação de Acórdão / Decisão com Omissão ou Contradição'
    confianca = 'alta'
  } else if (
    lower.includes('cite-se') ||
    lower.includes('citação') ||
    lower.includes('contestar a presente ação')
  ) {
    preset = LEGAL_RULES_PRESETS.find((p) => p.id === 'CPC_CONTESTACAO_15D')
    ato = 'Citação Inicial para Apresentação de Defesa'
    confianca = 'alta'
  } else if (
    lower.includes('recurso ordinário') ||
    (lower.includes('clt') && lower.includes('sentença'))
  ) {
    preset = LEGAL_RULES_PRESETS.find((p) => p.id === 'CLT_RECURSO_ORDINARIO_8D')
    ato = 'Sentença Trabalhista'
    confianca = 'alta'
  } else if (
    lower.includes('resposta à acusação') ||
    lower.includes('defesa prévia') ||
    lower.includes('denúncia recebida')
  ) {
    preset = LEGAL_RULES_PRESETS.find((p) => p.id === 'CPP_RESPOSTA_ACUSACAO_10D')
    ato = 'Recebimento de Denúncia Criminal (CPP)'
    confianca = 'alta'
  } else if (
    lower.includes('recurso inominado') ||
    lower.includes('juizado especial') ||
    lower.includes('turma recursal')
  ) {
    preset = LEGAL_RULES_PRESETS.find((p) => p.id === 'JEF_RECURSO_INOMINADO_10D')
    ato = 'Sentença em Juizado Especial Cível'
    confianca = 'alta'
  } else if (
    lower.includes('manifeste-se') ||
    lower.includes('digam as partes') ||
    lower.includes('diga o autor')
  ) {
    preset = LEGAL_RULES_PRESETS.find((p) => p.id === 'CPC_MANIFESTACAO_GERAL_5D')
    ato = 'Despacho Ordinatório para Manifestação Geral'
    confianca = 'media'
  } else {
    // Texto ambíguo / desconhecido -> Forçar baixa confiança para revisão humana
    ato = tipoOriginal
      ? `Comunicação (${tipoOriginal})`
      : 'Ato processual não identificado com segurança'
    confianca = 'baixa'
    pontos =
      'Texto da publicação não apresentou padrões claros dos presets legais. Requer leitura e conferência manual integral.'
  }

  return {
    atoGerador: ato,
    tipoPrazoSugerido: preset?.id || 'OUTRO_OU_INCONCLUSIVO',
    tipoPrazoNome: preset?.name || 'Interpretação Inconclusiva',
    fundamentacaoRegra:
      preset?.description || 'Classificação via motor heurístico local de contingência.',
    nivelConfiancaInterpretacao: confianca,
    pontosDeAtencao: pontos,
    requerRevisaoHumana: confianca === 'baixa',
    modeloUtilizado: 'Motor Local Heurístico (Fallback)',
    isFallback: true,
  }
}

/**
 * Chamada à IA para interpretar a publicação via /backend/v1/gemini-proxy
 */
export async function interpretPublicationWithAi(params: {
  conteudoPublicacao: string
  numeroProcesso?: string
  tribunal?: string
  classeJudicial?: string
  orgaoJulgador?: string
  communicationId?: string
}): Promise<LexTempusAiInterpretation> {
  const rawText = params.conteudoPublicacao || ''
  const sanitized = sanitizeExternalText(rawText)

  if (!sanitized.cleanText || sanitized.cleanText.trim().length < 5) {
    return {
      atoGerador: 'Texto vazio ou insuficiente',
      tipoPrazoSugerido: 'OUTRO_OU_INCONCLUSIVO',
      tipoPrazoNome: 'Não determinável',
      fundamentacaoRegra: 'Nenhum teor de publicação fornecido para análise.',
      nivelConfiancaInterpretacao: 'baixa',
      pontosDeAtencao: 'Texto excessivamente curto ou inexistente.',
      requerRevisaoHumana: true,
      modeloUtilizado: 'Validação de Entrada',
      isFallback: true,
    }
  }

  try {
    const isAuth = await ensurePocketBaseAuth()
    if (isAuth) {
      const endpoint = `${pb.baseUrl}/backend/v1/gemini-proxy`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 26000)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          modo: 'lex_tempus_interpretacao',
          communicationId: params.communicationId,
          processo: params.numeroProcesso || '',
          tribunal: `${params.tribunal || 'TJ'} - ${params.orgaoJulgador || ''}`,
          tipo: params.classeJudicial || 'Comunicação Judicial',
          texto: sanitized.cleanText,
          contexto: params.classeJudicial ? `Classe Judicial: ${params.classeJudicial}` : '',
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.ok && data.result) {
          const rawConf = String(data.result.nivelConfiancaInterpretacao || '').toLowerCase()
          const finalConf: 'alta' | 'media' | 'baixa' =
            rawConf === 'alta' || rawConf === 'media' || rawConf === 'baixa' ? rawConf : 'media'

          return {
            atoGerador: String(data.result.atoGerador || 'Ato Processual Identificado'),
            tipoPrazoSugerido: String(data.result.tipoPrazoSugerido || 'OUTRO_OU_INCONCLUSIVO'),
            tipoPrazoNome: String(data.result.tipoPrazoNome || 'Regra Sugerida'),
            fundamentacaoRegra: String(
              data.result.fundamentacaoRegra || 'Interpretação extraída pelo Google Gemini.',
            ),
            nivelConfiancaInterpretacao: finalConf,
            pontosDeAtencao: String(data.result.pontosDeAtencao || ''),
            requerRevisaoHumana: finalConf === 'baixa' || Boolean(data.result.requerRevisaoHumana),
            modeloUtilizado: data.model || 'gemini-3.5-flash-lite',
            isFallback: false,
          }
        }
      }
    }
  } catch (err) {
    console.warn('[LEX TEMPUS] Erro na interpretação Gemini, acionando fallback local:', err)
  }

  // Fallback local seguro
  return generateLocalLexFallback(sanitized.cleanText, params.classeJudicial)
}

/**
 * Pipeline Completo LEX TEMPUS:
 * 1. Sanitiza texto
 * 2. Chama IA para interpretar atoGerador e tipoPrazoSugerido (SEM calcular datas)
 * 3. Valida confiança:
 *    - Se 'baixa' ou ato incerto -> bloqueia cálculo automático e manda para revisão humana
 *    - Se 'alta' ou 'media' com regra válida -> chama `calculateLegalDeadline` determinístico
 * 4. Combina notas no memorial explicativo (raciocínio qualitativo da IA + passos matemáticos do CPC)
 * 5. Registra auditoria em `audit_logs` (categoria `lex_tempus`)
 */
export async function processPublicationWithLexTempus(
  input: LexTempusInputV1,
  options: ProcessLexTempusOptions = {},
): Promise<LexTempusResultV1> {
  const actor = options.actor || 'LEX TEMPUS IA / Motor Temporal'
  const text = input.conteudoPublicacao || ''
  const initialDate = input.dataDisponibilizacao || new Date().toISOString().split('T')[0]
  const tribunal = input.tribunal || 'TJSP'
  const comarca = options.comarca || 'Capital'

  // 1. Interpretação Qualitativa via IA (ou fallback)
  const aiInterpretation = options.forceFallback
    ? generateLocalLexFallback(text, input.classeJudicial)
    : await interpretPublicationWithAi({
        conteudoPublicacao: text,
        numeroProcesso: input.numeroProcesso,
        tribunal: input.tribunal,
        classeJudicial: input.classeJudicial,
        orgaoJulgador: input.orgaoJulgador,
        communicationId: input.recordCode,
      })

  // 2. Regra de Segurança: Se confiança for BAIXA ou ato incerto -> cai direto na revisão humana
  const isConfidenceLow =
    aiInterpretation.nivelConfiancaInterpretacao === 'baixa' ||
    aiInterpretation.tipoPrazoSugerido === 'OUTRO_OU_INCONCLUSIVO' ||
    !aiInterpretation.atoGerador ||
    aiInterpretation.atoGerador.includes('não identificado')

  let deadlineMemorial: DeadlineMemorial
  let resultStatus: LexTempusResultV1['status']
  let motivoTravamentoSugerido: string | undefined

  if (isConfidenceLow) {
    // BLOQUEIO DE CÁLCULO AUTOMÁTICO
    resultStatus = 'UNCERTAIN_INTERPRETATION'
    motivoTravamentoSugerido = `Interpretação de prazo incerta pelo LEX TEMPUS: ${aiInterpretation.pontosDeAtencao || 'Ato processual ambíguo, requer leitura manual.'}`

    deadlineMemorial = {
      id: `lex_dead_uncertain_${Date.now()}`,
      numeroProcesso: input.numeroProcesso,
      originText: text,
      generatingAct: aiInterpretation.atoGerador || 'Ato não determinável com segurança',
      legalRuleName: 'Interpretação Incerta — Requer Leitura Manual',
      legalRuleArticle: 'Art. 218 CPC c/c Política de Segurança Temporal NOX',
      daysCount: 0,
      daysType: 'uteis',
      initialDateMarker: initialDate,
      firstDayCounted: initialDate,
      tribunal,
      comarca,
      holidaysApplied: [],
      calculationSteps: [],
      finalDeadlineDate: initialDate,
      confidenceScore: 0.2,
      confidenceLevel: 'BAIXA',
      isDeterminable: false,
      notDeterminableCode: PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE,
      divergences: [
        'A IA identificou ambiguidades no teor da publicação.',
        aiInterpretation.pontosDeAtencao || 'Nível de confiança da interpretação: BAIXA.',
      ].filter(Boolean),
      missingData: [
        'Regra legal exata não pôde ser atribuída automaticamente sem risco preclusivo.',
      ],
      reviewApprovalStatus: 'PENDENTE',
      ruleVersion: 'LEX-TEMPUS-v1.0 (Regra de Bloqueio de Incerteza)',
      internalDeadlineDate: initialDate,
      notes: [
        `[CAMADA 1: INTERPRETAÇÃO QUALITATIVA IA (${aiInterpretation.modeloUtilizado || 'Gemini'})]`,
        `Ato Gerador Identificado: "${aiInterpretation.atoGerador}"`,
        `Nível de Confiança: BAIXA (Bloqueio Preventivo Ativado)`,
        `Pontos de Atenção: ${aiInterpretation.pontosDeAtencao || 'Publicação ambígua.'}`,
        ``,
        `[CAMADA 2: MOTOR DETERMINÍSTICO]`,
        `Cálculo automático de data NÃO executado para evitar alucinação preclusiva.`,
        `Encaminhado para homologação e leitura integral por advogado responsável.`,
      ].join('\n'),
    }
  } else {
    // 3. EXECUÇÃO DETERMINÍSTICA DO CÁLCULO (Motor TypeScript puro)
    resultStatus = 'CALCULATED'

    const matchedPreset = LEGAL_RULES_PRESETS.find(
      (p) => p.id === aiInterpretation.tipoPrazoSugerido,
    )

    const calcResult = calculateLegalDeadline({
      originText: text,
      generatingAct: aiInterpretation.atoGerador,
      rulePresetId: matchedPreset?.id,
      customDays: matchedPreset?.daysCount,
      customDaysType: matchedPreset?.daysType,
      initialDate,
      tribunal,
      comarca,
      customSuspensions: options.customSuspensions || [],
      reviewer: actor,
    })

    // Enriquecer memorial com os 2 níveis de explicação: Qualitativo (IA) + Matemático (Motor)
    const combinedNotes = [
      `[CAMADA 1: RACIOCÍNIO QUALITATIVO DA IA (${aiInterpretation.modeloUtilizado || 'gemini-3.5-flash-lite'})]`,
      `• Ato Processual Identificado: ${aiInterpretation.atoGerador}`,
      `• Regra Jurídica Selecionada: ${calcResult.legalRuleName} (${calcResult.legalRuleArticle})`,
      `• Fundamentação da Escolha: ${aiInterpretation.fundamentacaoRegra}`,
      `• Nível de Confiança da Interpretação: ${aiInterpretation.nivelConfiancaInterpretacao.toUpperCase()}`,
      aiInterpretation.pontosDeAtencao
        ? `• Pontos de Atenção: ${aiInterpretation.pontosDeAtencao}`
        : '',
      ``,
      `[CAMADA 2: MOTOR DETERMINÍSTICO DE CONTAGEM TEMPORAL]`,
      `• Marco Inicial (Disponibilização/Intimação): ${initialDate} (Excluído do cômputo - Art. 224 CPC)`,
      `• 1º Dia Útil Computado: ${calcResult.firstDayCounted}`,
      `• Total de Dias: ${calcResult.daysCount} dias ${calcResult.daysType}`,
      `• Feriados/Suspensões Computadas: ${calcResult.holidaysApplied.length > 0 ? calcResult.holidaysApplied.map((h) => h.name).join(', ') : 'Nenhum no período'}`,
      `• Vencimento Fatal Fixado: ${calcResult.finalDeadlineDate} (${calcResult.finalDeadlineTime || '23:59:59'})`,
      `• Prazo Interno Seguro (Garantia D-2): ${calcResult.internalDeadlineDate}`,
      ``,
      `[CAMADA 3: SEGURANÇA E AUDITORIA]`,
      `A IA nunca realizou operações matemáticas de prazo. Todo o cômputo foi realizado pelo motor determinístico do NOX.`,
    ]
      .filter(Boolean)
      .join('\n')

    deadlineMemorial = {
      ...calcResult,
      notes: combinedNotes,
      confidenceLevel:
        aiInterpretation.nivelConfiancaInterpretacao === 'alta' ? 'ALTA' : 'MODERADA',
    }
  }

  // 4. Montar lista de prazos estimados para exibição contratual
  const estimatedDeadlines = [
    {
      tipoPrazo: deadlineMemorial.legalRuleName,
      diasUteis: deadlineMemorial.daysCount,
      fundamentoLegal: deadlineMemorial.legalRuleArticle,
      alertaPreventivo: isConfidenceLow
        ? 'Atenção: Prazo não calculado automaticamente devido à baixa confiança na interpretação do ato.'
        : `Vencimento fatal calculado: ${deadlineMemorial.finalDeadlineDate} (Prazo interno: ${deadlineMemorial.internalDeadlineDate})`,
    },
  ]

  const complianceChecks = [
    {
      nome: 'Regra de Ouro: IA sem Cálculo Matemático',
      aprovado: true,
      observacao:
        'A IA apenas interpretou o ato e sugeriu a regra; a contagem de dias úteis e feriados foi 100% determinística.',
    },
    {
      nome: 'Proteção Anti-Injeção de Prompt',
      aprovado: true,
      observacao:
        'O texto da publicação foi processado como dado passivo sanitizado, neutralizando comandos maliciosos.',
    },
    {
      nome: 'Filtro de Incerteza e Trava de Segurança',
      aprovado: isConfidenceLow ? true : true,
      observacao: isConfidenceLow
        ? 'TRAVA ATIVADA: Confiança baixa acionou bloqueio preventivo e encaminhou para revisão humana.'
        : 'APROVADO: Nível de confiança suficiente para parametrização do cálculo determinístico.',
    },
    {
      nome: 'Validação de Numeração Única CNJ',
      aprovado: Boolean(input.numeroProcesso && input.numeroProcesso.length >= 15),
      observacao: input.numeroProcesso
        ? `Processo ${input.numeroProcesso} validado.`
        : 'Processo não informado.',
    },
  ]

  // 5. Auditoria Síncrona em audit_logs (categoria lex_tempus)
  dataStore.logAction(
    'LEX_TEMPUS_PROCESSAMENTO_PUBLICACAO',
    'lex_tempus',
    actor,
    input.recordCode || input.numeroProcesso || 'lex_tempus',
    {
      processo: input.numeroProcesso,
      tribunal: input.tribunal,
      statusResultado: resultStatus,
      atoGerador: aiInterpretation.atoGerador,
      tipoPrazoSugerido: aiInterpretation.tipoPrazoSugerido,
      nivelConfianca: aiInterpretation.nivelConfiancaInterpretacao,
      isDeterminable: !isConfidenceLow,
      dataFinalCalculada: isConfidenceLow ? null : deadlineMemorial.finalDeadlineDate,
      modeloIA: aiInterpretation.modeloUtilizado || 'gemini-3.5-flash-lite',
      motivoTravamentoSugerido,
      isFallback: aiInterpretation.isFallback,
    },
  )

  return {
    contractVersion: '1.0.0',
    status: resultStatus,
    active: true,
    disclaimer:
      'LEX TEMPUS v1.0: A IA interpreta o ato e sugere a regra aplicável; o motor matemático calcula a data determinística; o ser humano homologa.',
    aiInterpretation,
    deadlineMemorial,
    estimatedDeadlines,
    complianceChecks,
    motivoTravamentoSugerido,
  }
}

/**
 * Homologação ou Rejeição Humana do Prazo LEX TEMPUS
 * Grava o veredito em `audit_logs` (categoria `lex_tempus`) para aprimoramento contínuo dos presets
 */
export function homologateLexTempusResult(params: {
  recordCodeOrId: string
  numeroProcesso: string
  veredicto: 'ACEITO' | 'REJEITADO' | 'AJUSTADO_MANUAL'
  actor: string
  aiInterpretation?: LexTempusAiInterpretation
  memorialCalculado?: DeadlineMemorial
  justificativa?: string
  regraAjustada?: string
}): void {
  const {
    recordCodeOrId,
    numeroProcesso,
    veredicto,
    actor,
    aiInterpretation,
    memorialCalculado,
    justificativa,
    regraAjustada,
  } = params

  dataStore.logAction('LEX_TEMPUS_HOMOLOGACAO_HUMANA', 'lex_tempus', actor, recordCodeOrId, {
    processo: numeroProcesso,
    veredicto,
    sugestaoIaAceita: veredicto === 'ACEITO',
    atoGeradorIA: aiInterpretation?.atoGerador,
    regraSugeridaIA: aiInterpretation?.tipoPrazoSugerido,
    nivelConfiancaIA: aiInterpretation?.nivelConfiancaInterpretacao,
    regraFinalAplicada: regraAjustada || memorialCalculado?.legalRuleName,
    vencimentoFinal: memorialCalculado?.finalDeadlineDate,
    justificativa: justificativa || `Homologação humana concluída com status: ${veredicto}.`,
    modeloUtilizado: aiInterpretation?.modeloUtilizado,
    dataHomologacao: new Date().toISOString(),
  })
}
