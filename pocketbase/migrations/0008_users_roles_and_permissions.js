migrate(
  (app) => {
    // 1. Atualizar a coleção users com os novos campos role e ativo
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: false,
          values: ['admin', 'operador'],
          maxSelect: 1,
        }),
      )
    }

    if (!usersCol.fields.getByName('ativo')) {
      // BoolField não deve ser required para permitir false
      usersCol.fields.add(
        new BoolField({
          name: 'ativo',
          required: false,
        }),
      )
    }

    app.save(usersCol)

    // Atualizar os usuários existentes para terem role: 'admin' e ativo: true por padrão
    try {
      app
        .db()
        .newQuery("UPDATE users SET role = 'admin', ativo = 1 WHERE role IS NULL OR role = ''")
        .execute()
      app.db().newQuery('UPDATE users SET ativo = 1 WHERE ativo IS NULL').execute()
    } catch (e) {
      console.log('Aviso ao atualizar users existentes:', e.message || e)
    }

    // 2. Criar tabela user_module_permissions
    // Módulos suportados: central_nox, sentinela, clientes, producao, central_prazos, compromissos,
    // radar, processos, importacoes, revisao, exportacoes, lex_tempus, auditoria, configuracoes, usuarios
    let permissionsCol
    try {
      permissionsCol = app.findCollectionByNameOrId('user_module_permissions')
    } catch (_) {
      permissionsCol = new Collection({
        name: 'user_module_permissions',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        updateRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'modulo',
            type: 'text',
            required: true,
          },
          {
            name: 'pode_acessar',
            type: 'bool',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_user_mod_perm ON user_module_permissions (user_id, modulo)',
          'CREATE INDEX idx_user_perm_user ON user_module_permissions (user_id)',
        ],
      })
      app.save(permissionsCol)
    }

    // 3. Garantir usuário admin master seeded
    try {
      const masterUser = app.findAuthRecordByEmail('_pb_users_auth_', 'contatoutinoiadv@gmail.com')
      masterUser.set('role', 'admin')
      masterUser.set('ativo', true)
      if (!masterUser.getString('name')) {
        masterUser.set('name', 'Administrador Master')
      }
      app.save(masterUser)
    } catch (_) {
      const newMaster = new Record(usersCol)
      newMaster.setEmail('contatoutinoiadv@gmail.com')
      newMaster.setPassword('Skip@Pass')
      newMaster.setVerified(true)
      newMaster.set('name', 'Administrador Master')
      newMaster.set('role', 'admin')
      newMaster.set('ativo', true)
      app.save(newMaster)
    }
  },
  (app) => {
    try {
      const permissionsCol = app.findCollectionByNameOrId('user_module_permissions')
      app.delete(permissionsCol)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('role')) {
        usersCol.fields.removeByName('role')
      }
      if (usersCol.fields.getByName('ativo')) {
        usersCol.fields.removeByName('ativo')
      }
      app.save(usersCol)
    } catch (_) {}
  },
)
