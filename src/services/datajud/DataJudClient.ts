/**
 * Cliente HTTP puro para comunicacao com endpoints DataJud no backend PocketBase.
 * Encapsula rotas HTTP, tokens JWT e serializacao de requisicao sem regras de tela.
 */

import pb from '@/lib/pocketbase/client'
import { IntegrationError, AuthenticationError, normalizeError } from '@/core/errors/AppErrors'

export interface DataJudConsultaResponse {
  ok: boolean
  numeroProcesso: string
  tribunalAlias: string
  grau?: string
  classe?: { codigo: number; nome: string }
  sistema?: string
  formato?: string
  orgaoJulgador?: { codigo: number; nome: string }
  dataAjuizamento?: string
  nivelSigilo?: number
  novos_movimentos_inseridos?: number
  total_movimentos_api?: number
  movimentos?: any[]
  error?: string
}

export interface DataJudLoteResponse {
  ok: boolean
  total_processos: number
  processos_sucesso: number
  processos_com_erro: number
  novos_movimentos_total: number
  detalhes?: Array<{
    numeroProcesso: string
    status: 'ok' | 'erro'
    novos_movimentos?: number
    erro?: string
  }>
}

export class DataJudClient {
  public async postConsultar(numeroProcesso: string): Promise<DataJudConsultaResponse> {
    try {
      if (!pb.authStore.isValid) {
        throw new AuthenticationError('Sessao expirada para consulta ao DataJud.')
      }

      const response = await fetch(`${pb.baseUrl}/backend/v1/datajud/consultar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ numeroProcesso }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new IntegrationError('DataJud CNJ', `Status ${response.status}: ${errorText}`)
      }

      return await response.json()
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao consultar processo no DataJud.')
    }
  }

  public async postSincronizarLote(apenasComPrazoAberto = false): Promise<DataJudLoteResponse> {
    try {
      if (!pb.authStore.isValid) {
        throw new AuthenticationError('Sessao expirada para sincronizacao em lote.')
      }

      const response = await fetch(`${pb.baseUrl}/backend/v1/datajud/sincronizar-lote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ apenasComPrazoAberto }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new IntegrationError('DataJud Lote', `Status ${response.status}: ${errorText}`)
      }

      return await response.json()
    } catch (err: unknown) {
      throw normalizeError(err, 'Falha ao sincronizar lote DataJud.')
    }
  }
}

export const dataJudClient = new DataJudClient()
