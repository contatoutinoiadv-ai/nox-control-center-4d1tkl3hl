import pb from '@/lib/pocketbase/client'

export interface ProcessoMonitorado {
  id: string
  numero_processo: string
  cliente?: string
  tribunal?: string
  ativo: boolean
  tem_prazo_aberto: boolean
  ultimo_status_mapeamento?: string
  created?: string
  updated?: string
}

export interface ProcessoDatajudCache {
  id: string
  numero_processo: string
  tribunal_alias?: string
  classe_codigo?: number
  classe_nome?: string
  grau?: string
  data_ajuizamento?: string
  orgao_julgador_codigo?: number
  orgao_julgador_nome?: string
  nivel_sigilo?: number
  formato_nome?: string
  sistema_nome?: string
  assuntos_json?: any
  ultima_consulta_em?: string
  ultimo_resultado?: string
}

export interface MovimentacaoProcesso {
  id: string
  numero_processo: string
  tribunal_alias: string
  datajud_id?: string
  codigo_movimento: number
  nome_movimento: string
  data_hora_movimento: string
  orgao_codigo_movimento?: number
  orgao_nome_movimento?: string
  complementos_json?: Array<{
    codigo?: number
    nome?: string
    valor?: any
    descricao?: string
  }>
  nivel_sigilo_processo: number
  hash_dedup: string
  sigilo_descricao?: string
  created?: string
  updated?: string
}

export interface AlertaMovimentacao {
  id: string
  numero_processo: string
  descricao: string
  tipo?: string
  lido: boolean
  movimentacao_id?: string
  hash_dedup?: string
  created?: string
  updated?: string
}

export interface DatajudConsultaResult {
  ok: boolean
  status?: string
  alias_usado?: string
  numero_processo: string
  hits_count?: number
  total_movimentos_api?: number
  novos_movimentos_inseridos?: number
  movimentos_ja_existentes?: number
  process_header?: any
  novos_movimentos?: Array<{
    id: string
    codigo_movimento: number
    nome_movimento: string
    data_hora_movimento: string
    hash_dedup: string
    nivel_sigilo: number
  }>
  error?: string
  detalhes?: string
  jtr?: string
}

export interface DatajudLoteResult {
  ok: boolean
  total_processos_analisados: number
  novos_movimentos_totais: number
  nao_mapeados_count: number
  nao_mapeados: Array<{ numero_processo: string; jtr: string }>
  resultados: Array<{
    numero_processo: string
    status: string
    alias?: string
    novos_movimentos?: number
    mensagem?: string
    jtr?: string
  }>
  error?: string
}

export const SIGILO_DESCRICOES: Record<number, string> = {
  0: 'Público',
  1: 'Segredo de justiça',
  2: 'Sigilo mínimo',
  3: 'Sigilo médio',
  4: 'Sigilo intenso',
  5: 'Sigilo absoluto',
}

class DatajudService {
  /**
   * Resolve o alias do DataJud a partir do número único do processo (formato CNJ)
   * Apenas os pares confirmados são resolvidos diretamente, evitando adivinhações.
   */
  resolveAlias(numeroProcesso: string): { alias: string | null; jtr: string; error?: string } {
    const limpo = numeroProcesso.replace(/\D/g, '')
    if (limpo.length !== 20) {
      return { alias: null, jtr: '', error: 'Número CNJ inválido (esperado 20 dígitos).' }
    }
    const j = limpo.substring(13, 14)
    const tr = limpo.substring(14, 16)
    const jtr = `${j}.${tr}`

    switch (jtr) {
      case '8.12':
        return { alias: 'tjms', jtr }
      case '8.24':
        return { alias: 'tjsc', jtr }
      case '8.09':
        return { alias: 'tjgo', jtr }
      case '5.24':
        return { alias: 'trt24', jtr }
      case '3.00':
        return { alias: 'stj', jtr }
      default:
        return {
          alias: null,
          jtr,
          error: `Tribunal não mapeado para o par J.TR (${jtr}). Resolução CNJ 65/2008.`,
        }
    }
  }

