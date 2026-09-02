routerAdd(
  'POST',
  '/backend/v1/users',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.json(401, { ok: false, error: 'Não autenticado' })
      }

      const currentRole = auth.getString('role') || 'operador'
      const currentActor = auth.getString('email') || auth.id

      if (currentRole !== 'admin') {
        return e.json(403, {
          ok: false,
          error: 'Acesso negado: apenas administradores podem criar usuários.',
        })
      }

      const info = e.requestInfo()
      const body = info.body || {}

      const name = String(body.name || '').trim()
      const email = String(body.email || '')
        .trim()
        .toLowerCase()
      const password = String(body.password || '')
      const role = body.role === 'admin' ? 'admin' : 'operador'
      const ativo = body.ativo !== false // default true
      const modules = Array.isArray(body.modules) ? body.modules : []

      if (!name) {
        return e.json(400, { ok: false, error: 'Nome do usuário é obrigatório.' })
      }

      if (!email || !email.includes('@')) {
        return e.json(400, { ok: false, error: 'E-mail inválido.' })
      }

      if (!password || password.length < 8) {
        return e.json(400, { ok: false, error: 'A senha deve conter no mínimo 8 caracteres.' })
      }

      // Checa se já existe
      try {
        const existing = $app.findAuthRecordByEmail('_pb_users_auth_', email)
        if (existing) {
          return e.json(400, {
            ok: false,
            error: 'Já existe um usuário cadastrado com este e-mail.',
          })
        }
      } catch (_) {}

      // Cria usuário com hash seguro do PocketBase
      const usersCol = $app.findCollectionByNameOrId('_pb_users_auth_')
      const newUser = new Record(usersCol)
      newUser.setEmail(email)
      newUser.setPassword(password)
      newUser.setVerified(true)
      newUser.set('name', name)
      newUser.set('role', role)
      newUser.set('ativo', ativo)

      $app.save(newUser)
      const newUserId = newUser.id

      // Se for operador, salva as permissões explícitas dos módulos
      const grantedModules = []
      const ALL_MODULES = [
        'central_nox',
        'sentinela',
        'clientes',
        'producao',
        'central_prazos',
        'compromissos',
        'radar',
        'processos',
        'importacoes',
        'revisao',
        'exportacoes',
        'lex_tempus',
        'auditoria',
        'configuracoes',
      ]

      if (role === 'operador') {
        const permCol = $app.findCollectionByNameOrId('user_module_permissions')
        for (let i = 0; i < ALL_MODULES.length; i++) {
          const modName = ALL_MODULES[i]
          const isAllowed = modules.indexOf(modName) !== -1
          if (isAllowed) {
            grantedModules.push(modName)
          }
          const permRec = new Record(permCol)
          permRec.set('user_id', newUserId)
          permRec.set('modulo', modName)
          permRec.set('pode_acessar', isAllowed)
          $app.save(permRec)
        }
      }

      // Gravação em audit_logs (categoria: configuracao)
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const log = new Record(auditCol)
        log.set('action', 'USUARIO_CRIADO')
        log.set('category', 'configuracao')
        log.set('actor', currentActor)
        log.set('target_id', newUserId)
        log.set('details', {
          novo_usuario_email: email,
          novo_usuario_nome: name,
          role: role,
          ativo: ativo,
          modulos_concedidos: role === 'admin' ? 'ACESSO_TOTAL_ADMIN' : grantedModules,
          ip: info.remoteIP || '127.0.0.1',
        })
        log.set('ip_address', info.remoteIP || '127.0.0.1')
        $app.save(log)
      } catch (aErr) {
        console.log('[users_create] Erro ao gravar audit_log:', aErr.message || aErr)
      }

      return e.json(201, {
        ok: true,
        message: 'Usuário cadastrado com sucesso!',
        user: {
          id: newUserId,
          email: email,
          name: name,
          role: role,
          ativo: ativo,
          modules: role === 'admin' ? ALL_MODULES : grantedModules,
        },
      })
    } catch (err) {
      console.log('[users_create] Erro:', err.message || err)
      return e.json(500, { ok: false, error: 'Falha ao criar usuário: ' + (err.message || err) })
    }
  },
  $apis.requireAuth(),
)
