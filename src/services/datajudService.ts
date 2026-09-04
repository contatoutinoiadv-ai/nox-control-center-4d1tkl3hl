import pb from '@/lib/pocketbase/client'

export interface ProcessoMonitorado {
  id: string
  numero_processo: string
  cliente?: string
  tribunal?: string
  ativo: boolean
  tem_prazo_aberto: boolean
  ultimo_status_mapeamento?: string
  client_id?: string
  expand?: {
    client_id?: { id: string; nome: string; client_code?: string }
  }
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
      const { dataJudClient } = await import('@/services/datajud/DataJudClient')
      const data = await dataJudClient.postConsultar(numeroProcesso)

      // Ao finalizar uma consulta ao DataJud com sucesso, tenta puxar publicacoes
      // correspondentes na collection sentinela_communications de forma resiliente
      try {
        await this.puxarPublicacoesProcesso(numeroProcesso)
      } catch (pullErr) {
        console.warn(
          `[${timestamp}] [DataJud] Aviso ao puxar publicacoes para ${numeroProcesso}:`,
          pullErr,
        )
      }

      return data as unknown as DatajudConsultaResult
    } catch (err: any) {
      console.error(
        `[${timestamp}] [DataJud] Excecao na conexao ao consultar processo ${numeroProcesso}:`,
        err,
      )
      return {
        ok: false,
        numero_processo: numeroProcesso,
        error: err?.message || 'Falha de conexao com o servidor ao consultar DataJud.',
      }
    }
  }

  /**
   * Execução de lote de consultas no DataJud
   */
  async sincronizarLote(apenasPrazosAbertos = false): Promise<DatajudLoteResult> {
    const timestamp = new Date().toISOString()
    try {
      const { dataJudClient } = await import('@/services/datajud/DataJudClient')
      const data = (await dataJudClient.postSincronizarLote(apenasPrazosAbertos)) as any

      // Se o lote foi executado com sucesso, tenta puxar publicacoes para os processos retornados
      if (data?.resultados && Array.isArray(data.resultados)) {
        for (const item of data.resultados) {
          if (item?.numero_processo) {
            try {
              await this.puxarPublicacoesProcesso(item.numero_processo)
            } catch {
              /* intentionally ignored */
            }
          }
        }
      }

      return data as DatajudLoteResult
    } catch (err: any) {
      console.error(
        `[${timestamp}] [DataJud Lote] Excecao na conexao durante sincronizacao em lote:`,
        err,
      )
      return {
        ok: false,
        total_processos_analisados: 0,
        novos_movimentos_totais: 0,
        nao_mapeados_count: 0,
        nao_mapeados: [],
        resultados: [],
        error: err?.message || 'Falha de conexao na sincronizacao de lote do DataJud.',
      }
    }
  }

  /**
   * Lista todos os processos monitorados
   */
  async getProcessosMonitorados(filtroClientId?: string): Promise<ProcessoMonitorado[]> {
    try {
      const filter = filtroClientId
        ? pb.filter('client_id = {:clientId}', { clientId: filtroClientId })
        : ''
      const records = await pb.collection('processos_monitorados').getFullList<ProcessoMonitorado>({
        filter,
        sort: '-created',
        expand: 'client_id',
      })
      return records
    } catch (err) {
      console.error('Erro ao buscar processos monitorados:', err)
      return []
    }
  }

  /**
   * Busca um processo monitorado pelo número CNJ
   */
  async getProcessoMonitoradoPorNumero(numeroProcesso: string): Promise<ProcessoMonitorado | null> {
    try {
      const record = await pb
        .collection('processos_monitorados')
        .getFirstListItem<ProcessoMonitorado>(
          pb.filter('numero_processo = {:num}', { num: numeroProcesso }),
        )
      return record
    } catch (err) {
      console.error('Erro ao buscar processo monitorado por número:', err)
      return null
    }
  }

  /**
   * Vincula um processo monitorado a um cliente real da collection clients,
   * gravando o campo de relação client_id (mantendo o texto apenas como rótulo).
   */
  async vincularProcessoAoCliente(
    numeroProcesso: string,
    clientId: string,
    nomeCliente?: string,
  ): Promise<ProcessoMonitorado | null> {
    try {
      const existente = await this.getProcessoMonitoradoPorNumero(numeroProcesso)
      if (existente) {
        return await pb
          .collection('processos_monitorados')
          .update<ProcessoMonitorado>(existente.id, {
            client_id: clientId,
            ...(nomeCliente ? { cliente: nomeCliente } : {}),
          })
      }

      // Processo ainda não monitorado: cadastra já vinculado ao cliente
      const aliasInfo = this.resolveAlias(numeroProcesso)
      const tribunalAlias = aliasInfo.alias || 'indefinido'
      const statusMapeamento = aliasInfo.alias
        ? 'mapeado'
        : `tribunal_nao_mapeado (${aliasInfo.jtr})`

      return await pb.collection('processos_monitorados').create<ProcessoMonitorado>({
        numero_processo: numeroProcesso,
        cliente: nomeCliente || '',
        tribunal: tribunalAlias,
        ativo: true,
        tem_prazo_aberto: false,
        ultimo_status_mapeamento: statusMapeamento,
        client_id: clientId,
      })
    } catch (err) {
      console.error('Erro ao vincular processo monitorado ao cliente:', err)
      return null
    }
  }

  /**
   * Remove o vínculo de cliente de um processo monitorado
   */
  async desvincularProcessoDoCliente(processoMonitoradoId: string): Promise<boolean> {
    try {
      await pb.collection('processos_monitorados').update(processoMonitoradoId, {
        client_id: null,
      })
      return true
    } catch (err) {
      console.error('Erro ao desvincular processo monitorado do cliente:', err)
      return false
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
    clientId?: string,
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
        ...(clientId ? { client_id: clientId } : {}),
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
  /**
   * Limpa formatação deixando apenas os dígitos do CNJ
   */
  limparNumeroProcesso(numero: string): string {
    return (numero || '').replace(/\D/g, '')
  }

  /**
   * Formata número de processo para o padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
   */
  formatarNumeroProcesso(numero: string): string {
    const limpo = this.limparNumeroProcesso(numero)
    if (limpo.length !== 20) return numero
    return `${limpo.slice(0, 7)}-${limpo.slice(7, 9)}.${limpo.slice(9, 13)}.${limpo.slice(13, 14)}.${limpo.slice(14, 16)}.${limpo.slice(16, 20)}`
  }

  /**
   * Puxa e vincula publicações do Sentinela (sentinela_communications) para um processo.
   * Busca no PocketBase e no dataStore local usando variações com e sem máscara.
   * Se não encontrar na collection mas encontrar no DJEN ou no dataStore, persiste
   * na collection sentinela_communications para consolidar a base unificada.
   */
  async puxarPublicacoesProcesso(numeroProcesso: string): Promise<number> {
    const raw = (numeroProcesso || '').trim()
    if (!raw) return 0

    const limpo = this.limparNumeroProcesso(raw)
    const formatado = this.formatarNumeroProcesso(raw)
    const variantes = Array.from(new Set([raw, formatado, limpo].filter(Boolean)))

    let totalVinculadas = 0

    try {
      // 1. Verificar se já existem na collection sentinela_communications do PocketBase
      let filterExpr = ''
      if (variantes.length === 1) {
        filterExpr = pb.filter('numero_processo = {:v0}', { v0: variantes[0] })
      } else if (variantes.length === 2) {
        filterExpr = pb.filter('numero_processo = {:v0} || numero_processo = {:v1}', {
          v0: variantes[0],
          v1: variantes[1],
        })
      } else {
        filterExpr = pb.filter(
          'numero_processo = {:v0} || numero_processo = {:v1} || numero_processo = {:v2}',
          {
            v0: variantes[0],
            v1: variantes[1],
            v2: variantes[2],
          },
        )
      }

      const pbComms = await pb.collection('sentinela_communications').getFullList({
        filter: filterExpr,
      })

      const pbExternalIds = new Set(
        pbComms.map((c: any) => String(c.external_id || c.id)).filter(Boolean),
      )

      // 2. Verificar no dataStore local se há publicações desse processo
      try {
        const { dataStore } = await import('@/services/dataStore')
        const allLocal = dataStore.getCommunications()
        const locaisDoProcesso = allLocal.filter((c) => {
          const cLimpo = (c.numeroProcesso || '').replace(/\D/g, '')
          return variantes.includes(c.numeroProcesso) || (limpo && cLimpo === limpo)
        })

        for (const localComm of locaisDoProcesso) {
          const extId = String(localComm.externalId || localComm.id)
          if (!pbExternalIds.has(extId)) {
            try {
              await pb.collection('sentinela_communications').create({
                external_id: extId,
                source: localComm.source || 'DJEN',
                numero_processo: formatado || localComm.numeroProcesso,
                tribunal: localComm.tribunal || 'TJMS',
                orgao_julgador: localComm.orgaoJulgador || '',
                destinatario: localComm.destinatario || '',
                tipo_comunicacao: localComm.tipoComunicacao || 'INTIMACAO',
                data_disponibilizacao: localComm.dataDisponibilizacao || '',
                data_publicacao: localComm.dataPublicacao || '',
                teor_resumido: localComm.teorResumido || '',
                teor_completo: localComm.teorCompleto || '',
                status: localComm.status || 'VALIDADA',
                triage_category: localComm.triageCategory || 'nova',
                urgency_level: localComm.urgencyLevel || 'media',
                risk_score: localComm.riskScore || 50,
                assigned_to: localComm.assignedTo || '',
                custody: localComm.custody || null,
                deadline_calculated: localComm.deadlineCalculated || null,
                client_id: localComm.clientId || '',
                client_code: localComm.clientCode || '',
                client_name: localComm.clientName || '',
              })
              pbExternalIds.add(extId)
              totalVinculadas++
            } catch (createErr) {
              console.warn('[DatajudService] Erro ao sincronizar comunicação para PB:', createErr)
            }
          }
        }
      } catch (storeErr) {
        console.warn('[DatajudService] Erro ao checar dataStore local:', storeErr)
      }

      // 3. Busca sob demanda na ComunicaAPI / DJEN se não houver publicações no PB
      if (pbComms.length === 0 && totalVinculadas === 0 && limpo.length === 20) {
        try {
          const { fetchDjenCommunicationsDirect } = await import('@/services/djenService')
          const djenRes = await fetchDjenCommunicationsDirect({
            numeroProcesso: formatado,
            itensPorPagina: 50,
            pagina: 1,
          })

          if (djenRes.success && djenRes.items.length > 0) {
            const { dataStore } = await import('@/services/dataStore')
            dataStore.addCommunications(djenRes.items)

            for (const item of djenRes.items) {
              const extId = String(item.externalId || item.id)
              if (!pbExternalIds.has(extId)) {
                try {
                  await pb.collection('sentinela_communications').create({
                    external_id: extId,
                    source: item.source || 'DJEN',
                    numero_processo: formatado,
                    tribunal: item.tribunal || 'DJEN',
                    orgao_julgador: item.orgaoJulgador || '',
                    destinatario: item.destinatario || '',
                    tipo_comunicacao: item.tipoComunicacao || 'INTIMACAO',
                    data_disponibilizacao: item.dataDisponibilizacao || '',
                    data_publicacao: item.dataPublicacao || '',
                    teor_resumido: item.teorResumido || '',
                    teor_completo: item.teorCompleto || '',
                    status: item.status || 'VALIDADA',
                    triage_category: item.triageCategory || 'nova',
                    urgency_level: item.urgencyLevel || 'media',
                    risk_score: item.riskScore || 50,
                    assigned_to: item.assignedTo || '',
                    custody: item.custody || null,
                    deadline_calculated: item.deadlineCalculated || null,
                  })
                  pbExternalIds.add(extId)
                  totalVinculadas++
                } catch (saveErr) {
                  console.warn('[DatajudService] Erro ao gravar comunicacao DJEN no PB:', saveErr)
                }
              }
            }
          }
        } catch (djenErr) {
          console.warn(
            '[DatajudService] Busca de publicações DJEN ignorada ou indisponível:',
            djenErr,
          )
        }
      }

      return totalVinculadas
    } catch (err) {
      console.error('[DatajudService] Falha ao puxar comunicações do processo:', err)
      return totalVinculadas
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
