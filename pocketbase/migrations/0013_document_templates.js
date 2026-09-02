migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('document_templates')
    } catch (_) {
      const templatesCol = new Collection({
        name: 'document_templates',
        type: 'base',
        listRule: "@request.auth.id != '' && (user_id = @request.auth.id || is_global = true)",
        viewRule: "@request.auth.id != '' && (user_id = @request.auth.id || is_global = true)",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'user_email', type: 'text' },
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'icone', type: 'text' },
          { name: 'area', type: 'text' },
          {
            name: 'tipo_origem',
            type: 'select',
            values: ['docx', 'texto', 'sistema'],
            maxSelect: 1,
          },
          { name: 'corpo_html', type: 'text' },
          { name: 'arquivo_nome', type: 'text' },
          { name: 'is_global', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_doc_tpl_user ON document_templates (user_id)',
          'CREATE INDEX idx_doc_tpl_created ON document_templates (created DESC)',
        ],
      })
      app.save(templatesCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('document_templates'))
    } catch (_) {}
  },
)
