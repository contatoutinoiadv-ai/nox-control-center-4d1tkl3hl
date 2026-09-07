migrate(
  (app) => {
    // Lista completa de coleções operacionais e de negócio a serem zeradas
    const operationalCollections = [
      // Atendimento e mensageria
      'nox_ai_analysis',
      'nox_message_attachments',
      'nox_messages',
      'nox_internal_notes',
      'nox_assignments',
      'nox_conversations',
      'nox_webhook_events',

      // DataJud e alertas de movimentação
      'alertas_movimentacao',
      'movimentacoes_processo',
      'processos_datajud_cache',
      'processos_monitorados',

      // Produção jurídica, clientes e sentinela
      'production_items',
      'sentinela_agenda',
      'sentinela_tasks',
      'sentinela_communications',
      'sentinela_incidents',
      'sentinela_automations',
      'clients',

      // Ingestão CSV, registros operacionais e templates dinâmicos
      'records',
      'imports',
      'document_templates',

      // Logs de auditoria anteriores
      'audit_logs',
    ]

    const stats = {}

    for (const name of operationalCollections) {
      try {
        if (app.hasTable(name)) {
          // Contar registros antes de deletar
          let count = 0
          try {
            count = app.countRecords(name)
          } catch (_) {
            count = 0
          }
          stats[name] = count

          // Executar DELETE sem derrubar estrutura nem índices
          app.db().newQuery(`DELETE FROM ${name}`).execute()
        }
      } catch (err) {
        console.warn(`[0022_clean_all_operational_data_v2] Aviso ao limpar ${name}:`, err)
      }
    }

    // Registrar log de auditoria formal da limpeza total de negócio
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      const auditRecord = new Record(auditCol)
      const nowIso = new Date().toISOString()

      auditRecord.set('action', 'limpeza_total_operacional')
      auditRecord.set('category', 'sistema')
      auditRecord.set('actor', 'NOX System Engine / Admin Migration v0022')
      auditRecord.set('target_id', 'SYS-PURGE-0022')
      auditRecord.set('details', {
        message: `Todos os dados operacionais e de negócio foram apagados para reinício do zero em ${nowIso}.`,
        purged_collections: operationalCollections,
        records_purged_stats: stats,
        timestamp: nowIso,
        status: 'completed',
        preserved_entities: [
          'users (auth)',
          'user_module_permissions',
          'nox_integration_settings',
          'nox_integration_discovery',
          'estrutura de coleções e índices',
        ],
      })
      app.save(auditRecord)
    } catch (auditErr) {
      console.error(
        '[0022_clean_all_operational_data_v2] Erro ao gravar log de auditoria:',
        auditErr,
      )
    }
  },
  (app) => {
    // Reversão no-op — dados deletados não podem ser desfeitos sem backup externo
  },
)
