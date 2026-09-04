migrate(
  (app) => {
    // 1. Atualizar SelectField 'category' em audit_logs para garantir 'migracao' e 'seguranca'
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      if (auditCol) {
        const catField = auditCol.fields.getByName('category')
        if (catField) {
          catField.values = [
            'importacao',
            'revisao',
            'exportacao',
            'sistema',
            'configuracao',
            'lex_tempus',
            'migracao',
            'seguranca',
          ]
          catField.maxSelect = 1
          app.save(auditCol)
        }
      }
    } catch (err) {
      console.warn('0019: Erro ao ajustar category em audit_logs:', err)
    }

    // 2. Garantir campo legacy_id em sentinela_agenda se não existir
    try {
      const agendaCol = app.findCollectionByNameOrId('sentinela_agenda')
      if (agendaCol && !agendaCol.fields.getByName('legacy_id')) {
        agendaCol.fields.add(
          new TextField({
            name: 'legacy_id',
            required: false,
          }),
        )
        app.save(agendaCol)
      }
    } catch (err) {
      console.warn('0019: Erro ao adicionar legacy_id em sentinela_agenda:', err)
    }

    // 3. Garantir campo legacy_id em sentinela_tasks se não existir
    try {
      const tasksCol = app.findCollectionByNameOrId('sentinela_tasks')
      if (tasksCol && !tasksCol.fields.getByName('legacy_id')) {
        tasksCol.fields.add(
          new TextField({
            name: 'legacy_id',
            required: false,
          }),
        )
        app.save(tasksCol)
      }
    } catch (err) {
      console.warn('0019: Erro ao adicionar legacy_id em sentinela_tasks:', err)
    }

    // 4. Garantir campo legacy_id em production_items se não existir
    try {
      const prodCol = app.findCollectionByNameOrId('production_items')
      if (prodCol && !prodCol.fields.getByName('legacy_id')) {
        prodCol.fields.add(
          new TextField({
            name: 'legacy_id',
            required: false,
          }),
        )
        app.save(prodCol)
      }
    } catch (err) {
      console.warn('0019: Erro ao adicionar legacy_id em production_items:', err)
    }
  },
  (app) => {
    try {
      const agendaCol = app.findCollectionByNameOrId('sentinela_agenda')
      if (agendaCol && agendaCol.fields.getByName('legacy_id')) {
        agendaCol.fields.removeByName('legacy_id')
        app.save(agendaCol)
      }
    } catch (_) {}

    try {
      const tasksCol = app.findCollectionByNameOrId('sentinela_tasks')
      if (tasksCol && tasksCol.fields.getByName('legacy_id')) {
        tasksCol.fields.removeByName('legacy_id')
        app.save(tasksCol)
      }
    } catch (_) {}

    try {
      const prodCol = app.findCollectionByNameOrId('production_items')
      if (prodCol && prodCol.fields.getByName('legacy_id')) {
        prodCol.fields.removeByName('legacy_id')
        app.save(prodCol)
      }
    } catch (_) {}
  },
)
