/**
 * Utilitário central de normalização de telefones brasileiros e internacionais para o NOX.
 *
 * Regras:
 * - Country Code padrão Brasil (+55) quando não informado ou número com 10/11 dígitos.
 * - Suporta DDD (2 dígitos) + número (8 ou 9 dígitos).
 * - Trata o 9º dígito móvel brasileiro (ex: 11 98765-4321).
 * - Formato canônico internacional E.164 (ex: "+5511987654321").
 * - NUNCA comparar string bruta com pontuação/espaço.
 * - NUNCA inventar cliente porque os últimos dígitos coincidem sem validação de DDD/DDI.
 */

export interface NormalizedPhoneResult {
  isValid: boolean
  raw: string
  digitsOnly: string
  countryCode: string
  areaCode: string // DDD
  subscriberNumber: string // Número local
  e164: string // ex: "+5511987654321"
  formattedBr: string // ex: "+55 (11) 98765-4321" ou "(11) 98765-4321"
  isMobile: boolean
  isBrazilian: boolean
  errorReason?: string
}

export function normalizePhoneNumber(input: string | undefined | null): NormalizedPhoneResult {
  const raw = (input || '').trim()
  if (!raw) {
    return {
      isValid: false,
      raw: '',
      digitsOnly: '',
      countryCode: '',
      areaCode: '',
      subscriberNumber: '',
      e164: '',
      formattedBr: '',
      isMobile: false,
      isBrazilian: false,
      errorReason: 'Número de telefone vazio ou não informado.',
    }
  }

  // Remove caracteres não numéricos
  let digits = raw.replace(/\D/g, '')

  // Remove zeros à esquerda no DDD/DDI se houver
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }

  // Se o número começa com 0 e tem 11 ou 12 dígitos (ex: 011987654321), retira o 0 de operadora/DDD
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1)
  }

  let countryCode = '55'
  let areaCode = ''
  let subscriberNumber = ''
  let isBrazilian = true

  // Regra Brasil:
  // Se tem 10 dígitos (DDD + 8 dígitos fixo) ou 11 dígitos (DDD + 9 dígitos celular)
  if (digits.length === 10 || digits.length === 11) {
    countryCode = '55'
    areaCode = digits.slice(0, 2)
    subscriberNumber = digits.slice(2)
  } else if (digits.length === 12 || digits.length === 13) {
    // Possivelmente já tem 55 no início
    if (digits.startsWith('55')) {
      countryCode = '55'
      areaCode = digits.slice(2, 4)
      subscriberNumber = digits.slice(4)
    } else {
      // DDI estrangeiro genérico
      isBrazilian = false
      countryCode = digits.slice(0, digits.length - 10)
      areaCode = digits.slice(digits.length - 10, digits.length - 8)
      subscriberNumber = digits.slice(digits.length - 8)
    }
  } else if (digits.length === 8 || digits.length === 9) {
    // Número sem DDD: incompleto para roteamento seguro
    return {
      isValid: false,
      raw,
      digitsOnly: digits,
      countryCode: '55',
      areaCode: '',
      subscriberNumber: digits,
      e164: '',
      formattedBr: digits,
      isMobile: digits.length === 9,
      isBrazilian: true,
      errorReason: 'Número sem DDD informado. Não é possível determinar o titular com segurança.',
    }
  } else if (digits.length > 13) {
    // Formato internacional longo
    isBrazilian = digits.startsWith('55')
    countryCode = digits.slice(0, 2)
    areaCode = digits.slice(2, 4)
    subscriberNumber = digits.slice(4)
  } else {
    return {
      isValid: false,
      raw,
      digitsOnly: digits,
      countryCode: '',
      areaCode: '',
      subscriberNumber: '',
      e164: '',
      formattedBr: raw,
      isMobile: false,
      isBrazilian: false,
      errorReason: 'Comprimento inválido para número de telefone.',
    }
  }

  // Validação do DDD brasileiro (11 a 99)
  if (isBrazilian) {
    const dddNum = parseInt(areaCode, 10)
    if (isNaN(dddNum) || dddNum < 11 || dddNum > 99) {
      return {
        isValid: false,
        raw,
        digitsOnly: digits,
        countryCode: '55',
        areaCode,
        subscriberNumber,
        e164: '',
        formattedBr: raw,
        isMobile: false,
        isBrazilian: true,
        errorReason: `DDD brasileiro inválido: ${areaCode}.`,
      }
    }
  }

  const isMobile = subscriberNumber.length === 9 && subscriberNumber.startsWith('9')
  const e164 = `+${countryCode}${areaCode}${subscriberNumber}`

  // Formatação legível
  let formattedBr = ''
  if (isBrazilian) {
    if (subscriberNumber.length === 9) {
      formattedBr = `+${countryCode} (${areaCode}) ${subscriberNumber.slice(0, 5)}-${subscriberNumber.slice(5)}`
    } else if (subscriberNumber.length === 8) {
      formattedBr = `+${countryCode} (${areaCode}) ${subscriberNumber.slice(0, 4)}-${subscriberNumber.slice(4)}`
    } else {
      formattedBr = e164
    }
  } else {
    formattedBr = e164
  }

  return {
    isValid: true,
    raw,
    digitsOnly: `${countryCode}${areaCode}${subscriberNumber}`,
    countryCode,
    areaCode,
    subscriberNumber,
    e164,
    formattedBr,
    isMobile,
    isBrazilian,
  }
}

/**
 * Compara dois números de telefone de forma estrita.
 * NUNCA considera correspondência apenas por sufixo ou últimos 4 dígitos.
 * Exige mesmo DDD e mesmo número de assinante.
 */
export function arePhonesEquivalent(
  phoneA: string | undefined | null,
  phoneB: string | undefined | null,
): boolean {
  const normA = normalizePhoneNumber(phoneA)
  const normB = normalizePhoneNumber(phoneB)

  if (!normA.isValid || !normB.isValid) {
    return false
  }

  // Comparação canônica pelo formato E.164
  return normA.e164 === normB.e164
}
