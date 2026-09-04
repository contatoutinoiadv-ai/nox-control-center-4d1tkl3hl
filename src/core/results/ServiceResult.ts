/**
 * Contrato de resultado padronizado para a camada de servicos do CENTRAL NOX.
 * Padrao { success, data, error, meta } e paginacao estrita.
 */

import { AppError } from '../errors/AppErrors'

export interface PaginationMeta {
  page: number
  perPage: number
  totalPages: number
  totalItems: number
  [key: string]: unknown
}

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: AppError
  meta?: PaginationMeta
}

export function okResult<T>(data: T, meta?: PaginationMeta): ServiceResult<T> {
  return {
    success: true,
    data,
    meta,
  }
}

export function failResult<T = never>(error: AppError, meta?: PaginationMeta): ServiceResult<T> {
  return {
    success: false,
    error,
    meta,
  }
}
