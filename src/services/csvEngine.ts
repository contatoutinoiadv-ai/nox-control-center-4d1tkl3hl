import { RawSentinelaRow, ValidationIssue } from '@/types/nox'

/**
 * Calculates SHA-256 hash from ArrayBuffer or string using Web Crypto API.
 */
export async function calculateSha256(data: ArrayBuffer | string): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Detects encoding from byte array (checks UTF-8 BOM, UTF-16, ISO-8859-1).
 */
export function detectEncodingAndBom(bytes: Uint8Array): {
  encoding: string
  hasBom: boolean
  strippedText: string
} {
  // Check UTF-8 BOM: EF BB BF
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const text = new TextDecoder('utf-8').decode(bytes.subarray(3))
    return { encoding: 'UTF-8 (BOM detectado)', hasBom: true, strippedText: text }
  }

  // Check UTF-16 LE: FF FE
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    const text = new TextDecoder('utf-16le').decode(bytes.subarray(2))
    return { encoding: 'UTF-16 LE (BOM detectado)', hasBom: true, strippedText: text }
  }

  // Fallback try UTF-8 decoding
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return { encoding: 'UTF-8', hasBom: false, strippedText: text }
  } catch {
    // Fallback ISO-8859-1 / Windows-1252
    const text = new TextDecoder('iso-8859-1').decode(bytes)
    return { encoding: 'ISO-8859-1 (Latin1)', hasBom: false, strippedText: text }
  }
}

/**
 * Detects CSV delimiter by frequency in top lines (;, ,, \t, |).
 */
export function detectCsvDelimiter(sampleText: string): string {
  const lines = sampleText
    .split(/\r?\n/)
    .slice(0, 5)
    .filter((l) => l.trim().length > 0)
  if (lines.length === 0) return ';'

  const candidates = [';', ',', '\t', '|']
  const scores: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 }

  for (const delim of candidates) {
    const counts = lines.map((line) => {
      let count = 0
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes
        else if (line[i] === delim && !inQuotes) count++
      }
      return count
    })

    // Check if count is > 0 and reasonably uniform across lines
    const first = counts[0]
    if (first > 0 && counts.every((c) => c === first)) {
      scores[delim] += first * 10
    } else {
      scores[delim] += counts.reduce((a, b) => a + b, 0)
    }
  }

  const best = candidates.reduce((prev, curr) => (scores[curr] > scores[prev] ? curr : prev), ';')
  return scores[best] > 0 ? best : ';'
}

/**
 * Robust CSV parser that handles multi-line fields, escaped quotes, and empty values.
 */
export function parseCsvRows(
  text: string,
  delimiter = ';',
): { headers: string[]; rows: RawSentinelaRow[]; rawRows: string[][] } {
  const lines: string[][] = []
  let currentRow: string[] = []
  let currentVal = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentVal.trim())
      currentVal = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      currentRow.push(currentVal.trim())
      currentVal = ''
      if (currentRow.some((col) => col.length > 0)) {
        lines.push(currentRow)
      }
      currentRow = []
    } else {
      currentVal += char
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim())
    if (currentRow.some((col) => col.length > 0)) {
      lines.push(currentRow)
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [], rawRows: [] }
  }

  const headers = lines[0].map((h) => h.replace(/^["']|["']$/g, '').trim())
  const rows: RawSentinelaRow[] = []

  for (let r = 1; r < lines.length; r++) {
    const rowObj: RawSentinelaRow = {}
    const rowData = lines[r]
    headers.forEach((h, idx) => {
      rowObj[h] = rowData[idx] ?? ''
    })
    // Also save unrecognized extra columns under __extra
    if (rowData.length > headers.length) {
      rowObj['__extra_columns'] = rowData.slice(headers.length).join('|')
    }
    rows.push(rowObj)
  }

  return { headers, rows, rawRows: lines }
}

/**
 * Sanitizes CSV fields to neutralize CSV Formula Injection (=, +, -, @, \t, \r)
 * ONLY applied to derived/exported files; the original raw bytes are NEVER altered.
 */
export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)

  // If starting with formula triggers, prepend a single apostrophe '
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  // Escape double quotes and wrap in quotes if contains delimiter or newline or quotes
  if (
    str.includes('"') ||
    str.includes(';') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Validates a single imported row against NOX quality rules.
 */
export function validateImportedRow(
  row: RawSentinelaRow,
  index: number,
): {
  isValid: boolean
  issues: ValidationIssue[]
  severitySuggestion: 'informativo' | 'medio' | 'alto' | 'critico'
} {
  const issues: ValidationIssue[] = []

  // Find standard process number field
  const processoKey = Object.keys(row).find((k) => /processo|cnj|numero/i.test(k))
  const processoVal = processoKey ? String(row[processoKey] || '').trim() : ''

  if (!processoVal) {
    issues.push({
      field: processoKey || 'numero_processo',
      type: 'missing_field',
      message: `Linha ${index}: Identificador do processo ausente ou vazio.`,
      severity: 'error',
    })
  } else if (!/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(processoVal)) {
    issues.push({
      field: processoKey || 'numero_processo',
      type: 'format_error',
      message: `Linha ${index}: Formato do processo "${processoVal}" diverge da numeração única CNJ.`,
      severity: 'warning',
    })
  }

  // Tribunal check
  const tribunalKey = Object.keys(row).find((k) => /tribunal|sigla/i.test(k))
  if (!tribunalKey || !row[tribunalKey]) {
    issues.push({
      field: 'tribunal',
      type: 'missing_field',
      message: `Linha ${index}: Tribunal de origem não identificado.`,
      severity: 'warning',
    })
  }

  const hasError = issues.some((i) => i.severity === 'error')
  const hasWarning = issues.length > 0

  let severitySuggestion: 'informativo' | 'medio' | 'alto' | 'critico' = 'informativo'
  if (hasError) severitySuggestion = 'alto'
  else if (hasWarning) severitySuggestion = 'medio'

  return {
    isValid: !hasError,
    issues,
    severitySuggestion,
  }
}
