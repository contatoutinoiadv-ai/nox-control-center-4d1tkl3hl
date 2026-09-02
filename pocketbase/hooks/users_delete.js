routerAdd(
  'DELETE',
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
          error: 'Acesso negado: apenas administradores podem excluir usuários.',
        })
      }

      const targetId = e.requestInfo().params.id
      if (!targetId) {
        return e.json(400, { ok: false, error: 'ID do usuário não informado.' })
      }

      // REGRA DE SEGURANÇA 1: Nunca permitir que o próprio usuário logado se autoexclua
      if (currentUserId === targetId) {
        return e.json(400, {
          ok: false,
          error:
            'Operação bloqueada por segurança: Você não pode excluir sua própria conta de usuário logado.',
        })
      }

      let targetUser
      try {
        targetUser = $app.findFirstRecordByData('users', 'id', targetId)
      } catch (_) {
        return e.json(404, { ok: false, error: 'Usuário não encontrado.' })
      }

      const targetEmail = targetUser.getString('email')
      const targetName = targetUser.getString('name')
      const targetRole = targetUser.getString('role') || 'operador'
      const targetAtivo = targetUser.getBool('ativo')

      // REGRA DE SEGURANÇA 2: Sempre precisa existir pelo menos 1 usuário admin ativo no sistema
      if (targetRole === 'admin' && targetAtivo) {
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
              'Operação bloqueada por segurança: Não é possível excluir o único administrador ativo do sistema.',
          })
        }
      }

      // 1. Remover permissões do módulo vinculadas (se cascadeDelete não tiver feito)
      try {
        const perms = $app.findRecordsByFilter(
          'user_module_permissions',
          `user_id = "${targetId}"`,
          '',
          100,
          0,
        )
        for (let i = 0; i < perms.length; i++) {
          $app.delete(perms[i])
        }
      } catch (pErr) {
        console.log('[users_delete] Aviso ao remover permissões:', pErr.message || pErr)
      }

      // 2. Gravar registro em audit_logs mantendo o actor histórico com o email do excluído preservado no payload
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const log = new Record(auditCol)
        log.set('action', 'USUARIO_EXCLUIDO')
        log.set('category', 'configuracao')
        log.set('actor', currentActor)
        log.set('target_id', targetId)
        log.set('details', {
          usuario_excluido_id: targetId,
          usuario_excluido_email: targetEmail,
          usuario_excluido_nome: targetName,
          usuario_excluido_role: targetRole,
          motivo: 'Exclusão administrativa definitiva de conta de usuário',
          preservacao_historica: 'Trilha de auditoria retroativa com o e-mail preservada.',
          ip: e.requestInfo().remoteIP || '127.0.0.1',
        })
        log.set('ip_address', e.requestInfo().remoteIP || '127.0.0.1')
        $app.save(log)
      } catch (aErr) {
        console.log('[users_delete] Erro ao salvar audit_log:', aErr.message || aErr)
      }

      // 3. Excluir o registro do usuário
      $app.delete(targetUser)

      return e.json(200, {
        ok: true,
        message: `Usuário ${targetEmail} excluído com sucesso. Trilha de auditoria preservada.`,
      })
    } catch (err) {
      console.log('[users_delete] Erro:', err.message || err)
      return e.json(500, { ok: false, error: 'Falha ao excluir usuário: ' + (err.message || err) })
    }
  },
  $apis.requireAuth(),
)
