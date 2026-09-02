console.log('[DEBUG] Hook preparacao_auth loaded')
routerAdd('POST', '/api/preparacao/auth', (e) => {
  const reqInfo = e.requestInfo()
  const ip = reqInfo.remoteIP || '127.0.0.1'
  const body = reqInfo.body || {}
  const rawCpf = typeof body.cpf === 'string' ? body.cpf : ''
  const cleanCpf = rawCpf.replace(/\D/g, '')

  // 1. Validação básica de CPF
  if (!cleanCpf || cleanCpf.length !== 11) {
    return e.json(200, {
      ok: false,
      error: 'Não encontramos nenhuma preparação disponível para esse CPF.',
    })
  }

  // 2. Formatações possíveis do CPF para busca (limpo ou com pontuação)
  const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

  let foundClient = null
  let foundAgenda = null

  // 3. Busca cliente correspondente pelo CPF
  try {
    const clients = $app.findRecordsByFilter(
      'clients',
      `cpf = "${formattedCpf}" || cpf = "${cleanCpf}"`,
      '-created',
      1,
      0,
    )
    if (clients && clients.length > 0) {
      foundClient = clients[0]
    }
  } catch (_) {}

  // 4. Busca audiência com preparacao_habilitada = true e tipo AUDIENCIA
  try {
    // Busca por client_cpf ou por client_id ou por process_number vinculado
    let filterQuery = `event_type = "AUDIENCIA" && preparacao_habilitada = true && (client_cpf = "${formattedCpf}" || client_cpf = "${cleanCpf}"`
    if (foundClient) {
      filterQuery += ` || client_id = "${foundClient.id}"`
      const procs = foundClient.get('processos_vinculados')
      if (Array.isArray(procs) && procs.length > 0) {
        for (let i = 0; i < procs.length; i++) {
          if (procs[i]) {
            filterQuery += ` || process_number = "${procs[i]}"`
          }
        }
      }
    }
    filterQuery += ')'

    const agendas = $app.findRecordsByFilter('sentinela_agenda', filterQuery, '-start_date', 1, 0)
    if (agendas && agendas.length > 0) {
      foundAgenda = agendas[0]
    }
  } catch (_) {}

  // 5. Se não encontrou audiência homologada com preparação habilitada, retorna mensagem neutra
  if (!foundAgenda) {
    // Grava tentativa no audit_log (sem revelar no response)
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const logRec = new Record(auditCol)
      logRec.set('action', 'PREPARACAO_ACESSO_NEGADO')
      logRec.set('category', 'sistema')
      logRec.set('actor', 'Público / CPF: ' + (cleanCpf ? '***' + cleanCpf.slice(-4) : 'vazio'))
      logRec.set('target_id', foundClient ? foundClient.id : 'cpf_inexistente')
      logRec.set('ip_address', ip)
      logRec.set('details', {
        cpf_mascarado: cleanCpf ? cleanCpf.slice(0, 3) + '.***.***-' + cleanCpf.slice(-2) : '',
        motivo: 'Sem audiência com preparacao_habilitada ativa',
        tem_cliente: !!foundClient,
      })
      $app.save(logRec)
    } catch (_) {}

    return e.json(200, {
      ok: false,
      error: 'Não encontramos nenhuma preparação disponível para esse CPF.',
    })
  }

  // 6. Registra no audit_logs o acesso permitido
  const clientId = foundClient
    ? foundClient.id
    : foundAgenda.getString('client_id') || 'desconhecido'
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const logRec = new Record(auditCol)
    logRec.set('action', 'PREPARACAO_ACESSO')
    logRec.set('category', 'sistema')
    logRec.set(
      'actor',
      foundClient
        ? foundClient.getString('nome')
        : foundAgenda.getString('client_name') || 'Cliente',
    )
    logRec.set('target_id', clientId)
    logRec.set('ip_address', ip)
    logRec.set('details', {
      client_id: clientId,
      agenda_id: foundAgenda.id,
      processo: foundAgenda.getString('process_number'),
      tipo_audiencia: foundAgenda.getString('tipo_audiencia') || 'CONCILIACAO',
      timestamp: new Date().toISOString(),
      userAgent: reqInfo.headers['user-agent'] || '',
    })
    $app.save(logRec)
  } catch (auditErr) {
    console.warn('Erro ao salvar audit_log de acesso à preparação:', auditErr)
  }

  // 7. Determina o modo: conciliação vs instrução
  const rawTipo = (foundAgenda.getString('tipo_audiencia') || '').toUpperCase()
  const titleLower = (foundAgenda.getString('title') || '').toLowerCase()
  const descLower = (foundAgenda.getString('description') || '').toLowerCase()

  let modo = 'conciliacao' // padrão
  if (
    rawTipo.includes('INSTRUCAO') ||
    rawTipo.includes('JULGAMENTO') ||
    titleLower.includes('instrução') ||
    titleLower.includes('instrucao') ||
    descLower.includes('instrução') ||
    descLower.includes('instrucao') ||
    titleLower.includes('julgamento') ||
    descLower.includes('julgamento')
  ) {
    modo = 'instrucao'
  }

  // 8. Puxa alegações do processo (apenas se aprovado_para_cliente = true)
  const aprovadoCliente = foundAgenda.getBool('aprovado_para_cliente')
  let alegacoes = null
  if (aprovadoCliente) {
    alegacoes = foundAgenda.get('alegacoes_processo')
    if (!alegacoes && foundClient) {
      alegacoes = foundClient.get('alegacoes_processo')
    }
  }

  // 9. Monta payload seguro de retorno para o cliente
  const clientData = {
    nome: foundClient
      ? foundClient.getString('nome')
      : foundAgenda.getString('client_name') || 'Cliente',
    descricaoCaso: foundClient ? foundClient.getString('descricao_caso') : '',
    demanda: foundClient ? foundClient.getString('demanda') : '',
  }

  const agendaData = {
    id: foundAgenda.id,
    title: foundAgenda.getString('title'),
    description: foundAgenda.getString('description'),
    startDate: foundAgenda.getString('start_date'),
    endDate: foundAgenda.getString('end_date'),
    isVirtual: foundAgenda.getBool('is_virtual'),
    locationOrLink: foundAgenda.getString('location_or_link'),
    processNumber: foundAgenda.getString('process_number'),
    tribunal: foundAgenda.getString('tribunal') || 'Tribunal de Justiça',
    responsible: foundAgenda.getString('responsible') || 'Dr. Higor Utinoi de Oliveira',
    participants: foundAgenda.get('participants') || [],
  }

  return e.json(200, {
    ok: true,
    clientId: clientId,
    modo: modo,
    client: clientData,
    agenda: agendaData,
    alegacoes: alegacoes,
    aprovadoParaCliente: aprovadoCliente,
  })
})
