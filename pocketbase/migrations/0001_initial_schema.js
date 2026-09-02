migrate(
  (app) => {
    // 1. imports collection
    const importsCollection = new Collection({
      name: 'imports',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'filename', type: 'text', required: true },
        { name: 'hash', type: 'text', required: true },
        { name: 'encoding', type: 'text' },
        { name: 'delimiter', type: 'text' },
        { name: 'raw_content', type: 'text' }, // byte/text preservation
        { name: 'total_rows', type: 'number' },
        { name: 'accepted_count', type: 'number' },
        { name: 'quarantined_count', type: 'number' },
        { name: 'rejected_count', type: 'number' },
        { name: 'mapping_applied', type: 'json' },
        { name: 'stats', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_imports_hash ON imports (hash)',
        'CREATE INDEX idx_imports_created ON imports (created DESC)',
      ],
    })
    app.save(importsCollection)

    // 2. records collection
    const recordsCollection = new Collection({
      name: 'records',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'record_code', type: 'text', required: true },
        { name: 'numero_processo', type: 'text' },
        { name: 'tribunal', type: 'text' },
        { name: 'orgao_julgador', type: 'text' },
        { name: 'classe_judicial', type: 'text' },
        { name: 'assunto', type: 'text' },
        { name: 'partes', type: 'text' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['novo', 'em_revisao', 'processado', 'quarentena', 'resolvido'],
          maxSelect: 1,
        },
        {
          name: 'severity',
          type: 'select',
          required: true,
          values: ['informativo', 'medio', 'alto', 'critico'],
          maxSelect: 1,
        },
        {
          name: 'alert_type',
          type: 'select',
          required: true,
          values: ['operacional', 'qualidade_dado', 'importacao', 'futuro_lex_tempus'],
          maxSelect: 1,
        },
        { name: 'alert_title', type: 'text' },
        { name: 'alert_description', type: 'text' },
        {
          name: 'priority',
          type: 'select',
          values: ['baixa', 'media', 'alta', 'urgente'],
          maxSelect: 1,
        },
        { name: 'responsible', type: 'text' },
        { name: 'tags', type: 'json' },
        { name: 'notes', type: 'json' },
        { name: 'raw_source_row', type: 'json' },
        { name: 'normalized_data', type: 'json' },
        { name: 'validation_errors', type: 'json' },
        { name: 'source_batch_id', type: 'text' },
        { name: 'source_row_index', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_records_status ON records (status)',
        'CREATE INDEX idx_records_severity ON records (severity)',
        'CREATE INDEX idx_records_tribunal ON records (tribunal)',
        'CREATE INDEX idx_records_code ON records (record_code)',
      ],
    })
    app.save(recordsCollection)

    // 3. audit_logs collection
    const auditCollection = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'action', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          values: ['importacao', 'revisao', 'exportacao', 'sistema', 'configuracao', 'lex_tempus'],
          maxSelect: 1,
        },
        { name: 'actor', type: 'text' },
        { name: 'target_id', type: 'text' },
        { name: 'details', type: 'json' },
        { name: 'ip_address', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_created ON audit_logs (created DESC)',
        'CREATE INDEX idx_audit_category ON audit_logs (category)',
      ],
    })
    app.save(auditCollection)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('audit_logs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('records'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('imports'))
    } catch (_) {}
  },
)
