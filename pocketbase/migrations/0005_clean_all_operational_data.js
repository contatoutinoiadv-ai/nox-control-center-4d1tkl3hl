migrate(
  (app) => {
    // 1. Zerar dados operacionais de todas as coleções requeridas
    const collectionsToPurge = [
      'records',
      'imports',
      'sentinela_communications',
      'sentinela_tasks',
      'sentinela_agenda',
      'sentinela_automations',
      'sentinela_incidents',
      'audit_logs',
    ]

    for (const name of collectionsToPurge) {
      try {
        app.db().newQuery(`DELETE FROM ${name}`).execute()
      } catch (err) {
        console.warn(`[0005_clean_all_operational_data] Aviso ao limpar ${name}:`, err)
      }
    }

    // 2. Registrar log de auditoria da limpeza total DEPOIS do DELETE
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      const auditRecord = new Record(auditCol)
      const nowIso = new Date().toISOString()

      auditRecord.set('action', 'limpeza_total')
      auditRecord.set('category', 'sistema')
      auditRecord.set('actor', 'NOX System Engine / Admin Migration')
      auditRecord.set('target_id', 'SYS-PURGE-005')
      auditRecord.set('details', {
        message: `Todos os dados operacionais foram apagados em ${nowIso}. Coleções zeradas: records, imports, sentinela_communications, sentinela_tasks, sentinela_agenda, sentinela_automations, sentinela_incidents, audit_logs.`,
        purged_collections: collectionsToPurge,
        timestamp: nowIso,
        status: 'completed',
        preserved_entities: [
          'users (auth)',
          'Perfil do Advogado Titular: Higor Utinoi de Oliveira (OAB/MS 15.400)',
        ],
      })
      app.save(auditRecord)
    } catch (auditErr) {
      console.error('[0005_clean_all_operational_data] Erro ao gravar log de auditoria:', auditErr)
    }
  },
  (app) => {
    // Reversão no-op
  },
)
