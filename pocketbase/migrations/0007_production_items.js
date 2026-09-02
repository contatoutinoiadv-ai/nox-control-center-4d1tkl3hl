migrate(
  (app) => {
    // 1. Check or create production_items collection
    try {
      app.findCollectionByNameOrId('production_items')
      // If already exists, skip
    } catch (_) {
      const col = new Collection({
        name: 'production_items',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'client_id', type: 'text', required: true },
          { name: 'client_name', type: 'text' },
          { name: 'numero_processo', type: 'text' },
          { name: 'titulo_peca', type: 'text', required: true },
          { name: 'nivel', type: 'number', required: true },
          {
            name: 'estagio',
            type: 'select',
            required: true,
            values: [
              'triagem_evidencias',
              'tese_em_definicao',
              'em_redacao',
              'stress_test_adversarial',
              'pronto_protocolo',
              'protocolado',
            ],
            maxSelect: 1,
          },
          { name: 'responsavel', type: 'text' },
          { name: 'triagem_evidencias', type: 'json' },
          { name: 'tese_dominante', type: 'text' },
          { name: 'motivo_travamento', type: 'text' },
          { name: 'data_entrada_estagio_atual', type: 'text' },
          { name: 'stress_test_aprovado', type: 'bool' },
          { name: 'stress_test_detalhes', type: 'json' },
          { name: 'historico_estagios', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_prod_client ON production_items (client_id)',
          'CREATE INDEX idx_prod_estagio ON production_items (estagio)',
          'CREATE INDEX idx_prod_processo ON production_items (numero_processo)',
          'CREATE INDEX idx_prod_nivel ON production_items (nivel)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('production_items'))
    } catch (_) {}
  },
)
