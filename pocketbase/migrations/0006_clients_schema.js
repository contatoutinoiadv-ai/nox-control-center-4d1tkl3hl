migrate(
  (app) => {
    // 1. clients collection
    try {
      app.findCollectionByNameOrId('clients')
      // If already exists, do nothing
    } catch (_) {
      const clientsCol = new Collection({
        name: 'clients',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'client_code', type: 'text', required: true },
          { name: 'protocolo', type: 'text' },
          { name: 'nome', type: 'text', required: true },
          { name: 'cpf', type: 'text' },
          { name: 'rg', type: 'text' },
          { name: 'telefone', type: 'text' },
          { name: 'email', type: 'text' },
          { name: 'endereco', type: 'text' },
          { name: 'profissao', type: 'text' },
          { name: 'nacionalidade', type: 'text' },
          { name: 'estado_civil', type: 'text' },
          { name: 'demanda', type: 'text' },
          { name: 'descricao_caso', type: 'text' },
          {
            name: 'origem',
            type: 'select',
            required: true,
            values: ['intake_site', 'manual', 'whatsapp', 'indicacao', 'presencial'],
            maxSelect: 1,
          },
          {
            name: 'estagio',
            type: 'select',
            required: true,
            values: [
              'novo',
              'em_atendimento',
              'aguardando_documentos',
              'ativo',
              'concluido',
              'inativo',
            ],
            maxSelect: 1,
          },
          { name: 'docs_gerados', type: 'json' },
          { name: 'processos_vinculados', type: 'json' },
          { name: 'obs', type: 'text' },
          { name: 'responsavel', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_clients_code ON clients (client_code)',
          'CREATE INDEX idx_clients_nome ON clients (nome)',
          'CREATE INDEX idx_clients_estagio ON clients (estagio)',
          'CREATE INDEX idx_clients_origem ON clients (origem)',
        ],
      })
      app.save(clientsCol)
    }

    // 2. Add client_id field to records if not present
    try {
      const recordsCol = app.findCollectionByNameOrId('records')
      if (!recordsCol.fields.getByName('client_id')) {
        recordsCol.fields.add(new TextField({ name: 'client_id' }))
      }
      if (!recordsCol.fields.getByName('client_code')) {
        recordsCol.fields.add(new TextField({ name: 'client_code' }))
      }
      app.save(recordsCol)
    } catch (err) {
      console.warn('[0006_clients_schema] Warning updating records collection:', err)
    }

    // 3. Add client_id field to sentinela_communications if not present
    try {
      const commCol = app.findCollectionByNameOrId('sentinela_communications')
      if (!commCol.fields.getByName('client_id')) {
        commCol.fields.add(new TextField({ name: 'client_id' }))
      }
      if (!commCol.fields.getByName('client_code')) {
        commCol.fields.add(new TextField({ name: 'client_code' }))
      }
      if (!commCol.fields.getByName('client_name')) {
        commCol.fields.add(new TextField({ name: 'client_name' }))
      }
      app.save(commCol)
    } catch (err) {
      console.warn(
        '[0006_clients_schema] Warning updating sentinela_communications collection:',
        err,
      )
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('clients'))
    } catch (_) {}
  },
)
