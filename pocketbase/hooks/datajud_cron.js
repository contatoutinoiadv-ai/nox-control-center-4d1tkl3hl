// Crons agendados do DataJud:
// 1. datajud_diario: Diário para processos com prazo em aberto (06:00 UTC)
// 2. datajud_semanal: Semanal para todos os demais processos ativos (Domingos 03:00 UTC)

cronAdd('datajud_diario', '0 6 * * *', () => {
  console.log(
    '[' +
      new Date().toISOString() +
      '] [CRON DATAJUD DIÁRIO] Iniciando varredura diária de processos com prazos abertos.',
  )

  const apiKey =
    $secrets.get('DATAJUD_API_KEY') ||
    $os.getenv('DATAJUD_API_KEY') ||
    'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
  let baseUrl =
    $secrets.get('DATAJUD_API_URL') ||
    $os.getenv('DATAJUD_API_URL') ||
    'https://api-publica.datajud.cnj.jus.br'
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  let processos = []
  try {
    processos = $app.findRecordsByFilter(
      'processos_monitorados',
      'ativo = true && tem_prazo_aberto = true',
      'created',
      200,
      0,
    )
  } catch (err) {
    console.error(
      '[' +
        new Date().toISOString() +
        '] [CRON DATAJUD DIÁRIO] Erro ao buscar processos com prazos abertos: ' +
        String(err),
    )
    return
  }

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
    if (numeroLimpo.length !== 20) continue

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
      console.warn(
        '[' +
          new Date().toISOString() +
          '] [CRON DATAJUD DIÁRIO] Tribunal não mapeado J.TR: ' +
          jtr +
          ' (Processo: ' +
          rawNumeroProcesso +
          ')',
      )
      try {
        pRecord.set('ultimo_status_mapeamento', 'tribunal_nao_mapeado (' + jtr + ')')
        $app.save(pRecord)
      } catch (_) {}
      continue // Não interrompe os demais
    }

    const endpointUrl = baseUrl + '/api_publica_' + alias + '/_search'
    let apiResponse = null
    try {
      apiResponse = $http.send({
        url: endpointUrl,
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: { match: { numeroProcesso: numeroLimpo } } }),
        timeout: 30,
      })
    } catch (httpErr) {
      console.error(
        '[' +
          new Date().toISOString() +
          '] [CRON DATAJUD DIÁRIO] Falha de rede no processo ' +
          rawNumeroProcesso +
          ': ' +
          String(httpErr),
      )
      continue
    }

    if (
      apiResponse &&
      apiResponse.statusCode &&
      (apiResponse.statusCode === 401 || apiResponse.statusCode === 403)
    ) {
      console.error(
        '[' +
          new Date().toISOString() +
          '] [CRON DATAJUD DIÁRIO] Possível rotação de chave pública do DataJud, verificar https://datajud-wiki.cnj.jus.br/api-publica/acesso/',
      )
      break
    }

    if (!apiResponse || apiResponse.statusCode !== 200) {
      console.error(
        '[' +
          new Date().toISOString() +
          '] [CRON DATAJUD DIÁRIO] Status HTTP ' +
          (apiResponse ? apiResponse.statusCode : 'desconhecido') +
          ' no processo ' +
          rawNumeroProcesso,
      )
      continue
    }

    const responseData = apiResponse.json || {}
    const hitsObj = responseData.hits || {}
    const hitsList = hitsObj.hits || []

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

      // Atualiza cache
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

            // Alerta
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
  }

  console.log(
    '[' +
      new Date().toISOString() +
      '] [CRON DATAJUD DIÁRIO] Concluído processamento de ' +
      processos.length +
      ' processos com prazos.',
  )
})

cronAdd('datajud_semanal', '0 3 * * 0', () => {
  console.log(
    '[' +
      new Date().toISOString() +
      '] [CRON DATAJUD SEMANAL] Iniciando varredura semanal de todos os demais processos ativos.',
  )

  const apiKey =
    $secrets.get('DATAJUD_API_KEY') ||
    $os.getenv('DATAJUD_API_KEY') ||
    'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
  let baseUrl =
    $secrets.get('DATAJUD_API_URL') ||
    $os.getenv('DATAJUD_API_URL') ||
    'https://api-publica.datajud.cnj.jus.br'
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  let processos = []
  try {
    // Demais processos ativos (não prioritários de prazo diário)
    processos = $app.findRecordsByFilter(
      'processos_monitorados',
      'ativo = true && tem_prazo_aberto = false',
      'created',
      500,
      0,
    )
  } catch (err) {
    console.error(
      '[' +
        new Date().toISOString() +
        '] [CRON DATAJUD SEMANAL] Erro ao buscar processos ativos gerais: ' +
        String(err),
    )
    return
  }

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
    if (numeroLimpo.length !== 20) continue

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
      console.warn(
        '[' +
          new Date().toISOString() +
          '] [CRON DATAJUD SEMANAL] Tribunal não mapeado J.TR: ' +
          jtr +
          ' (Processo: ' +
          rawNumeroProcesso +
          ')',
      )
      try {
        pRecord.set('ultimo_status_mapeamento', 'tribunal_nao_mapeado (' + jtr + ')')
        $app.save(pRecord)
      } catch (_) {}
      continue
    }

    const endpointUrl = baseUrl + '/api_publica_' + alias + '/_search'
    let apiResponse = null
    try {
      apiResponse = $http.send({
        url: endpointUrl,
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: { match: { numeroProcesso: numeroLimpo } } }),
        timeout: 30,
      })
    } catch (httpErr) {
      console.error(
        '[' +
          new Date().toISOString() +
          '] [CRON DATAJUD SEMANAL] Falha de rede no processo ' +
          rawNumeroProcesso +
          ': ' +
          String(httpErr),
      )
      continue
    }

    if (
      apiResponse &&
      apiResponse.statusCode &&
      (apiResponse.statusCode === 401 || apiResponse.statusCode === 403)
    ) {
      console.error(
        '[' +
          new Date().toISOString() +
          '] [CRON DATAJUD SEMANAL] Possível rotação de chave pública do DataJud, verificar https://datajud-wiki.cnj.jus.br/api-publica/acesso/',
      )
      break
    }

    if (!apiResponse || apiResponse.statusCode !== 200) {
      console.error(
        '[' +
          new Date().toISOString() +
          '] [CRON DATAJUD SEMANAL] Status HTTP ' +
          (apiResponse ? apiResponse.statusCode : 'desconhecido') +
          ' no processo ' +
          rawNumeroProcesso,
      )
      continue
    }

    const responseData = apiResponse.json || {}
    const hitsObj = responseData.hits || {}
    const hitsList = hitsObj.hits || []

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

      // Atualiza cache
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

            // Alerta
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
  }

  console.log(
    '[' +
      new Date().toISOString() +
      '] [CRON DATAJUD SEMANAL] Concluído processamento de ' +
      processos.length +
      ' processos gerais.',
  )
})