  /**
   * Consulta individual do DataJud através do gateway seguro backend
   */
  async consultarProcesso(numeroProcesso: string): Promise<DatajudConsultaResult> {
    const timestamp = new Date().toISOString()
    try {
      const token = pb.authStore.token
      const baseUrl = pb.baseUrl.replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/backend/v1/datajud/consultar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token || '',
        },
        body: JSON.stringify({ numero_processo: numeroProcesso }),
      })

      const rawText = await response.text()
      let data: any = null

      if (rawText && rawText.trim()) {
        try {
          data = JSON.parse(rawText)
        } catch (jsonErr: any) {
          console.error(
            `[${timestamp}] [DataJud] Resposta não-JSON recebida ao consultar processo ${numeroProcesso} (HTTP ${response.status}):`,
            rawText.slice(0, 300),
          )
          return {
            ok: false,
            numero_processo: numeroProcesso,
            error:
              'Não foi possível consultar o DataJud no momento. Resposta do servidor em formato inesperado.',
            detalhes: rawText.slice(0, 300),
          }
        }
      }

      if (!response.ok) {
        const errorMsg =
          (data && data.error) ||
          (response.status === 404
            ? 'Endpoint de consulta do DataJud não encontrado no servidor.'
            : response.status === 401 || response.status === 403
              ? 'Sessão expirada ou sem permissão para consultar o DataJud.'
              : response.status === 502
                ? (data && data.error) ||
                  'Instabilidade ou indisponibilidade na API do DataJud/CNJ.'
                : `Falha na requisição ao DataJud (HTTP ${response.status}).`)

        console.error(
          `[${timestamp}] [DataJud] Erro HTTP ${response.status} ao consultar ${numeroProcesso}:`,
          data || rawText,
        )

        return {
          ok: false,
          numero_processo: numeroProcesso,
          error: errorMsg,
          status: data?.status,
          jtr: data?.jtr,
          detalhes: data?.detalhes,
        }
      }

      if (!data) {
        console.warn(
          `[${timestamp}] [DataJud] Resposta vazia recebida do backend para o processo ${numeroProcesso}.`,
        )
        return {
          ok: false,
          numero_processo: numeroProcesso,
          error: 'Servidor retornou uma resposta vazia para esta consulta.',
        }
      }

      return data as DatajudConsultaResult
    } catch (err: any) {
      console.error(
        `[${timestamp}] [DataJud] Exceção na conexão ao consultar processo ${numeroProcesso}:`,
        err,
      )
      return {
        ok: false,
        numero_processo: numeroProcesso,
        error: err?.message || 'Falha de conexão com o servidor ao consultar DataJud.',
      }
    }
  }

  /**
   * Execução de lote de consultas no DataJud
   */
  async sincronizarLote(apenasPrazosAbertos = false): Promise<DatajudLoteResult> {
    const timestamp = new Date().toISOString()
    try {
      const token = pb.authStore.token
      const baseUrl = pb.baseUrl.replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/backend/v1/datajud/lote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token || '',
        },
        body: JSON.stringify({ apenas_prazos_abertos: apenasPrazosAbertos }),
      })

      const rawText = await response.text()
      let data: any = null

      if (rawText && rawText.trim()) {
        try {
          data = JSON.parse(rawText)
        } catch (jsonErr: any) {
          console.error(
            `[${timestamp}] [DataJud Lote] Resposta não-JSON recebida na sincronização em lote (HTTP ${response.status}):`,
            rawText.slice(0, 300),
          )
          return {
            ok: false,
            total_processos_analisados: 0,
            novos_movimentos_totais: 0,
            nao_mapeados_count: 0,
            nao_mapeados: [],
            resultados: [],
            error:
              'Não foi possível concluir a sincronização em lote no momento. Resposta do servidor em formato inesperado.',
          }
        }
      }

      if (!response.ok) {
        const errorMsg =
          (data && data.error) ||
          (response.status === 404
            ? 'Endpoint de lote do DataJud não encontrado no servidor.'
            : response.status === 401 || response.status === 403
              ? 'Sessão expirada ou sem permissão para executar lote do DataJud.'
              : `Falha na requisição em lote do DataJud (HTTP ${response.status}).`)

        console.error(
          `[${timestamp}] [DataJud Lote] Erro HTTP ${response.status} na sincronização em lote:`,
          data || rawText,
        )

        return {
          ok: false,
          total_processos_analisados: 0,
          novos_movimentos_totais: 0,
          nao_mapeados_count: 0,
          nao_mapeados: [],
          resultados: [],
          error: errorMsg,
        }
      }

      if (!data) {
        console.warn(
          `[${timestamp}] [DataJud Lote] Resposta vazia recebida do backend na sincronização em lote.`,
        )
        return {
          ok: false,
          total_processos_analisados: 0,
          novos_movimentos_totais: 0,
          nao_mapeados_count: 0,
          nao_mapeados: [],
          resultados: [],
          error: 'Servidor retornou uma resposta vazia na sincronização em lote.',
        }
      }

      return data as DatajudLoteResult
    } catch (err: any) {
      console.error(
        `[${timestamp}] [DataJud Lote] Exceção na conexão durante sincronização em lote:`,
        err,
      )
      return {
        ok: false,
        total_processos_analisados: 0,
        novos_movimentos_totais: 0,
        nao_mapeados_count: 0,
        nao_mapeados: [],
        resultados: [],
        error: err?.message || 'Falha de conexão na sincronização de lote do DataJud.',
      }
    }
  }

  /**
   * Lista todos os processos monitorados
   */
  async getProcessosMonitorados(): Promise<ProcessoMonitorado[]> {
    try {
      const records = await pb.collection('processos_monitorados').getFullList<ProcessoMonitorado>({
        sort: '-created',
      })
      return records
    } catch (err) {
      console.error('Erro ao buscar processos monitorados:', err)
      return []
    }
  }

  /**
   * Adiciona um novo processo para monitoramento no DataJud
   */
  async adicionarProcessoMonitorado(
    numeroProcesso: string,
    cliente?: string,
    tribunal?: string,
    temPrazoAberto = false,
  ): Promise<ProcessoMonitorado | null> {
    try {
      const aliasInfo = this.resolveAlias(numeroProcesso)
      const tribunalAlias = tribunal || aliasInfo.alias || 'indefinido'
      const statusMapeamento = aliasInfo.alias
        ? 'mapeado'
        : `tribunal_nao_mapeado (${aliasInfo.jtr})`

      const record = await pb.collection('processos_monitorados').create<ProcessoMonitorado>({
        numero_processo: numeroProcesso,
        cliente: cliente || '',
        tribunal: tribunalAlias,
        ativo: true,
        tem_prazo_aberto: temPrazoAberto,
        ultimo_status_mapeamento: statusMapeamento,
      })
      return record
    } catch (err) {
      console.error('Erro ao adicionar processo monitorado:', err)
      return null
    }
  }

  /**
   * Lista movimentações registradas (todas ou filtradas por processo)
   */
  async getMovimentacoes(numeroProcesso?: string): Promise<MovimentacaoProcesso[]> {
    try {
      let filter = ''
      if (numeroProcesso) {
        filter = `numero_processo = "${numeroProcesso}"`
      }
      const records = await pb
        .collection('movimentacoes_processo')
        .getFullList<MovimentacaoProcesso>({
          filter,
          sort: '-data_hora_movimento',
        })
      return records
    } catch (err) {
      console.error('Erro ao buscar movimentações:', err)
      return []
    }
  }

  /**
   * Lista alertas de novas movimentações
   */
  async getAlertasMovimentacao(apenasNaoLidos = false): Promise<AlertaMovimentacao[]> {
    try {
      let filter = ''
      if (apenasNaoLidos) {
        filter = 'lido = false'
      }
      const records = await pb.collection('alertas_movimentacao').getFullList<AlertaMovimentacao>({
        filter,
        sort: '-created',
      })
      return records
    } catch (err) {
      console.error('Erro ao buscar alertas de movimentação:', err)
      return []
    }
  }

  /**
   * Marca alerta como lido
   */
  async marcarAlertaComoLido(alertaId: string): Promise<boolean> {
    try {
      await pb.collection('alertas_movimentacao').update(alertaId, { lido: true })
      return true
    } catch (err) {
      console.error('Erro ao marcar alerta como lido:', err)
      return false
    }
  }

  /**
   * Busca dados em cache do processo no DataJud
   */
  async getCacheProcesso(numeroProcesso: string): Promise<ProcessoDatajudCache | null> {
    try {
      const records = await pb
        .collection('processos_datajud_cache')
        .getList<ProcessoDatajudCache>(1, 1, {
          filter: `numero_processo = "${numeroProcesso}"`,
        })
      return records.items[0] || null
    } catch (_) {
      return null
    }
  }

  /**
   * Lista todos os caches de processo
   */
  async getAllCaches(): Promise<ProcessoDatajudCache[]> {
    try {
      const records = await pb
        .collection('processos_datajud_cache')
        .getFullList<ProcessoDatajudCache>({
          sort: '-ultima_consulta_em',
        })
      return records
    } catch (_) {
      return []
    }
  }
}

export const datajudService = new DatajudService()
