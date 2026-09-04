/**
 * Categorizacao formal de erros do sistema CENTRAL NOX.
 * Nunca expoe stack traces ou detalhes sensiveis na mensagem visivel.
 * Sem uso de travesao em mensagens ou documentacao.
 */

export type ErrorCategory =
  | 'NetworkError'
  | 'AuthenticationError'
  | 'PermissionError'
  | 'ValidationError'
  | 'NotFoundError'
  | 'IntegrationError'

export interface AppErrorDetails {
  category: ErrorCategory
  message: string
  code?: string
  fieldErrors?: Record<string, string>
  originalError?: unknown
}

export class AppError extends Error {
  public readonly category: ErrorCategory
  public readonly code?: string
  public readonly fieldErrors?: Record<string, string>
  public readonly isOperational: boolean

  constructor(details: AppErrorDetails) {
    super(details.message)
    this.name = details.category
    this.category = details.category
    this.code = details.code
    this.fieldErrors = details.fieldErrors
    this.isOperational = true
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Falha de comunicacao com o servidor. Verifique sua conexao de rede.') {
    super({ category: 'NetworkError', message, code: 'NETWORK_ERROR' })
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Sessao expirada ou nao autenticada. Efetue login novamente.') {
    super({ category: 'AuthenticationError', message, code: 'AUTH_REQUIRED' })
  }
}

export class PermissionError extends AppError {
  constructor(message = 'Acesso nao autorizado para esta operacao ou modulo.') {
    super({ category: 'PermissionError', message, code: 'FORBIDDEN' })
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string>) {
    super({ category: 'ValidationError', message, code: 'VALIDATION_FAILED', fieldErrors })
  }
}

export class NotFoundError extends AppError {
  constructor(entityName: string, identifier?: string) {
    const msg = identifier
      ? `${entityName} nao encontrado(a): ${identifier}`
      : `${entityName} nao encontrado(a).`
    super({ category: 'NotFoundError', message: msg, code: 'NOT_FOUND' })
  }
}

export class IntegrationError extends AppError {
  constructor(serviceName: string, detail?: string) {
    const msg = detail
      ? `Falha na integracao com ${serviceName}: ${detail}`
      : `Falha na integracao com ${serviceName}. O servico externo esta temporariamente inacessivel.`
    super({ category: 'IntegrationError', message: msg, code: 'INTEGRATION_FAILED' })
  }
}

export function normalizeError(
  err: unknown,
  defaultMessage = 'Ocorreu um erro na operacao.',
): AppError {
  if (err instanceof AppError) {
    return err
  }
  if (err instanceof Error) {
    const msg = err.message || defaultMessage
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Network request failed')
    ) {
      return new NetworkError()
    }
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      return new AuthenticationError()
    }
    if (msg.includes('403') || msg.includes('Forbidden')) {
      return new PermissionError()
    }
    if (msg.includes('404') || msg.includes('not found')) {
      return new NotFoundError('Recurso')
    }
    return new AppError({ category: 'IntegrationError', message: msg, originalError: err })
  }
  return new AppError({ category: 'IntegrationError', message: defaultMessage, originalError: err })
}
