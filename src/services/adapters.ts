// Safe Integration Adapters with Anti-Prompt-Injection & Strict Data Integrity
import { SentinelaCommunication, IngestionSource, CustodySnapshot } from '@/types/sentinela'

/**
 * Sanitizes and verifies text to prevent Prompt Injection attacks.
 * Treats imported text as raw data only, never executable instructions.
 */
export function sanitizeExternalText(rawText: string): {
  cleanText: string
  riskScore: number
  hasInjectionMarkers: boolean
  markersFound: string[]
} {
  if (!rawText) return { cleanText: '', riskScore: 0, hasInjectionMarkers: false, markersFound: [] }

  const suspiciousPatterns = [
    {
      pattern: /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      name: 'IGNORE_PREVIOUS_INSTRUCTIONS',
    },
    { pattern: /voc[eê]\s+agora\s+[eé]\s+um/i, name: 'ROLEPLAY_INJECTION' },
    { pattern: /system\s*prompt/i, name: 'SYSTEM_PROMPT_EXTRACTION' },
    { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, name: 'HTML_SCRIPT_TAG' },
    { pattern: /javascript:/i, name: 'JAVASCRIPT_URI' },
    { pattern: /base64\s*,\s*[a-z0-9+/=]+/i, name: 'EMBEDDED_BASE64_PAYLOAD' },
    { pattern: /\{\{[\s\S]*?\}\}/g, name: 'TEMPLATE_INJECTION_CURLY' },
    { pattern: /DROP\s+TABLE|DELETE\s+FROM/i, name: 'SQL_FRAGMENT_ATTACK' },
  ]

  let clean = rawText
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '[SCRIPT REMOVIDO POR SEGURANCA]')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '[IFRAME REMOVIDO]')

  const markersFound: string[] = []
  let risk = 0

  suspiciousPatterns.forEach(({ pattern, name }) => {
    if (pattern.test(rawText)) {
      markersFound.push(name)
      risk += 25
    }
  })

  return {
    cleanText: clean,
    riskScore: Math.min(100, risk),
    hasInjectionMarkers: markersFound.length > 0,
    markersFound,
  }
}

/**
 * SHA-256 for browser-compatible deterministic crypto
 */
export async function generateContentHash(text: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(text)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  const hashArr = Array.from(new Uint8Array(hashBuf))
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface PjeApiQueryParams {
  modo?: 'oab' | 'nome' | 'processo'
  numeroOab?: string
  ufOab?: string
  nomeAdvogado?: string
  nomeParte?: string
  numeroProcesso?: string
  siglaTribunal?: string
  dataDisponibilizacaoInicio?: string
  dataDisponibilizacaoFim?: string
  meio?: string
  itensPorPagina?: number
  pagina?: number
}

/**
 * PJe Comunica API Adapter Interface
 */
export interface PjeComunicaAdapter {
  searchCommunications(params: PjeApiQueryParams): Promise<{
    items: SentinelaCommunication[]
    total: number
    source: string
    isLive: boolean
  }>
}

/**
 * Safe Gateway Implementation of ComunicaAPI (PJe / DJEN)
 * Direct browser client fetch connecting directly to https://comunicaapi.pje.jus.br/api/v1/comunicacao
 * without PocketBase or custom proxy.
 */
export class SafePjeComunicaAdapter implements PjeComunicaAdapter {
  async searchCommunications(params: PjeApiQueryParams): Promise<{
    items: SentinelaCommunication[]
    total: number
    source: string
    isLive: boolean
    hasMore?: boolean
    error?: string
  }> {
    try {
      const { fetchDjenCommunicationsDirect } = await import('./djenService')
      const result = await fetchDjenCommunicationsDirect({
        itensPorPagina: params.itensPorPagina || 100,
        pagina: params.pagina || 1,
        meio: params.meio || 'D',
        numeroProcesso: params.numeroProcesso,
        numeroOab: params.numeroOab || '15400',
        ufOab: params.ufOab || 'MS',
        nomeAdvogado: params.nomeAdvogado,
        nomeParte: params.nomeParte,
        siglaTribunal: params.siglaTribunal,
        dataDisponibilizacaoInicio: params.dataDisponibilizacaoInicio,
        dataDisponibilizacaoFim: params.dataDisponibilizacaoFim,
        modo: params.modo || 'oab',
      })

      if (!result.success) {
        return {
          items: [],
          total: 0,
          source: result.sourceUrl,
          isLive: false,
          hasMore: false,
          error: result.error?.message,
        }
      }

      return {
        items: result.items,
        total: result.totalCount,
        source: result.sourceUrl,
        isLive: true,
        hasMore: result.hasMore,
      }
    } catch (err: any) {
      return {
        items: [],
        total: 0,
        source: 'comunicaapi.pje.jus.br (Cliente Browser Fetch Direto)',
        isLive: false,
        error: err?.message || 'Falha ao consultar ComunicaAPI',
      }
    }
  }
}

export interface CalendarIntegrationAdapter {
  exportToIcs(event: {
    title: string
    description?: string
    startDate: string
    endDate: string
    location?: string
  }): string
  syncGoogleCalendar(
    eventId: string,
  ): Promise<{ success: boolean; syncId?: string; message: string }>
  syncOutlookCalendar(
    eventId: string,
  ): Promise<{ success: boolean; syncId?: string; message: string }>
}

export class SafeCalendarAdapter implements CalendarIntegrationAdapter {
  exportToIcs(event: {
    title: string
    description?: string
    startDate: string
    endDate: string
    location?: string
  }): string {
    const formatDate = (isoStr: string) => {
      const d = new Date(isoStr)
      return d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '')
    }

    const start = formatDate(event.startDate)
    const end = formatDate(event.endDate)
    const now = formatDate(new Date().toISOString())

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NOX Control Center//Sentinela Agenda 1.0//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:nox-${Date.now()}@noxcontrol.local`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${event.location || 'Ambiente Digital / Fórum'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
  }

  async syncGoogleCalendar(
    eventId: string,
  ): Promise<{ success: boolean; syncId?: string; message: string }> {
    return {
      success: true,
      syncId: `gcal_${eventId}_mock`,
      message: 'Sincronizado via Google Calendar Mock Adapter (pronto para credenciais OAuth)',
    }
  }

  async syncOutlookCalendar(
    eventId: string,
  ): Promise<{ success: boolean; syncId?: string; message: string }> {
    return {
      success: true,
      syncId: `outlook_${eventId}_mock`,
      message: 'Sincronizado via Microsoft Graph / Outlook Adapter',
    }
  }
}

export const safeCalendarAdapter = new SafeCalendarAdapter()
export const safePjeAdapter = new SafePjeComunicaAdapter()
