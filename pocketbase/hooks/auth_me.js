routerAdd(
  'GET',
  '/backend/v1/auth/me',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.json(401, { ok: false, error: 'Não autenticado' })
      }

      const userId = auth.id
      const email = auth.getString('email')
      const name = auth.getString('name')
      const role = auth.getString('role') || 'operador'
      const ativo = auth.getBool('ativo')

      if (!ativo) {
        return e.json(403, {
          ok: false,
          error: 'Conta de usuário inativa. Entre em contato com o administrador.',
          inativo: true,
        })
      }

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
        'usuarios',
      ]

      let allowedModules = []

      if (role === 'admin') {
        // Admin tem acesso irrestrito a todos os módulos
        allowedModules = [...ALL_MODULES]
      } else {
        // Operador: busca apenas os módulos explicitamente marcados como pode_acessar = true
        try {
          const perms = $app.findRecordsByFilter(
            'user_module_permissions',
            `user_id = "${userId}" && pode_acessar = true`,
            'modulo',
            100,
            0,
          )
          for (let i = 0; i < perms.length; i++) {
            const mod = perms[i].getString('modulo')
            if (mod && mod !== 'usuarios' && ALL_MODULES.indexOf(mod) !== -1) {
              allowedModules.push(mod)
            }
          }
        } catch (dbErr) {
          console.log('[auth_me] Erro ao buscar permissões:', dbErr.message || dbErr)
        }
      }

      return e.json(200, {
        ok: true,
        user: {
          id: userId,
          email: email,
          name: name,
          role: role,
          ativo: ativo,
        },
        role: role,
        allowedModules: allowedModules,
        isAdmin: role === 'admin',
      })
    } catch (err) {
      console.log('[auth_me] Erro inesperado:', err.message || err)
      return e.json(500, { ok: false, error: 'Falha ao obter perfil do usuário' })
    }
  },
  $apis.requireAuth(),
)
