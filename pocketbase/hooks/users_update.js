routerAdd(
  'PUT',
  '/backend/v1/users/{id}',
  (e) => {
    try {
      const auth = e.auth
      if (!auth) {
        return e.json(401, { ok: false, error: 'Não autenticado' })
      }

      const currentRole = auth.getString('role') || 'operador'
      const currentActor = auth.getString('email') || auth.id
      const currentUserId = auth.id

      if (currentRole !== 'admin') {
        return e.json(403, {
          ok: false,
          error: 'Acesso negado: apenas administradores podem editar usuários.',
        })
      }

      const targetId = e.requestInfo().params.id
      if (!targetId) {
        return e.json(400, { ok: false, error: 'ID do usuário não informado.' })
      }

      // Localiza o usuário alvo
      let targetUser
      try {
        targetUser = $app.findFirstRecordByData('users', 'id', targetId)
      } catch (_) {
        return e.json(404, { ok: false, error: 'Usuário não encontrado.' })
      }

      const body = e.requestInfo().body || {}
      const targetOldRole = targetUser.getString('role') || 'operador'
      const targetOldEmail = targetUser.getString('email')
      const targetOldAtivo = targetUser.getBool('ativo')

      const newName =
        body.name !== undefined ? String(body.name).trim() : targetUser.getString('name')
      const newRole =
        body.role !== undefined ? (body.role === 'admin' ? 'admin' : 'operador') : targetOldRole
      const newAtivo = body.ativo !== undefined ? Boolean(body.ativo) : targetOldAtivo
      const newPassword = body.password ? String(body.password) : null
      const modules = Array.isArray(body.modules) ? body.modules : null

      // REGRA DE SEGURANÇA 1: O próprio usuário admin não pode remover a própria permissão de admin nem se desativar
      if (currentUserId === targetId) {
        if (newRole !== 'admin') {
          return e.json(400, {
            ok: false,
            error:
              'Operação bloqueada por segurança: Você não pode rebaixar seu próprio perfil de administrador.',
          })
        }
        if (newAtivo === false) {
          return e.json(400, {
            ok: false,
            error: 'Operação bloqueada por segurança: Você não pode desativar seu próprio usuário.',
          })
        }
      }

      // REGRA DE SEGURANÇA 2: Sempre precisa existir pelo menos 1 usuário admin ativo no sistema
      if (targetOldRole === 'admin' && (newRole !== 'admin' || newAtivo === false)) {
        // Contar quantos outros admins ativos existem
        const otherAdmins = $app.findRecordsByFilter(
          'users',
          `role = "admin" && ativo = true && id != "${targetId}"`,
          '',
          10,
          0,
        )
        if (!otherAdmins || otherAdmins.length === 0) {
          return e.json(400, {
            ok: false,
            error:
              'Operação bloqueada por segurança: Deve existir sempre ao menos um administrador ativo no sistema.',
          })
        }
      }

      if (newName) {
        targetUser.set('name', newName)
      }
      targetUser.set('role', newRole)
      targetUser.set('ativo', newAtivo)

      if (newPassword) {
        if (newPassword.length < 8) {
          return e.json(400, { ok: false, error: 'A nova senha deve ter no mínimo 8 caracteres.' })
        }
        targetUser.setPassword(newPassword)
      }

      $app.save(targetUser)

      // Atualização de módulos/permissões
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

      const grantedModules = []
      const revokedModules = []

      if (modules !== null && newRole === 'operador') {
        const permCol = $app.findCollectionByNameOrId('user_module_permissions')

        for (let i = 0; i < ALL_MODULES.length; i++) {
          const modName = ALL_MODULES[i]
          const isAllowed = modules.indexOf(modName) !== -1
          if (isAllowed) grantedModules.push(modName)
          else revokedModules.push(modName)

          // Procura registro existente
          let permRec = null
          try {
            const existingPerms = $app.findRecordsByFilter(
              'user_module_permissions',
              `user_id = "${targetId}" && modulo = "${modName}"`,
              '',
              1,
              0,
            )
            if (existingPerms && existingPerms.length > 0) {
              permRec = existingPerms[0]
            }
          } catch (_) {}

          if (!permRec) {
            permRec = new Record(permCol)
            permRec.set('user_id', targetId)
            permRec.set('modulo', modName)
          }
          permRec.set('pode_acessar', isAllowed)
          $app.save(permRec)
        }
      }

      // Gravação em audit_logs (categoria: configuracao)
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const log = new Record(auditCol)
        log.set('action', 'USUARIO_ATUALIZADO')
        log.set('category', 'configuracao')
        log.set('actor', currentActor)
        log.set('target_id', targetId)
        log.set('details', {
          target_email: targetOldEmail,
          target_nome: newName,
          role_anterior: targetOldRole,
          role_nova: newRole,
          ativo_anterior: targetOldAtivo,
          ativo_novo: newAtivo,
          senha_redefinida: Boolean(newPassword),
          modulos_concedidos: newRole === 'admin' ? 'ACESSO_TOTAL_ADMIN' : grantedModules,
          modulos_revogados: newRole === 'admin' ? [] : revokedModules,
          ip: e.requestInfo().remoteIP || '127.0.0.1',
        })
        log.set('ip_address', e.requestInfo().remoteIP || '127.0.0.1')
        $app.save(log)
      } catch (aErr) {
        console.log('[users_update] Erro ao salvar audit_log:', aErr.message || aErr)
      }

      return e.json(200, {
        ok: true,
        message: 'Usuário atualizado com sucesso!',
        user: {
          id: targetId,
          email: targetOldEmail,
          name: newName,
          role: newRole,
          ativo: newAtivo,
        },
      })
    } catch (err) {
      console.log('[users_update] Erro:', err.message || err)
      return e.json(500, {
        ok: false,
        error: 'Falha ao atualizar usuário: ' + (err.message || err),
      })
    }
  },
  $apis.requireAuth(),
)
