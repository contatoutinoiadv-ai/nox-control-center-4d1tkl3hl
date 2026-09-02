// Hook para consulta direta à API Pública do DataJud (CNJ)
// Suporta consulta por número único do processo, resolução automática de alias e gravação
routerAdd(
  'POST',
  '/backend/v1/datajud/consultar',
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
    const rawNumeroProcesso = String(body.numero_processo || '').trim()

    if (!rawNumeroProcesso) {
      return e.json(400, {
        ok: false,
        error: 'Campo numero_processo é obrigatório.',
      })
    }

    // Normalização do número CNJ: 20 dígitos numéricos corridos
    const numeroLimpo = rawNumeroProcesso.replace(/\D/g, '')
    if (numeroLimpo.length !== 20) {
      return e.json(400, {
        ok: false,
        error:
          'Formato do número do processo inválido. O CNJ requer 20 dígitos (formato NNNNNNN-DD.AAAA.J.TR.OOOO).',
      })
    }

    // Extrai segmento J (dígito 13, index 13) e Tribunal TR (dígitos 14-15, index 14..16)
    // NNNNNNN-DD.AAAA.J.TR.OOOO -> 7 + 2 + 4 = 13 dígitos antes de J
    // index 13: J, index 14..16: TR
    const j = numeroLimpo.substring(13, 14)
    const tr = numeroLimpo.substring(14, 16)
    const jtr = j + '.' + tr

    // Tabela de aliases confirmados pelo escritório
    // 8.12 = tjms (TJMS)
    // 8.24 = tjsc (TJSC)
    // 8.09 = tjgo (TJGO)
    // 5.24 = trt24 (TRT24)
    // 3.00 = stj (STJ)
    let alias = ''
    if (jtr === '8.12') alias = 'tjms'
    else if (jtr === '8.24') alias = 'tjsc'
    else if (jtr === '8.09') alias = 'tjgo'
    else if (jtr === '5.24') alias = 'trt24'
    else if (jtr === '3.00') alias = 'stj'

    if (!alias) {
      const logMsg =
        '[' +
        new Date().toISOString() +
        '] Tribunal não mapeado para o par J.TR: ' +
        jtr +
        ' (Processo: ' +
        rawNumeroProcesso +
        ')'
      console.warn(logMsg)

      // Atualiza ou registra na lista de processos monitorados como tribunal não mapeado
      try {
        const existing = $app.findRecordsByFilter(
          'processos_monitorados',
          'numero_processo = "' + rawNumeroProcesso + '"',
          '',
          1,
          0,
        )
        if (existing && existing.length > 0) {
          existing[0].set('ultimo_status_mapeamento', 'tribunal_nao_mapeado (' + jtr + ')')
          $app.save(existing[0])
        }
      } catch (_) {}

      return e.json(422, {
        ok: false,
        status: 'tribunal_nao_mapeado',
        jtr: jtr,
        numero_processo: rawNumeroProcesso,
        error:
          'Tribunal não mapeado para o par J.TR (' +
          jtr +
          '). Mapeamento pendente com base na Resolução CNJ 65/2008.',
      })
    }

    // Chave pública e URL base do DataJud vindos de config/segredo (nunca hardcoded)
    const apiKey =
      $secrets.get('DATAJUD_API_KEY') ||
      $os.getenv('DATAJUD_API_KEY') ||
      'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
    let baseUrl =
      $secrets.get('DATAJUD_API_URL') ||
      $os.getenv('DATAJUD_API_URL') ||
      'https://api-publica.datajud.cnj.jus.br'
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    const endpointUrl = baseUrl + '/api_publica_' + alias + '/_search'
    const requestPayload = {
      query: {
        match: {
          numeroProcesso: numeroLimpo,
        },
      },
    }

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
          '] Erro de rede/comunicação ao consultar DataJud (' +
          endpointUrl +
          '): ' +
          String(httpErr),
      )
      return e.json(502, {
        ok: false,
        error: 'Erro de comunicação ao contactar a API Pública do DataJud (' + alias + ').',
        detalhes: String(httpErr),
      })
    }

    // Checagem de rotação de chave (401 / 403)
    if (
      apiResponse &&
      apiResponse.statusCode &&
      (apiResponse.statusCode === 401 || apiResponse.statusCode === 403)
    ) {
      const warnKey =
        '[' +
        new Date().toISOString() +
        '] Possível rotação de chave pública do DataJud, verificar https://datajud-wiki.cnj.jus.br/api-publica/acesso/ (HTTP ' +
        apiResponse.statusCode +
        ')'
      console.error(warnKey)
      return e.json(apiResponse.statusCode, {
        ok: false,
        error:
          'Possível rotação de chave pública do DataJud, verificar https://datajud-wiki.cnj.jus.br/api-publica/acesso/',
        statusCode: apiResponse.statusCode,
      })
    }

    if (!apiResponse || apiResponse.statusCode !== 200) {
      const errStatus = apiResponse ? apiResponse.statusCode : 500
      console.error(
        '[' +
          new Date().toISOString() +
          '] Resposta não-200 do DataJud (' +
          alias +
          ', HTTP ' +
          errStatus +
          '): ' +
          (apiResponse ? apiResponse.raw : ''),
      )
      return e.json(errStatus, {
        ok: false,
        error: 'DataJud retornou status HTTP ' + errStatus,
        raw: apiResponse ? apiResponse.raw : null,
      })
    }

    const responseData = apiResponse.json || {}
    const hitsObj = responseData.hits || {}
    const hitsList = hitsObj.hits || []

    let processHeader = null
    const novosMovimentos = []
    const movimentosExistentes = []
    let totalMovimentos = 0

    const sigiloNomes = {
      0: 'Público',
      1: 'Segredo de justiça',
      2: 'Sigilo mínimo',
      3: 'Sigilo médio',
      4: 'Sigilo intenso',
      5: 'Sigilo absoluto',
    }

    for (let h = 0; h < hitsList.length; h++) {
      const hit = hitsList[h]
      if (!hit || !hit._source) continue
      const src = hit._source

      // Nível de sigilo do processo (0 a 5)
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

      // Extração de cabeçalho
      const classeObj = src.classe || {}
      const orgaoObj = src.orgaoJulgador || {}
      const formatoObj = src.formato || {}
      const sistemaObj = src.sistema || {}

      processHeader = {
        datajud_id: src.id || '',
        tribunal: src.tribunal || alias.toUpperCase(),
        numeroProcesso: src.numeroProcesso || numeroLimpo,
        dataAjuizamento: src.dataAjuizamento || '',
        grau: src.grau || '',
        nivelSigilo: nivelSigilo,
        classe_codigo: classeObj.codigo !== undefined ? classeObj.codigo : null,
        classe_nome: classeObj.nome || '',
        orgao_julgador_codigo: orgaoObj.codigo !== undefined ? orgaoObj.codigo : null,
        orgao_julgador_nome: orgaoObj.nome || '',
        formato_nome: formatoObj.nome || '',
        sistema_nome: sistemaObj.nome || '',
        assuntos: src.assuntos || [],
      }

      // Atualiza o cache do cabeçalho
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

        cacheRec.set('tribunal_alias', alias)
        if (processHeader.classe_codigo !== null)
          cacheRec.set('classe_codigo', processHeader.classe_codigo)
        cacheRec.set('classe_nome', processHeader.classe_nome)
        cacheRec.set('grau', processHeader.grau)
        cacheRec.set('data_ajuizamento', processHeader.dataAjuizamento)
        if (processHeader.orgao_julgador_codigo !== null)
          cacheRec.set('orgao_julgador_codigo', processHeader.orgao_julgador_codigo)
        cacheRec.set('orgao_julgador_nome', processHeader.orgao_julgador_nome)
        cacheRec.set('nivel_sigilo', processHeader.nivelSigilo)
        cacheRec.set('formato_nome', processHeader.formato_nome)
        cacheRec.set('sistema_nome', processHeader.sistema_nome)
        cacheRec.set('assuntos_json', processHeader.assuntos)
        cacheRec.set('ultima_consulta_em', new Date().toISOString())
        cacheRec.set('ultimo_resultado', 'sucesso')
        $app.save(cacheRec)
      } catch (saveCacheErr) {
        console.warn(
          '[' +
            new Date().toISOString() +
            '] Aviso ao salvar cache do processo: ' +
            String(saveCacheErr),
        )
      }

      // Processa array de movimentos
      const movimentosArray = Array.isArray(src.movimentos) ? src.movimentos : []
      totalMovimentos += movimentosArray.length

      for (let m = 0; m < movimentosArray.length; m++) {
        const mov = movimentosArray[m]
        if (!mov) continue

        const codigoMov =
          typeof mov.codigo === 'number' ? mov.codigo : parseInt(mov.codigo, 10) || 0
        const dataHoraMov = String(mov.dataHora || '').trim()
        const rawNomeMov = String(mov.nome || '').trim()

        if (!dataHoraMov) {
          console.warn(
            '[' +
              new Date().toISOString() +
              '] Movimento sem dataHora ignorado no processo ' +
              rawNumeroProcesso,
          )
          continue
        }

        // Se nivelSigilo != 0, não exibe nome nem detalhe original
        let nomeParaGravar = rawNomeMov
        if (nivelSigilo > 0) {
          nomeParaGravar = sigiloTexto
        }

        // Órgão julgador do movimento específico
        const movOrgao = mov.orgaoJulgador || {}
        const movOrgaoCodigo =
          movOrgao.codigoOrgao !== undefined
            ? movOrgao.codigoOrgao
            : movOrgao.codigo !== undefined
              ? movOrgao.codigo
              : null
        const movOrgaoNome = movOrgao.nomeOrgao || movOrgao.nome || ''

        // Complementos tabelados
        const complementos = mov.complementosTabelados || []

        // Hash de deduplicação oficial: numeroProcesso + codigo + dataHora
        const rawHashString =
          String(numeroLimpo) + '_' + String(codigoMov) + '_' + String(dataHoraMov)
        const hashDedup = $security.sha256(rawHashString)

        // Verifica se o hash já existe
        let jaExiste = false
        try {
          const recExistente = $app.findFirstRecordByData(
            'movimentacoes_processo',
            'hash_dedup',
            hashDedup,
          )
          if (recExistente) {
            jaExiste = true
            movimentosExistentes.push({
              id: recExistente.id,
              hash_dedup: hashDedup,
              codigo_movimento: codigoMov,
              data_hora_movimento: dataHoraMov,
            })
          }
        } catch (_) {
          jaExiste = false
        }

        if (!jaExiste) {
          // Gravação atômica da nova movimentação
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

            novosMovimentos.push({
              id: novoRec.id,
              codigo_movimento: codigoMov,
              nome_movimento: nomeParaGravar,
              data_hora_movimento: dataHoraMov,
              hash_dedup: hashDedup,
              nivel_sigilo: nivelSigilo,
            })

            // Disparo de Alerta de Movimentação Nova
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
            } catch (alertaErr) {
              console.warn(
                '[' +
                  new Date().toISOString() +
                  '] Falha ao criar alerta para movimentação ' +
                  hashDedup +
                  ': ' +
                  String(alertaErr),
              )
            }
          } catch (insertErr) {
            console.error(
              '[' +
                new Date().toISOString() +
                '] Erro ao inserir movimentação ' +
                hashDedup +
                ': ' +
                String(insertErr),
            )
          }
        }
      }
    }

    return e.json(200, {
      ok: true,
      status: 'concluido',
      alias_usado: alias,
      numero_processo: rawNumeroProcesso,
      hits_count: hitsList.length,
      total_movimentos_api: totalMovimentos,
      novos_movimentos_inseridos: novosMovimentos.length,
      movimentos_ja_existentes: movimentosExistentes.length,
      process_header: processHeader,
      novos_movimentos: novosMovimentos,
    })
  },
  $apis.requireAuth(),
)
