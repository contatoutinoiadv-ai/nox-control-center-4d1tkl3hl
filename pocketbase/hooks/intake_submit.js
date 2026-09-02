routerAdd('POST', '/api/intake_submit.php', (e) => {
  const reqInfo = e.requestInfo()
  const ip = reqInfo.remoteIP || ''
  const body = reqInfo.body || {}

  // 1. Honeypot check: se o campo oculto (ex: website ou honeypot) estiver preenchido, rejeitar silenciosamente ou com 400
  if (body.website || body.honeypot || body._gotcha) {
    return e.json(400, {
      success: false,
      error: 'Spam detectado.',
    })
  }

  // 2. Rate limit básico por IP (máx 15 submissões nos últimos 10 minutos por IP)
  if (ip) {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString().replace('T', ' ')
      const recentLogs = $app.findRecordsByFilter(
        'audit_logs',
        "action = 'INTAKE_RECEBIDO' && ip_address = '" +
          ip.replace(/'/g, '') +
          "' && created >= '" +
          tenMinutesAgo +
          "'",
        '-created',
        20,
        0,
      )
      if (recentLogs && recentLogs.length >= 15) {
        return e.json(429, {
          success: false,
          error:
            'Muitas tentativas em pouco tempo. Por favor, aguarde alguns minutos antes de reenviar.',
        })
      }
    } catch (_) {
      // Falha ao consultar rate limit não bloqueia requisição legítima
    }
  }

  // 3. Validação dos campos obrigatórios
  const nome = (body.nome || body.name || '').trim()
  if (!nome || nome.length < 3) {
    return e.json(400, {
      success: false,
      error: 'O nome completo é obrigatório (mínimo de 3 caracteres).',
    })
  }

  const cpf = (body.cpf || '').trim()
  if (!cpf) {
    return e.json(400, {
      success: false,
      error: 'O CPF é obrigatório.',
    })
  }

  const rg = (body.rg || '').trim()
  if (!rg) {
    return e.json(400, {
      success: false,
      error: 'O RG é obrigatório.',
    })
  }

  const telefone = (body.telefone || body.phone || body.whatsapp || '').trim()
  if (!telefone) {
    return e.json(400, {
      success: false,
      error: 'O telefone/WhatsApp é obrigatório.',
    })
  }

  const logradouro = (body.logradouro || '').trim()
  const numero = (body.numero || '').trim()
  const bairro = (body.bairro || '').trim()
  const cidade = (body.cidade || '').trim()
  const estado = (body.estado || '').trim()

  let endereco = (body.endereco || '').trim()
  if (!endereco && logradouro) {
    endereco = `${logradouro}, Nº ${numero || 'S/N'}, ${bairro}, ${cidade} - ${estado}`
  }

  if (!endereco) {
    return e.json(400, {
      success: false,
      error: 'O endereço completo (logradouro, número, bairro, cidade e estado) é obrigatório.',
    })
  }

  const email = (body.email || '').trim()
  const profissao = (body.profissao || '').trim()
  const nacionalidade = (body.nacionalidade || 'brasileiro(a)').trim()
  const estadoCivil = (body.estado_civil || body.estadoCivil || 'solteiro(a)').trim()
  const demanda = (body.demanda || 'outro').trim()
  const descricaoCaso = (body.descricao_caso || body.descricaoCaso || body.mensagem || '').trim()
  const obs = (body.obs || '').trim()

  // 4. Gerar código e protocolo únicos
  const totalClients = $app.countRecords('clients')
  const clientCode = 'CLI-2026-' + String(totalClients + 1).padStart(3, '0')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const protocolo = body.protocolo || 'INT-2026-' + randomSuffix

  // 5. Salvar na coleção 'clients'
  const clientsCol = $app.findCollectionByNameOrId('clients')
  const clientRecord = new Record(clientsCol)
  clientRecord.set('client_code', clientCode)
  clientRecord.set('protocolo', protocolo)
  clientRecord.set('nome', nome)
  if (cpf) clientRecord.set('cpf', cpf)
  if (rg) clientRecord.set('rg', rg)
  if (telefone) clientRecord.set('telefone', telefone)
  if (email) clientRecord.set('email', email)
  if (endereco) clientRecord.set('endereco', endereco)
  if (profissao) clientRecord.set('profissao', profissao)
  clientRecord.set('nacionalidade', nacionalidade)
  clientRecord.set('estado_civil', estadoCivil)
  clientRecord.set('demanda', demanda)
  clientRecord.set('descricao_caso', descricaoCaso)
  clientRecord.set('origem', 'intake_site')
  clientRecord.set('estagio', 'novo')
  clientRecord.set('docs_gerados', [])
  clientRecord.set('processos_vinculados', [])
  if (obs) clientRecord.set('obs', obs)
  clientRecord.set('responsavel', 'Higor Utinoi de Oliveira')

  $app.save(clientRecord)

  // 6. Registrar entrada imutável no audit_logs
  try {
    const auditCol = $app.findCollectionByNameOrId('audit_logs')
    const auditRecord = new Record(auditCol)
    auditRecord.set('action', 'INTAKE_RECEBIDO')
    auditRecord.set('category', 'sistema')
    auditRecord.set('actor', 'Intake Site / api/intake_submit.php')
    auditRecord.set('target_id', clientRecord.id)
    auditRecord.set('ip_address', ip)
    auditRecord.set('details', {
      client_id: clientRecord.id,
      client_code: clientCode,
      protocolo: protocolo,
      nome: nome,
      cpf: cpf,
      telefone: telefone,
      email: email,
      demanda: demanda,
      descricao_caso: descricaoCaso,
      origem: 'intake_site',
      estagio: 'novo',
      timestamp_captura: new Date().toISOString(),
      userAgent: reqInfo.headers['user-agent'] || '',
    })
    $app.save(auditRecord)
  } catch (err) {
    console.error('Erro ao salvar audit_logs para intake:', err)
  }

  // 7. Retorno do endpoint público
  return e.json(200, {
    success: true,
    message: 'Cadastro recebido com sucesso!',
    data: {
      id: clientRecord.id,
      client_code: clientCode,
      protocolo: protocolo,
      nome: nome,
      demanda: demanda,
      origem: 'intake_site',
      estagio: 'novo',
      created: clientRecord.get('created'),
    },
  })
})
