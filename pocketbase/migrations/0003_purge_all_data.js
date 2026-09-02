/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Esvazia todas as coleções de dados importados, registros, auditoria e sentinela
    const tables = [
      'records',
      'imports',
      'sentinela_communications',
      'sentinela_tasks',
      'sentinela_agenda',
      'sentinela_incidents',
      'audit_logs',
    ]

    for (const table of tables) {
      try {
        app.db().newQuery(`DELETE FROM ${table}`).execute()
      } catch (err) {
        // Table might not exist or be empty
        console.warn(`Purge warning for table ${table}:`, err)
      }
    }
  },
  (app) => {
    // Reversible no-op
  },
)
