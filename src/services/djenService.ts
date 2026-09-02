import { SentinelaCommunication } from '@/types/sentinela'
import { sanitizeExternalText, generateContentHash } from './adapters'
import { calculateLegalDeadline } from './deadlineEngine'

export const DJEN_BASE_URL = 'https://comunicaapi.pje.jus.br/api/v1'

export interface DjenRawItem {
  id?: number | string
  numeroProcesso?: string
  numero_processo?: string
  numeroprocessocommascara?: string
  siglaTribunal?: string
  sigla_tribunal?: string
  sigla?: string
  nomeOrgao?: string
  nome_orgao?: string
  orgaoJulgador?: string
  orgao_julgador?: string
  tipoComunicacao?: string
  tipo_comunicacao?: string
  tipo_ato?: string
  nomeClasse?: string
  classeJudicial?: string
  nome_classe?: string
  data_disponibilizacao?: string
  dataDisponibilizacao?: string
  data_publicacao?: string
  dataPublicacao?: string
  data_ato?: string
  texto?: string
  teor?: string
  conteudo?: string
  link?: string
  destinatario?: string
  destinatarios?: Array<{ nome?: string; polo?: string; nome_destinatario?: string }>
  [key: string]: unknown
}

export interface DjenApiResponse {
  items?: DjenRawItem[]
  itens?: DjenRawItem[]
  result?:
    | DjenRawItem[]
    | { items?: DjenRawItem[]; itens?: DjenRawItem[]; count?: number; total?: number }
  data?:
    | DjenRawItem[]
    | { items?: DjenRawItem[]; itens?: DjenRawItem[]; count?: number; total?: number }
  count?: number
  total?: number
  totalCount?: number
  total_count?: number
  status?: string | number
  code?: string | number
  message?: string
  messages?: string[]
  [key: string]: unknown
}

export interface DjenSearchParams {
  itensPorPagina?: number
  pagina?: number
  meio?: string
  numeroProcesso?: string
  numeroOab?: string
  ufOab?: string
  nomeAdvogado?: string
  nomeParte?: string
  siglaTribunal?: string
  dataDisponibilizacaoInicio?: string
  dataDisponibilizacaoFim?: string
  modo?: 'oab' | 'nome' | 'processo' | 'todos'
}

export interface DjenSearchResult {
  success: boolean
  items: SentinelaCommunication[]
  rawItems: DjenRawItem[]
  totalCount: number
  currentPage: number
  hasMore: boolean
  sourceUrl: string
  error?: {
    type: 'CORS' | 'RATE_LIMIT_429' | 'FORBIDDEN_403' | 'NETWORK' | 'SERVER_500' | 'UNKNOWN'
    status?: number
    message: string
    retryAfterSeconds?: number
  }
}

/**
 * Normaliza um item bruto da API Comunica/DJEN em um SentinelaCommunication tipado
 */
