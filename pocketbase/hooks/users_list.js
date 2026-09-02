routerAdd(
  'GET',
  '/backend/v1/users',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.json(401, { ok: false, error: 'Não autenticado' })
      }

      const currentRole = auth.getString('role') || 'operador'
      if (currentRole !== 'admin') {
        return e.json(403, { ok: false, error: 'Acesso restrito a administradores' })
      }

      // Buscar todos os usuários
      const users = $app.findRecordsByFilter('users', 'id != ""', '-created', 200, 0)
      const userList = []

      for (let i = 0; i < users.length; i++) {
        const u = users[i]
        const uid = u.id
        const uRole = u.getString('role') || 'operador'

        let permissions = []
        if (uRole !== 'admin') {
          try {
            const pRecords = $app.findRecordsByFilter(
              'user_module_permissions',
              `user_id = "${uid}"`,
              'modulo',
              100,
              0,
            )
            for (let j = 0; j < pRecords.length; j++) {
              permissions.push({
                modulo: pRecords[j].getString('modulo'),
                pode_acessar: pRecords[j].getBool('pode_acessar'),
              })
            }
          } catch (_) {}
        }

        userList.push({
          id: uid,
          email: u.getString('email'),
          name: u.getString('name'),
          role: uRole,
          ativo: u.getBool('ativo'),
          created: u.getString('created'),
          updated: u.getString('updated'),
          permissions: permissions,
        })
      }

      return e.json(200, { ok: true, users: userList })
    } catch (err) {
      console.log('[users_list] Erro:', err.message || err)
      return e.json(500, { ok: false, error: 'Erro ao listar usuários' })
    }
  },
  $apis.requireAuth(),
)
