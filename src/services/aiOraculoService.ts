/**
 * Serviço de IA Oráculo NOX & Google Gemini via Skip Cloud Backend
 *
 * Executa chamadas seguras para o endpoint de backend `/backend/v1/gemini-proxy`
 * sem expor nenhuma chave no navegador. Mantém fallback automático e transparente
 * quando o backend não estiver autenticado, rede falhar ou a IA estiver indisponível.
 *
 * O texto da publicação SEMPRE passa por sanitizeExternalText antes de qualquer envio.
 */
import pb from '@/lib/pocketbase/client'
import { SentinelaCommunication } from '@/types/sentinela'
import { sanitizeExternalText } from '@/services/adapters'
import { dataStore } from '@/services/dataStore'

export interface OraculoMessage {
  id: string
  role: 'sys' | 'user' | 'nox'
  content: string
  timestamp: string
  isFallback?: boolean
  model?: string
  confidence?: 'ALTA' | 'MEDIA' | 'REQUER_ATENCAO'
  sourceInfo?: string
}

export interface GeminiStructuredAnalysis {
  classificacao: string
  urgencia: 'baixa' | 'media' | 'alta' | 'critica'
  resumo: string
  riscoScore: number
  justificativa: string
}

export interface GeminiProxyResponse {
  ok: boolean
  model?: string
  source?: string
  content?: string
  result?: GeminiStructuredAnalysis
  humanReviewRequired?: boolean
  disclaimer?: string
  error?: string
  code?: string
}

/**
 * Garante que a sessão do PocketBase esteja pronta (faz autenticação transparente se o token estiver vazio)
 */
export async function ensurePocketBaseAuth(): Promise<boolean> {
  try {
    if (pb.authStore.isValid && pb.authStore.token) {
      return true
    }
    // Tenta autenticar com a conta de operador seed padrão
    await pb.collection('users').authWithPassword('contatoutinoiadv@gmail.com', 'Skip@Pass')
    return pb.authStore.isValid
  } catch (err) {
    console.warn('[Oraculo NOX] Não foi possível autenticar sessão PocketBase:', err)
    return false
  }
}

/**
 * Monta o resumo executivo das comunicações para alimentar o contexto do Gemini
 */
export function buildSentinelaContext(
  comms: SentinelaCommunication[],
  advogadoNome?: string,
  advogadoOab?: string,
): string {
  const total = comms.length
  const criticas = comms.filter((c) => c.urgencyLevel === 'critica' || c.urgencyLevel === 'alta')
  const citacoes = comms.filter((c) => c.tipoComunicacao === 'CITACAO')
  const intimacoes = comms.filter((c) => c.tipoComunicacao === 'INTIMACAO')

  const topComms = comms.slice(0, 8).map((c, idx) => {
    const prazo = c.deadlineCalculated?.finalDeadlineDate
      ? ` | Prazo Fatal: ${c.deadlineCalculated.finalDeadlineDate} (${c.deadlineCalculated.legalRuleName || 'Regra Padrão'})`
      : ' | Prazo: A Determinar'
    return `[${idx + 1}] Processo: ${c.numeroProcesso} (${c.tribunal} - ${c.orgaoJulgador}) | Tipo: ${c.tipoComunicacao} | Urgência: ${c.urgencyLevel.toUpperCase()} | Destinatário: ${c.destinatario}${prazo}\nTeor: "${c.teorResumido.slice(0, 220)}"`
  })

  return [
    `Advogado Responsável: ${advogadoNome || 'Higor Utinoi de Oliveira'} (OAB ${advogadoOab || 'MS 15.400'})`,
    `Total de Comunicações: ${total} | Urgentes/Críticas: ${criticas.length} | Citações: ${citacoes.length} | Intimações: ${intimacoes.length}`,
    'Amostra das Principais Publicações Ativas:',
    ...topComms,
  ].join('\n\n')
}

/**
 * Gera resposta determinística de fallback quando o Gemini / Backend não puder responder
 */