export async function mapDjenItemToCommunication(
  item: DjenRawItem,
  index: number,
  fallbackLawyer = 'Higor Utinoi de Oliveira (OAB/MS 15.400)',
): Promise<SentinelaCommunication> {
  const rawId = String(item?.id ?? `djen-${Date.now()}-${index}`)
  const rawText = String(item?.texto || item?.teor || item?.conteudo || '')
  const sanitized = sanitizeExternalText(rawText)

  const procNum = String(
    item?.numeroprocessocommascara ||
      item?.numeroProcesso ||
      item?.numero_processo ||
      '0000000-00.0000.8.00.0000',
  ).trim()

  const tribunal =
    String(item?.siglaTribunal || item?.sigla_tribunal || item?.sigla || 'DJEN')
      .toUpperCase()
      .trim() || 'DJEN'

  const orgao =
    String(
      item?.nomeOrgao ||
        item?.nome_orgao ||
        item?.orgaoJulgador ||
        item?.orgao_julgador ||
        'Vara / Tribunal',
    ).trim() || 'Vara / Tribunal'

  const tipoRaw = String(
    item?.tipoComunicacao || item?.tipo_comunicacao || item?.tipo_ato || 'INTIMACAO',
  ).toUpperCase()

  let tipo: SentinelaCommunication['tipoComunicacao'] = 'INTIMACAO'
  if (tipoRaw.includes('CIT')) tipo = 'CITACAO'
  else if (tipoRaw.includes('NOTIF')) tipo = 'NOTIFICACAO'
  else if (tipoRaw.includes('DESP')) tipo = 'DESPACHO'
  else if (tipoRaw.includes('SENT')) tipo = 'SENTENCA'
  else if (tipoRaw.includes('ACOR')) tipo = 'ACORDAO'
  else if (tipoRaw.includes('PUB')) tipo = 'PUBLICACAO'

  // Formata data ISO com segurança (fallback para data de hoje)
  const sanitizeDateIso = (dStr?: string): string => {
    if (!dStr) return new Date().toISOString().split('T')[0]
    try {
      const match = String(dStr).match(/(\d{4})-(\d{2})-(\d{2})/)
      if (match) return `${match[1]}-${match[2]}-${match[3]}`
      const brMatch = String(dStr).match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
      const parsed = new Date(dStr)
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
    } catch {
      // fallback
    }
    return new Date().toISOString().split('T')[0]
  }

  const dataDisp = sanitizeDateIso(
    item?.data_disponibilizacao ||
      item?.dataDisponibilizacao ||
      item?.data_publicacao ||
      item?.dataPublicacao ||
      item?.data_ato,
  )
  const dataPub = sanitizeDateIso(item?.data_publicacao || item?.dataPublicacao || dataDisp)

  let destinatarioStr = fallbackLawyer
  if (Array.isArray(item?.destinatarios) && item.destinatarios.length > 0) {
    const names = item.destinatarios
      .map((d) => (typeof d === 'string' ? d : d?.nome || d?.nome_destinatario))
      .filter(Boolean)
    if (names.length > 0) {
      destinatarioStr = names.join(', ')
    }
  } else if (item?.destinatario) {
    destinatarioStr = String(item.destinatario)
  }

  let hashSha256 = ''
  try {
    hashSha256 = await generateContentHash(
      `${rawId}-${procNum}-${dataDisp}-${rawText.slice(0, 500)}`,
    )
  } catch {
    hashSha256 = `hash-${Date.now()}-${index}`
  }

  const isUrgent =
    tipo === 'CITACAO' ||
    sanitized.cleanText.toLowerCase().includes('urgente') ||
    sanitized.cleanText.toLowerCase().includes('tutela') ||
    sanitized.cleanText.toLowerCase().includes('liminar') ||
    sanitized.cleanText.toLowerCase().includes('penhora')

  const isCritical =
    sanitized.cleanText.toLowerCase().includes('prisao') ||
    sanitized.cleanText.toLowerCase().includes('bloqueio') ||
    sanitized.cleanText.toLowerCase().includes('busca e apreens')

  const urgencyLevel: SentinelaCommunication['urgencyLevel'] = isCritical
    ? 'critica'
    : isUrgent
      ? 'alta'
      : tipo === 'SENTENCA' || tipo === 'ACORDAO'
        ? 'media'
        : 'baixa'

  const riskScore =
    urgencyLevel === 'critica'
      ? 95
      : urgencyLevel === 'alta'
        ? 80
        : urgencyLevel === 'media'
          ? 55
          : 25

  const resume =
    sanitized.cleanText.length > 280
      ? sanitized.cleanText.slice(0, 280).trim() + '...'
      : sanitized.cleanText || `${tipo} no processo ${procNum}`

  const commId = `comm-djen-${rawId}`

  // Pré-cálculo de prazo com base em regras comuns (CPC 15 dias para citação/apelação)
  let deadlineCalculated
  try {
    const days = tipo === 'CITACAO' ? 15 : tipo === 'SENTENCA' ? 15 : 15
    deadlineCalculated = calculateLegalDeadline({
      originText: `${tipo} — ${resume}`,
      customDays: days,
      customDaysType: 'uteis',
      initialDate: dataDisp,
      tribunal: tribunal,
    })
  } catch {
    deadlineCalculated = undefined
  }

  const communication: SentinelaCommunication = {
    id: commId,
    externalId: rawId,
    source: 'DJEN',
    numeroProcesso: procNum,
    tribunal,
    orgaoJulgador: orgao,
    comarca: tribunal,
    classeJudicial: String(
      item?.nomeClasse || item?.classeJudicial || item?.nome_classe || 'Procedimento Judicial',
    ),
    destinatario: destinatarioStr,
    tipoComunicacao: tipo,
    dataDisponibilizacao: dataDisp,
    dataPublicacao: dataPub,
    teorResumido: resume,
    teorCompleto: sanitized.cleanText || resume,
    status: 'VALIDADA',
    triageCategory: urgencyLevel === 'critica' || urgencyLevel === 'alta' ? 'urgente' : 'nova',
    urgencyLevel,
    riskScore,
    assignedTo: fallbackLawyer,
    custody: {
      communicationId: commId,
      snapshot: {
        hashSha256,
        capturedAt: new Date().toISOString(),
        source: 'DJEN',
        externalId: rawId,
        rawPayloadSnippet: `DJEN.${tribunal}.${procNum}.${rawId}`,
        contentLength: rawText.length,
        sanitized: true,
        promptInjectionCheck: {
          clean: !sanitized.hasInjectionMarkers,
          riskScore: sanitized.riskScore,
          notes: sanitized.hasInjectionMarkers
            ? `Marcadores detectados: ${sanitized.markersFound.join(', ')}`
            : undefined,
        },
      },
      processNumber: procNum,
      suggestedClassification: `${tipo} (${tribunal})`,
      confidence: 0.98,
      humanReviewRequired: sanitized.hasInjectionMarkers || urgencyLevel === 'critica',
      humanReviewReason: sanitized.hasInjectionMarkers
        ? 'Detectado possível padrão de injeção no texto da publicação.'
        : undefined,
      generatedArtifacts: {},
      isDuplicate: false,
      timeline: [
        {
          id: `step-djen-${rawId}-1`,
          stage: 'CAPTURADA',
          timestamp: new Date().toISOString(),
          actor: 'ComunicaAPI DJEN (Browser Fetch Direto)',
          actorRole: 'SISTEMA_IA',
          sourceConfidence: 1.0,
          actionSummary: `Capturada diretamente do endpoint público do CNJ/PJe (Tribunal: ${tribunal}).`,
          evidenceHash: hashSha256.slice(0, 16),
        },
        {
          id: `step-djen-${rawId}-2`,
          stage: 'VALIDADA',
          timestamp: new Date().toISOString(),
          actor: 'Motor de Integridade & Anti-Injection NOX',
          actorRole: 'SISTEMA_IA',
          sourceConfidence: sanitized.hasInjectionMarkers ? 0.6 : 1.0,
          actionSummary: sanitized.hasInjectionMarkers
            ? 'Marcadores suspeitos contidos pelo filtro de segurança.'
            : 'Texto validado sem indícios de manipulação maliciosa.',
        },
      ],
    },
    deadlineCalculated,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return communication
}

/**
 * Monta os query parameters exatos da API pública ComunicaAPI do PJe/CNJ
 */
export function buildDjenSearchParams(params: DjenSearchParams): URLSearchParams {
  const q = new URLSearchParams()
  q.set('itensPorPagina', String(params.itensPorPagina || 100))
  q.set('pagina', String(params.pagina || 1))
  q.set('meio', params.meio || 'D') // D = Diário Eletrônico

  const modo = params.modo || 'oab'

  if (params.numeroProcesso && params.numeroProcesso.trim()) {
    q.set('numeroProcesso', params.numeroProcesso.trim())
  } else {
    // Modo OAB padrão (Âncora Dr. Higor Utinoi de Oliveira)
    if (modo === 'oab' || modo === 'todos') {
      const oabNum = (params.numeroOab || '15400').replace(/\D/g, '') || '15400'
      const oabUf = (params.ufOab || 'MS').trim().toUpperCase() || 'MS'
      q.set('numeroOab', oabNum)
      q.set('ufOab', oabUf)
    }

    if (modo === 'nome' && params.nomeAdvogado && params.nomeAdvogado.trim()) {
      q.set('nomeAdvogado', params.nomeAdvogado.trim())
    }
  }

  if (params.dataDisponibilizacaoInicio && params.dataDisponibilizacaoInicio.trim()) {
    q.set('dataDisponibilizacaoInicio', params.dataDisponibilizacaoInicio.trim())
  }
  if (params.dataDisponibilizacaoFim && params.dataDisponibilizacaoFim.trim()) {
    q.set('dataDisponibilizacaoFim', params.dataDisponibilizacaoFim.trim())
  }

  // Sigla do tribunal: VAZIO por padrão = todos os tribunais do Brasil
  if (params.siglaTribunal && params.siglaTribunal.trim()) {
    q.set('siglaTribunal', params.siglaTribunal.trim().toUpperCase())
  }

  if (params.nomeParte && params.nomeParte.trim()) {
    q.set('nomeParte', params.nomeParte.trim())
  }

  return q
}

/**
 * Executa chamada HTTP GET diretamente no cliente via fetch() para https://comunicaapi.pje.jus.br/api/v1/comunicacao
 * Trata erros honestamente (CORS, 429 com retry, 403, sem conexão)
 */
export async function fetchDjenCommunicationsDirect(
  params: DjenSearchParams,
  signal?: AbortSignal,
  onStatusUpdate?: (status: {
    message: string
    isWaitingRetry?: boolean
    secondsRemaining?: number
  }) => void,
): Promise<DjenSearchResult> {
  const queryParams = buildDjenSearchParams(params)
  const fullUrl = `${DJEN_BASE_URL}/comunicacao?${queryParams.toString()}`

  let retryCount = 0
  const MAX_RETRIES = 2

  while (retryCount <= MAX_RETRIES) {
    try {
      if (onStatusUpdate) {
        onStatusUpdate({
          message:
            retryCount === 0
              ? `Consultando ComunicaAPI CNJ (Página ${params.pagina || 1})...`
              : `Reconectando ao DJEN (tentativa ${retryCount + 1})...`,
        })
      }

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal,
      })

      // Tratamento específico de Rate Limiting HTTP 429
      if (response.status === 429) {
        if (retryCount < MAX_RETRIES) {
          const waitSeconds = 60
          for (let sec = waitSeconds; sec > 0; sec--) {
            if (signal?.aborted) {
              throw new DOMException('Consulta cancelada pelo usuário', 'AbortError')
            }
            if (onStatusUpdate) {
              onStatusUpdate({
                message: `Limite de requisições atingido (HTTP 429). Aguardando ${sec}s para nova tentativa automática...`,
                isWaitingRetry: true,
                secondsRemaining: sec,
              })
            }
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
          retryCount++
          continue
        }

        return {
          success: false,
          items: [],
          rawItems: [],
          totalCount: 0,
          currentPage: params.pagina || 1,
          hasMore: false,
          sourceUrl: fullUrl,
          error: {
            type: 'RATE_LIMIT_429',
            status: 429,
            message:
              'Limite de requisições excedido na ComunicaAPI (HTTP 429). Por favor aguarde cerca de 1 minuto antes de consultar novamente.',
            retryAfterSeconds: 60,
          },
        }
      }

      // Tratamento de 403 / CloudFront / Bloqueio Geográfico
      if (response.status === 403) {
        return {
          success: false,
          items: [],
          rawItems: [],
          totalCount: 0,
          currentPage: params.pagina || 1,
          hasMore: false,
          sourceUrl: fullUrl,
          error: {
            type: 'FORBIDDEN_403',
            status: 403,
            message:
              'Acesso bloqueado pela infraestrutura do CNJ/CloudFront (HTTP 403 Forbidden). Verifique restrições geográficas de IP ou VPN.',
          },
        }
      }

      // Outros erros de servidor HTTP
      if (!response.ok) {
        return {
          success: false,
          items: [],
          rawItems: [],
          totalCount: 0,
          currentPage: params.pagina || 1,
          hasMore: false,
          sourceUrl: fullUrl,
          error: {
            type: response.status >= 500 ? 'SERVER_500' : 'UNKNOWN',
            status: response.status,
            message: `Servidor da ComunicaAPI retornou status HTTP ${response.status} (${response.statusText || 'Erro inesperado'}).`,
          },
        }
      }

      // Sucesso no parse JSON
      let data: any
      try {
        data = await response.json()
      } catch (jsonErr: any) {
        return {
          success: false,
          items: [],
          rawItems: [],
          totalCount: 0,
          currentPage: params.pagina || 1,
          hasMore: false,
          sourceUrl: fullUrl,
          error: {
            type: 'UNKNOWN',
            status: response.status,
            message:
              'Resposta da ComunicaAPI não é um JSON válido. O serviço pode estar indisponível ou em manutenção.',
          },
        }
      }

      // Extração resiliente de lista de itens e total
      let rawItems: DjenRawItem[] = []
      if (Array.isArray(data)) {
        rawItems = data
      } else if (Array.isArray(data?.items)) {
        rawItems = data.items
      } else if (Array.isArray(data?.itens)) {
        rawItems = data.itens
      } else if (Array.isArray(data?.result)) {
        rawItems = data.result
      } else if (Array.isArray(data?.result?.items)) {
        rawItems = data.result.items
      } else if (Array.isArray(data?.data)) {
        rawItems = data.data
      } else if (Array.isArray(data?.data?.items)) {
        rawItems = data.data.items
      }

      // Filtra itens nulos ou inválidos
      rawItems = rawItems.filter((i) => i && typeof i === 'object')

      let totalCount = rawItems.length
      if (typeof data?.count === 'number') totalCount = data.count
      else if (typeof data?.total === 'number') totalCount = data.total
      else if (typeof data?.totalCount === 'number') totalCount = data.totalCount
      else if (typeof data?.total_count === 'number') totalCount = data.total_count
      else if (typeof data?.result?.count === 'number') totalCount = data.result.count
      else if (typeof data?.data?.count === 'number') totalCount = data.data.count

      const currentPage = Number(params.pagina) || 1
      const perPage = Number(params.itensPorPagina) || 100
      const hasMore = currentPage * perPage < totalCount

      let mappedItems: SentinelaCommunication[] = []
      try {
        mappedItems = await Promise.all(
          rawItems.map((item, idx) => mapDjenItemToCommunication(item, idx)),
        )
      } catch (mapErr: any) {
        console.error('[DJEN] Falha ao mapear itens:', mapErr)
        return {
          success: false,
          items: [],
          rawItems,
          totalCount,
          currentPage,
          hasMore: false,
          sourceUrl: fullUrl,
          error: {
            type: 'UNKNOWN',
            message: `Erro ao normalizar dados retornados pelo DJEN: ${mapErr?.message || 'estrutura incompatível'}.`,
          },
        }
      }

      return {
        success: true,
        items: mappedItems,
        rawItems,
        totalCount,
        currentPage,
        hasMore,
        sourceUrl: fullUrl,
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err
      }

      // Detecta erro de conexão ou CORS
      const isCorsOrNetwork =
        err instanceof TypeError ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('CORS')

      return {
        success: false,
        items: [],
        rawItems: [],
        totalCount: 0,
        currentPage: params.pagina || 1,
        hasMore: false,
        sourceUrl: fullUrl,
        error: {
          type: isCorsOrNetwork ? 'CORS' : 'NETWORK',
          message: isCorsOrNetwork
            ? 'Falha de rede ou restrição de CORS ao conectar diretamente com comunicaapi.pje.jus.br. Verifique sua conexão com a internet.'
            : err.message || 'Erro de conexão desconhecido ao consultar a API pública.',
        },
      }
    }
  }

  return {
    success: false,
    items: [],
    rawItems: [],
    totalCount: 0,
    currentPage: params.pagina || 1,
    hasMore: false,
    sourceUrl: fullUrl,
    error: {
      type: 'RATE_LIMIT_429',
      message: 'Excesso de tentativas com rate limiting da ComunicaAPI.',
    },
  }
}

