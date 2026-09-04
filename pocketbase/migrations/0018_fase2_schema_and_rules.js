/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0018: Fase 2 - Evolução de Esquema e Alinhamento de API Rules
 *
 * 1. Expande a categoria permitida na coleção `audit_logs` para incluir
 *    as novas categorias de migração: 'migracao' e 'seguranca'.
 * 2. Atualiza as API rules de `sentinela_tasks`, `sentinela_automations` e `sentinela_incidents`
 *    para exigir autenticação (@request.auth.id != ""), alinhando com a Fase 1.
 * 3. Adiciona campo `legacy_id` na coleção `clients` para rastreabilidade explícita do ID local.
 *
 * Reversível, não-destrutiva e idempotente.
 */

migrate(
  (app) => {
    // 1. Atualizar API rules para coleções do Sentinela
    const sentinelaCols = ['sentinela_tasks', 'sentinela_automations', 'sentinela_incidents']
    for (const name of sentinelaCols) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) {
          col.listRule = '@request.auth.id != ""'
          col.viewRule = '@request.auth.id != ""'
          col.createRule = '@request.auth.id != ""'
          col.updateRule = '@request.auth.id != ""'
          col.deleteRule = '@request.auth.id != ""'
          app.save(col)
        }
      } catch (err) {
        console.warn('0018: Erro ao atualizar rules de ' + name + ':', err)
      }
    }

    // 2. Expandir categoria em audit_logs para permitir 'migracao' e 'seguranca'
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      if (auditCol) {
        const catField = auditCol.fields.getByName('category')
        if (catField && catField.type === 'select') {
          const currentValues = Array.isArray(catField.values) ? catField.values : []
          const newValues = Array.from(new Set([...currentValues, 'migracao', 'seguranca']))
          catField.values = newValues
          app.save(auditCol)
        }
      }
    } catch (err) {
      console.warn('0018: Erro ao expandir categorias de audit_logs:', err)
    }

    // 3. Adicionar campo legacy_id na coleção clients se não existir
    try {
      const clientsCol = app.findCollectionByNameOrId('clients')
      if (clientsCol) {
        let hasLegacyId = false
        try {
          if (clientsCol.fields.getByName('legacy_id')) {
            hasLegacyId = true
          }
        } catch {
          hasLegacyId = false
        }

        if (!hasLegacyId) {
          clientsCol.fields.add(
            new Field({
              name: 'legacy_id',
              type: 'text',
              required: false,
            }),
          )
          app.save(clientsCol)
        }
      }
    } catch (err) {
      console.warn('0018: Erro ao adicionar legacy_id em clients:', err)
    }
  },
  (app) => {
    // Reversão da migration 0018
    const sentinelaCols = ['sentinela_tasks', 'sentinela_automations', 'sentinela_incidents']
    for (const name of sentinelaCols) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) {
          col.listRule = ''
          col.viewRule = ''
          col.createRule = ''
          col.updateRule = ''
          col.deleteRule = ''
          app.save(col)
        }
      } catch (err) {
        console.warn('0018 rollback: erro em ' + name + ':', err)
      }
    }

    try {
      const clientsCol = app.findCollectionByNameOrId('clients')
      if (clientsCol) {
        const field = clientsCol.fields.getByName('legacy_id')
        if (field) {
          clientsCol.fields.removeByName('legacy_id')
          app.save(clientsCol)
        }
      }
    } catch (err) {
      console.warn('0018 rollback: erro ao remover legacy_id:', err)
    }
  },
)