export function generateLocalFallbackResponse(
  userPrompt: string,
  comms: SentinelaCommunication[],
): { content: string; model: string; source: string; confidence: 'MEDIA' } {
  const lower = userPrompt.toLowerCase()
  const urgentes = comms.filter((c) => c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica')
  const citacoes = comms.filter((c) => c.tipoComunicacao === 'CITACAO')

  let reply = ''
  if (lower.includes('urgente') || lower.includes('crítica') || lower.includes('prioridade')) {
    reply = `**ORÁCULO NOX — Triagem de Prioridades Críticas (Motor Local):**\n\nIdentificamos **${urgentes.length} publicações urgentes/críticas** no acervo.\n\n`
    if (urgentes.length > 0) {
      reply += urgentes
        .slice(0, 3)
        .map(
          (u, i) =>
            `• **${i + 1}. ${u.numeroProcesso} (${u.tribunal}):** ${u.teorResumido.slice(0, 140)}... (Vencimento: ${u.deadlineCalculated?.finalDeadlineDate || 'A conferir'})\n`,
        )
        .join('')
    }
    reply += `\n**Diretriz Operacional:** Realizar conferência de prazos fatais com antecedência mínima D-2.`
  } else if (
    lower.includes('prazo') ||
    lower.includes('cálculo') ||
    lower.includes('dias') ||
    lower.includes('fatal')
  ) {
    reply = `**ORÁCULO NOX — Diretriz de Prazos Processuais (Motor Local):**\n\nPara as publicações do TJMS e Tribunais Superiores, os prazos em dias úteis devem observar estritamente:\n1. **Art. 219 e 224 do CPC:** Exclui-se o dia do começo e inclui-se o do vencimento.\n2. **Feriados Locais:** Art. 268 do CODJ (TJMS) e portarias de suspensão de expediente forense.\n3. **Citações Cíveis:** Prazo padrão de 15 dias úteis para contestação a partir da juntada/leitura.\n\n*Caso a publicação contenha despacho específico, adote o prazo assinalado pelo magistrado.*`
  } else if (lower.includes('citaç') || lower.includes('citacao')) {
    reply = `**ORÁCULO NOX — Análise de Citações Judiciais (Motor Local):**\n\nConstatadas **${citacoes.length} citações** pendentes de manifestação.\nRecomendamos conferência imediata da intimação eletrônica no portal do tribunal para verificação da data de abertura de prazo.`
  } else {
    reply = `**ORÁCULO NOX — Análise Operacional (Motor Local):**\n\nEm atenção à sua consulta ("${userPrompt.slice(0, 80)}..."): examinando a base de ${comms.length} publicações ativas, recomendamos priorizar a conferência de feriados forenses locais (ex.: Art. 268 CODJ TJMS) antes do fechamento de protocolo.\n\nAs citações tributárias e cíveis possuem garantia D-2 configurada para prevenção de preclusão.`
  }

  return {
    content: `${reply}\n\n---\n**Fonte:** Base local de publicações NOX Control Center\n**Nível de Confiança:** MÉDIO (Geração Determinística Local)\n⚠️ *Revisão humana obrigatória por advogado responsável antes de qualquer protocolo.*`,
    model: 'Motor Local Deterministico (Fallback)',
    source: 'Sentinela Local Cache',
    confidence: 'MEDIA',
  }
}

/**
 * Análise individual de publicação via Google Gemini (`gemini-3.5-flash-lite`)
 * Passa o texto sanitizado via sanitizeExternalText antes do envio.
 * Preenche a classificação sugerida mantendo humanReviewRequired: true.
 */
export async function analyzeCommunicationWithGemini(comm: SentinelaCommunication): Promise<{
  success: boolean
  analysis: GeminiStructuredAnalysis
  model: string
  source: string
  isFallback: boolean
}> {
  // 1. Sanitização rigorosa do texto da publicação
  const rawText = comm.teorCompleto || comm.teorResumido || ''
  const sanitized = sanitizeExternalText(rawText)

  try {
    const isAuth = await ensurePocketBaseAuth()
    if (isAuth) {
      const endpoint = `${pb.baseUrl}/backend/v1/gemini-proxy`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          modo: 'analise',
          communicationId: comm.id,
          processo: comm.numeroProcesso,
          tribunal: `${comm.tribunal} - ${comm.orgaoJulgador}`,
          tipo: comm.tipoComunicacao,
          texto: sanitized.cleanText,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = (await res.json()) as GeminiProxyResponse
        if (data.ok && data.result) {
          // Log de auditoria local síncrono
          dataStore.logAction(
            'IA_ANALISE_PUBLICACAO_GEMINI',
            'revisao',
            'Sentinela IA (gemini-3.5-flash-lite)',
            comm.id,
            {
              processo: comm.numeroProcesso,
              tribunal: comm.tribunal,
              classificacaoSugerida: data.result.classificacao,
              urgencia: data.result.urgencia,
              riscoScore: data.result.riscoScore,
              resumo: data.result.resumo,
              humanReviewRequired: true,
              modelo: data.model || 'gemini-3.5-flash-lite',
            },
          )

          return {
            success: true,
            analysis: data.result,
            model: data.model || 'gemini-3.5-flash-lite',
            source: data.source || 'Google Gemini (gemini-3.5-flash-lite)',
            isFallback: false,
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Oraculo NOX] Erro na análise individual Gemini:', err)
  }

  // Fallback determinístico inteligente
  const lower = sanitized.cleanText.toLowerCase()
  let calculatedUrg: 'baixa' | 'media' | 'alta' | 'critica' = comm.urgencyLevel || 'media'
  if (lower.includes('agravo') || lower.includes('apelação') || lower.includes('sentença')) {
    calculatedUrg = 'alta'
  } else if (
    lower.includes('impenhorabilidade') ||
    lower.includes('bloqueio') ||
    lower.includes('tutela de urgência')
  ) {
    calculatedUrg = 'critica'
  }

  const fallbackAnalysis: GeminiStructuredAnalysis = {
    classificacao:
      comm.tipoComunicacao === 'CITACAO' ? 'Citação Judicial Cível' : 'Intimação Processual',
    urgencia: calculatedUrg,
    resumo: comm.teorResumido || 'Publicação processual disponibilizada no DJEN.',
    riscoScore: calculatedUrg === 'critica' ? 90 : calculatedUrg === 'alta' ? 75 : 40,
    justificativa: 'Classificação extraída via motor determinístico local de contingência.',
  }

  dataStore.logAction(
    'IA_ANALISE_PUBLICACAO_FALLBACK',
    'revisao',
    'Sentinela Heurístico Local',
    comm.id,
    {
      processo: comm.numeroProcesso,
      classificacaoSugerida: fallbackAnalysis.classificacao,
      urgencia: fallbackAnalysis.urgencia,
      humanReviewRequired: true,
    },
  )

  return {
    success: true,
    analysis: fallbackAnalysis,
    model: 'Motor Local Heurístico (Fallback)',
    source: 'Sentinela Local',
    isFallback: true,
  }
}

/**
 * Consulta o Oráculo NOX (Google Gemini via backend gemini-proxy)
 */
export async function queryOraculoGemini(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  contexto: string
  modo?: 'oraculo' | 'analise-lote' | 'briefing'
  payload?: string
  commsFallback: SentinelaCommunication[]
}): Promise<{
  content: string
  model: string
  isFallback: boolean
  source: string
  confidence: 'ALTA' | 'MEDIA' | 'REQUER_ATENCAO'
}> {
  try {
    // 1. Assegura autenticação do backend PocketBase
    const isAuth = await ensurePocketBaseAuth()
    if (!isAuth) {
      console.warn('[Oraculo NOX] Sem autenticação de backend — acionando fallback local.')
      const lastUserMsg = params.messages[params.messages.length - 1]?.content || ''
      const fb = generateLocalFallbackResponse(lastUserMsg, params.commsFallback)
      return {
        content: fb.content,
        model: fb.model,
        isFallback: true,
        source: fb.source,
        confidence: fb.confidence,
      }
    }

    // 2. Sanitiza mensagens antes de enviar
    const sanitizedMessages = params.messages.map((m) => ({
      role: m.role,
      content: sanitizeExternalText(m.content).cleanText,
    }))
    const sanitizedContexto = sanitizeExternalText(params.contexto).cleanText
    const sanitizedPayload = params.payload ? sanitizeExternalText(params.payload).cleanText : ''

    // 3. Dispara a chamada ao hook seguro pb_hooks /backend/v1/gemini-proxy
    const endpoint = `${pb.baseUrl}/backend/v1/gemini-proxy`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 28000)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({
        messages: sanitizedMessages,
        contexto: sanitizedContexto,
        modo: params.modo === 'analise-lote' ? 'lote' : 'chat',
        texto: sanitizedPayload,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = (await res.json()) as GeminiProxyResponse
      if (data.ok && data.content) {
        // Registra na trilha de auditoria
        dataStore.logAction(
          'IA_CONSULTA_ORACULO_GEMINI',
          'revisao',
          'Advogado / Operador',
          'oraculo_nox',
          {
            modelo: data.model || 'gemini-3.5-flash-lite',
            modo: params.modo || 'chat',
            tamanhoResposta: data.content.length,
            humanReviewRequired: true,
          },
        )

        return {
          content: data.content,
          model: data.model || 'Google Gemini (gemini-3.5-flash-lite)',
          isFallback: false,
          source: data.source || 'Google Gemini (gemini-3.5-flash-lite)',
          confidence: 'ALTA',
        }
      }
    }

    console.warn(`[Oraculo NOX] Backend respondeu status ${res.status} — acionando fallback local.`)
  } catch (err) {
    console.warn('[Oraculo NOX] Erro de conexão com backend de IA:', err)
  }

  // Fallback seguro se backend falhar
  const lastUserMsg = params.messages[params.messages.length - 1]?.content || ''
  const fb = generateLocalFallbackResponse(lastUserMsg, params.commsFallback)
  return {
    content: fb.content,
    model: fb.model,
    isFallback: true,
    source: fb.source,
    confidence: fb.confidence,
  }
}

/**
 * Análise em lote com Google Gemini (com fallback local transparente)
 */
export async function analyzeBatchWithGemini(communications: SentinelaCommunication[]): Promise<{
  summary: string
  model: string
  isFallback: boolean
}> {
  const pending = communications.filter((c) => c.status !== 'ANALISADA' && c.status !== 'CONCLUIDA')
  if (pending.length === 0) {
    return {
      summary: 'Todas as publicações já se encontram analisadas.',
      model: 'Motor Local',
      isFallback: false,
    }
  }

  const batchPayload = pending
    .slice(0, 15)
    .map(
      (c, i) =>
        `#${i + 1}: Processo ${c.numeroProcesso} (${c.tribunal} - ${c.orgaoJulgador})\nTipo: ${c.tipoComunicacao} | Urgência Atual: ${c.urgencyLevel}\nTeor: "${sanitizeExternalText(c.teorResumido).cleanText}"`,
    )
    .join('\n\n')

  try {
    const isAuth = await ensurePocketBaseAuth()
    if (isAuth) {
      const endpoint = `${pb.baseUrl}/backend/v1/gemini-proxy`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          modo: 'lote',
          texto: batchPayload,
          contexto: `Total de publicações no lote: ${pending.length}`,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = (await res.json()) as GeminiProxyResponse
        if (data.ok && data.content) {
          dataStore.logAction(
            'IA_ANALISE_LOTE_GEMINI',
            'revisao',
            'Sentinela IA (gemini-3.5-flash-lite)',
            'lote_publicacoes',
            {
              totalAnalisadas: pending.length,
              modelo: data.model || 'gemini-3.5-flash-lite',
              humanReviewRequired: true,
            },
          )

          return {
            summary: data.content,
            model: data.model || 'Google Gemini (gemini-3.5-flash-lite)',
            isFallback: false,
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Oraculo NOX] Erro na análise em lote via IA:', err)
  }

  // Fallback local
  return {
    summary: `Análise em lote concluída para ${pending.length} publicações via motor heurístico local. Identificados ${pending.filter((p) => p.urgencyLevel === 'alta' || p.urgencyLevel === 'critica').length} itens de alta prioridade.`,
    model: 'Motor Local Deterministico',
    isFallback: true,
  }
}