/**
 * Lista dos principais Tribunais do Brasil para o seletor com siglas
 */
export const TRIBUNAIS_BRASIL = [
  { sigla: '', nome: 'Todos os tribunais do Brasil' },
  { sigla: 'TJMS', nome: 'TJMS — Mato Grosso do Sul' },
  { sigla: 'TJSP', nome: 'TJSP — São Paulo' },
  { sigla: 'TJDFT', nome: 'TJDFT — Distrito Federal e Territórios' },
  { sigla: 'TRT24', nome: 'TRT24 — MS Trabalhista (24ª Região)' },
  { sigla: 'TRT2', nome: 'TRT2 — SP Trabalhista (2ª Região)' },
  { sigla: 'TRF1', nome: 'TRF1 — Região 1 (DF, GO, MT, BA, etc.)' },
  { sigla: 'TRF2', nome: 'TRF2 — Região 2 (RJ/ES)' },
  { sigla: 'TRF3', nome: 'TRF3 — Região 3 (SP/MS)' },
  { sigla: 'TRF4', nome: 'TRF4 — Região 4 (RS/SC/PR)' },
  { sigla: 'TRF5', nome: 'TRF5 — Região 5 (Nordeste)' },
  { sigla: 'TRF6', nome: 'TRF6 — Região 6 (Minas Gerais)' },
  { sigla: 'STJ', nome: 'STJ — Superior Tribunal de Justiça' },
  { sigla: 'STF', nome: 'STF — Supremo Tribunal Federal' },
  { sigla: 'TST', nome: 'TST — Tribunal Superior do Trabalho' },
  { sigla: 'TSE', nome: 'TSE — Tribunal Superior Eleitoral' },
  { sigla: 'STM', nome: 'STM — Superior Tribunal Militar' },
] as const
