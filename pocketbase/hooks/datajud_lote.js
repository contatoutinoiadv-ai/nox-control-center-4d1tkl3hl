// Hook para execução de lote de consultas DataJud (com suporte a filtro por prazos pendentes)
routerAdd(
  'POST',
  '/backend/v1/datajud/lote',
  (e) => {
    const auth = e.auth
    if (!auth) {
      return e.json(401, { ok: false, error: 'Não autenticado' })
    }

    const isAtivo = auth.getBool('ativo')
    if (!isAtivo) {
      return e.json(403, {
        ok: false,
        error: 'Usuário inativo. Acesso negado aos recursos do backend.',
      })
    }

    const info = e.requestInfo()
    const body = info.body || {}
    const apenasPrazosAbertos = body.apenas_prazos_abertos === true

    // Chave pública e URL base do DataJud vindos de segredo/ambiente com fallback seguro para chave pública oficial do CNJ
    // Chave pública oficial do CNJ conforme Wiki pública do DataJud: https://datajud-wiki.cnj.jus.br/api-publica/acesso/
    const OFICIAL_PUBLIC_API_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
    const apiKey =
      $secrets.get('DATAJUD_API_KEY') ||
      $os.getenv('DATAJUD_API_KEY') ||
      OFICIAL_PUBLIC_API_KEY

    let baseUrl =
      $secrets.get('DATAJUD_API_URL') ||
      $os.getenv('DATAJUD_API_URL') ||
      'https://api-publica.datajud.cnj.jus.br'
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    // Busca processos ativos
    let filterExpr = 'ativo = true'
    if (apenasPrazosAbertos) {
      filterExpr += ' && tem_prazo_aberto = true'
    }

    let processos = []
    try {
      processos = $app.findRecordsByFilter('processos_monitorados', filterExpr, 'created', 100, 0)
    } catch (dbErr) {
      console.error(
        '[' + new Date().toISOString() + '] Erro ao listar processos_monitorados: ' + String(dbErr),
      )
      return e.json(500, {
        ok: false,
        error: 'Erro ao listar processos ativos para sincronização.',
      })
    }

    const resultados = []
    const naoMapeados = []
    let totalNovosMovimentosGeral = 0

    const sigiloNomes = {
      0: 'Público',
      1: 'Segredo de justiça',
      2: 'Sigilo mínimo',
      3: 'Sigilo médio',
      4: 'Sigilo intenso',
      5: 'Sigilo absoluto',
    }

    for (let i = 0; i < processos.length; i++) {
      const pRecord = processos[i]
      const rawNumeroProcesso = pRecord.getString('numero_processo')
      const numeroLimpo = rawNumeroProcesso.replace(/\D/g, '')

      if (numeroLimpo.length !== 20) {
        resultados.push({
          numero_processo: rawNumeroProcesso,
          status: 'erro_formato_cnj',
          mensagem: 'Número CNJ não possui 20 dígitos.',
        })
        continue
      }

      const j = numeroLimpo.substring(13, 14)
      const tr = numeroLimpo.substring(14, 16)
      const jtr = j + '.' + tr

      let alias = ''
      if (jtr === '8.12') alias = 'tjms'
      else if (jtr === '8.24') alias = 'tjsc'
      else if (jtr === '8.09') alias = 'tjgo'
      else if (jtr === '5.24') alias = 'trt24'
      else if (jtr === '3.00') alias = 'stj'

      if (!alias) {
        const warnMsg =
          '[' +
          new Date().toISOString() +
          '] Tribunal não mapeado para o par J.TR: ' +
          jtr +
          ' no processo ' +
          rawNumeroProcesso
        console.warn(warnMsg)
        naoMapeados.push({
          numero_processo: rawNumeroProcesso,
          jtr: jtr,
        })
        try {
          pRecord.set('ultimo_status_mapeamento', 'tribunal_nao_mapeado (' + jtr + ')')
          $app.save(pRecord)
        } catch (_) {}

        resultados.push({
          numero_processo: rawNumeroProcesso,
          status: 'tribunal_nao_mapeado',
          jtr: jtr,
        })
        continue // Falha em um não interrompe o lote
      }

      // Consulta DataJud para este processo individual
      const endpointUrl = baseUrl + '/api_publica_' + alias + '/_search'
      const requestPayload = {
        query: {
          match: {
            numeroProcesso: numeroLimpo,
          },
        },
      }

      console.log(
        '[' +
          new Date().toISOString() +
          '] [DataJud Lote] Disparando requisição: Método=POST | URL=' +
          endpointUrl +
          ' | Processo=' +
          rawNumeroProcesso,
      )

      let apiResponse = null
      try {
        apiResponse = $http.send({
          url: endpointUrl,
          method: 'POST',
          headers: {
            Authorization: apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
          timeout: 30,
        })
      } catch (httpErr) {
        console.error(
          '[' +
            new Date().toISOString() +
            '] [DataJud Lote] Erro de rede/comunicação no processo ' +
            rawNumeroProcesso +
            ': ' +
            String(httpErr),
        )
        resultados.push({
          numero_processo: rawNumeroProcesso,
          status: 'erro_rede',
          mensagem: String(httpErr),
        })
        continue
      }

      const statusCode = apiResponse ? apiResponse.statusCode : 0
      const rawBody = apiResponse && apiResponse.raw ? String(apiResponse.raw) : ''
      console.log(
        '[' +
          new Date().toISOString() +
          '] [DataJud Lote] Resposta recebida: StatusCode=' +
          statusCode +
          ' | Processo=' +
          rawNumeroProcesso +
          ' | BodyPreview=' +
          rawBody.slice(0, 300),
      )

      if (statusCode === 401 || statusCode === 403) {
        const warnKey =
          '[' +
          new Date().toISOString() +
          '] [DataJud Lote] Possível rotação de chave pública do DataJud (HTTP ' +
          statusCode +
          ') no processo ' +
          rawNumeroProcesso
        console.error(warnKey)
        resultados.push({
          numero_processo: rawNumeroProcesso,
          status: 'erro_autenticacao',
          mensagem:
            'Possível rotação de chave pública do DataJud, verificar https://datajud-wiki.cnj.jus.br/api-publica/acesso/',
        })
        continue
      }

      if (statusCode !== 200) {
        const errStatus = statusCode || 500
        console.error(
          '[' +
            new Date().toISOString() +
            '] [DataJud Lote] DataJud retornou HTTP ' +
            errStatus +
            ' para o processo ' +
            rawNumeroProcesso +
            ': ' +
            rawBody.slice(0, 500),
        )
        resultados.push({
          numero_processo: rawNumeroProcesso,
          status: 'erro_http',
          statusCode: errStatus,
          mensagem: 'DataJud retornou status HTTP ' + errStatus,
        })
        continue
      }

      let parsedJson = null
      if (apiResponse.json && typeof apiResponse.json === 'object') {
        parsedJson = apiResponse.json
      } else if (apiResponse.raw && typeof apiResponse.raw === 'string') {
        try {
          parsedJson = JSON.parse(apiResponse.raw)
        } catch (jsonErr) {
          console.error(
            '[' +
              new Date().toISOString() +
              '] Resposta da API DataJud para ' +
              rawNumeroProcesso +
              ' não é JSON válido: ' +
              String(apiResponse.raw).slice(0, 200),
          )
          resultados.push({
            numero_processo: rawNumeroProcesso,
            status: 'erro_resposta_invalida',
            mensagem: 'Resposta da API DataJud em formato inválido.',
          })
          continue
        }
      }

      const responseData = parsedJson || {}
      const hitsObj = responseData.hits || {}
      const hitsList = hitsObj.hits || []

      let novosInseridosNoProcesso = 0

      for (let h = 0; h < hitsList.length; h++) {
        const hit = hitsList[h]
        if (!hit || !hit._source) continue
        const src = hit._source

        let nivelSigilo = 0
        if (typeof src.nivelSigilo === 'number') {
          nivelSigilo = src.nivelSigilo
        } else if (src.nivelSigilo !== undefined && src.nivelSigilo !== null) {
          nivelSigilo = parseInt(String(src.nivelSigilo), 10) || 0
        }

        let sigiloTexto = ''
        if (nivelSigilo > 0) {
          const sigiloLabel = sigiloNomes[nivelSigilo] || 'Sigilo ' + nivelSigilo
          sigiloTexto =
            'movimentação em processo com ' +
            sigiloLabel.toLowerCase() +
            ', requer verificação manual'
        }

        // Cache do cabeçalho
        try {
          let cacheRec = null
          try {
            cacheRec = $app.findFirstRecordByData(
              'processos_datajud_cache',
              'numero_processo',
              rawNumeroProcesso,
            )
          } catch (_) {
            const cacheCol = $app.findCollectionByNameOrId('processos_datajud_cache')
            cacheRec = new Record(cacheCol)
            cacheRec.set('numero_processo', rawNumeroProcesso)
          }

          const classeObj = src.classe || {}
          const orgaoObj = src.orgaoJulgador || {}
          const formatoObj = src.formato || {}
          const sistemaObj = src.sistema || {}

          cacheRec.set('tribunal_alias', alias)
          if (classeObj.codigo !== undefined) cacheRec.set('classe_codigo', classeObj.codigo)
          cacheRec.set('classe_nome', classeObj.nome || '')
          cacheRec.set('grau', src.grau || '')
          cacheRec.set('data_ajuizamento', src.dataAjuizamento || '')
          if (orgaoObj.codigo !== undefined) cacheRec.set('orgao_julgador_codigo', orgaoObj.codigo)
          cacheRec.set('orgao_julgador_nome', orgaoObj.nome || '')
          cacheRec.set('nivel_sigilo', nivelSigilo)
          cacheRec.set('formato_nome', formatoObj.nome || '')
          cacheRec.set('sistema_nome', sistemaObj.nome || '')
          cacheRec.set('assuntos_json', src.assuntos || [])
          cacheRec.set('ultima_consulta_em', new Date().toISOString())
          cacheRec.set('ultimo_resultado', 'sucesso')
          $app.save(cacheRec)
        } catch (_) {}

        const movimentosArray = Array.isArray(src.movimentos) ? src.movimentos : []
        for (let m = 0; m < movimentosArray.length; m++) {
          const mov = movimentosArray[m]
          if (!mov) continue

          const codigoMov =
            typeof mov.codigo === 'number' ? mov.codigo : parseInt(mov.codigo, 10) || 0
          const dataHoraMov = String(mov.dataHora || '').trim()
          const rawNomeMov = String(mov.nome || '').trim()

          if (!dataHoraMov) continue

          let nomeParaGravar = rawNomeMov
          if (nivelSigilo > 0) {
            nomeParaGravar = sigiloTexto
          }

          const movOrgao = mov.orgaoJulgador || {}
          const movOrgaoCodigo =
            movOrgao.codigoOrgao !== undefined
              ? movOrgao.codigoOrgao
              : movOrgao.codigo !== undefined
                ? movOrgao.codigo
                : null
          const movOrgaoNome = movOrgao.nomeOrgao || movOrgao.nome || ''

          const complementos = mov.complementosTabelados || []

          // Hash de deduplicação
          const rawHashString =
            String(numeroLimpo) + '_' + String(codigoMov) + '_' + String(dataHoraMov)
          const hashDedup = $security.sha256(rawHashString)

          let jaExiste = false
          try {
            const recExistente = $app.findFirstRecordByData(
              'movimentacoes_processo',
              'hash_dedup',
              hashDedup,
            )
            if (recExistente) jaExiste = true
          } catch (_) {
            jaExiste = false
          }

          if (!jaExiste) {
            try {
              const movCol = $app.findCollectionByNameOrId('movimentacoes_processo')
              const novoRec = new Record(movCol)
              novoRec.set('numero_processo', rawNumeroProcesso)
              novoRec.set('tribunal_alias', alias)
              novoRec.set('datajud_id', String(src.id || ''))
              novoRec.set('codigo_movimento', codigoMov)
              novoRec.set('nome_movimento', nomeParaGravar)
              novoRec.set('data_hora_movimento', dataHoraMov)
              if (movOrgaoCodigo !== null) novoRec.set('orgao_codigo_movimento', movOrgaoCodigo)
              novoRec.set('orgao_nome_movimento', movOrgaoNome)
              if (nivelSigilo === 0 && complementos.length > 0) {
                novoRec.set('complementos_json', complementos)
              } else {
                novoRec.set('complementos_json', [])
              }
              novoRec.set('nivel_sigilo_processo', nivelSigilo)
              novoRec.set('hash_dedup', hashDedup)
              novoRec.set('sigilo_descricao', sigiloTexto)
              $app.save(novoRec)

              novosInseridosNoProcesso++
              totalNovosMovimentosGeral++

              // Dispara alerta
              try {
                const alertaCol = $app.findCollectionByNameOrId('alertas_movimentacao')
                const alertaRec = new Record(alertaCol)
                alertaRec.set('numero_processo', rawNumeroProcesso)
                let descAlerta = 'Nova movimentação processual: ' + nomeParaGravar
                if (nivelSigilo > 0) {
                  descAlerta =
                    'Movimentação detectada em processo com ' +
                    (sigiloNomes[nivelSigilo] || 'sigilo') +
                    ' (' +
                    rawNumeroProcesso +
                    ')'
                }
                alertaRec.set('descricao', descAlerta)
                alertaRec.set('tipo', 'movimentacao_nova')
                alertaRec.set('lido', false)
                alertaRec.set('movimentacao_id', novoRec.id)
                alertaRec.set('hash_dedup', hashDedup)
                $app.save(alertaRec)
              } catch (_) {}
            } catch (_) {}
          }
        }
      }

      try {
        pRecord.set('ultimo_status_mapeamento', 'mapeado')
        $app.save(pRecord)
      } catch (_) {}

      resultados.push({
        numero_processo: rawNumeroProcesso,
        status: 'sucesso',
        alias: alias,
        novos_movimentos: novosInseridosNoProcesso,
      })
    }

    return e.json(200, {
      ok: true,
      total_processos_analisados: processos.length,
      novos_movimentos_totais: totalNovosMovimentosGeral,
      nao_mapeados_count: naoMapeados.length,
      nao_mapeados: naoMapeados,
      resultados: resultados,
    })
  },
  $apis.requireAuth(),
)
