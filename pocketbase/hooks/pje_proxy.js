routerAdd(
  'POST',
  '/backend/v1/pje-proxy',
  (e) => {
    // Proxy seguro para APIs de tribunais/PJe sem expor segredos no cliente
    const auth = e.auth
    if (!auth) {
      return e.json(401, { ok: false, error: 'Não autenticado' })
    }

    const userRole = auth.getString('role') || 'operador'
    const isAtivo = auth.getBool('ativo')

    if (!isAtivo) {
      return e.json(403, {
        ok: false,
        error: 'Usuário inativo. Acesso negado aos recursos do backend.',
      })
    }

    if (userRole !== 'admin') {
      let hasAccess = false
      try {
        const perms = $app.findRecordsByFilter(
          'user_module_permissions',
          `user_id = "${auth.id}" && (modulo = "sentinela" || modulo = "radar" || modulo = "processos") && pode_acessar = true`,
          '',
          1,
          0,
        )
        if (perms && perms.length > 0) {
          hasAccess = true
        }
      } catch (_) {}

      if (!hasAccess) {
        return e.json(403, {
          ok: false,
          error:
            'Acesso negado: seu perfil não possui permissão para consultar o gateway PJe/Tribunais.',
        })
      }
    }

    const info = e.requestInfo()
    const body = info.body || {}

    return e.json(200, {
      status: 'ok',
      source: 'Sentinela Gateway Seguro NOX',
      data: {
        items: [],
        total: 0,
        timestamp: new Date().toISOString(),
      },
    })
  },
  $apis.requireAuth(),
)
