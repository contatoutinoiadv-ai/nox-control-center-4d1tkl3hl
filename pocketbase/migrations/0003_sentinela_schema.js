migrate(
  (app) => {
    // 1. sentinela_communications
    const commCol = new Collection({
      name: 'sentinela_communications',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'external_id', type: 'text', required: true },
        { name: 'source', type: 'text', required: true },
        { name: 'numero_processo', type: 'text', required: true },
        { name: 'tribunal', type: 'text', required: true },
        { name: 'orgao_julgador', type: 'text' },
        { name: 'destinatario', type: 'text' },
        { name: 'tipo_comunicacao', type: 'text' },
        { name: 'data_disponibilizacao', type: 'text' },
        { name: 'data_publicacao', type: 'text' },
        { name: 'teor_resumido', type: 'text' },
        { name: 'teor_completo', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'triage_category', type: 'text' },
        { name: 'urgency_level', type: 'text' },
        { name: 'risk_score', type: 'number' },
        { name: 'assigned_to', type: 'text' },
        { name: 'custody', type: 'json' },
        { name: 'deadline_calculated', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_comm_processo ON sentinela_communications (numero_processo)',
        'CREATE INDEX idx_comm_status ON sentinela_communications (status)',
      ],
    })
    app.save(commCol)

    // 2. sentinela_tasks
    const tasksCol = new Collection({
      name: 'sentinela_tasks',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'status', type: 'text', required: true },
        { name: 'priority', type: 'text', required: true },
        { name: 'responsible', type: 'text', required: true },
        { name: 'estimated_hours', type: 'number' },
        { name: 'internal_due_date', type: 'text' },
        { name: 'legal_deadline_date', type: 'text' },
        { name: 'process_number', type: 'text' },
        { name: 'client_name', type: 'text' },
        { name: 'communication_id', type: 'text' },
        { name: 'deadline_id', type: 'text' },
        { name: 'subtasks', type: 'json' },
        { name: 'is_blocked', type: 'bool' },
        { name: 'block_reason', type: 'text' },
        { name: 'tags', type: 'json' },
        { name: 'comments', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tasks_status ON sentinela_tasks (status)',
        'CREATE INDEX idx_tasks_responsible ON sentinela_tasks (responsible)',
      ],
    })
    app.save(tasksCol)

    // 3. sentinela_agenda
    const agendaCol = new Collection({
      name: 'sentinela_agenda',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'event_type', type: 'text', required: true },
        { name: 'start_date', type: 'text', required: true },
        { name: 'end_date', type: 'text', required: true },
        { name: 'is_all_day', type: 'bool' },
        { name: 'location_or_link', type: 'text' },
        { name: 'is_virtual', type: 'bool' },
        { name: 'process_number', type: 'text' },
        { name: 'responsible', type: 'text', required: true },
        { name: 'participants', type: 'json' },
        { name: 'tribunal', type: 'text' },
        { name: 'communication_id', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_agenda_start ON sentinela_agenda (start_date)',
        'CREATE INDEX idx_agenda_resp ON sentinela_agenda (responsible)',
      ],
    })
    app.save(agendaCol)

    // 4. sentinela_automations
    const autoCol = new Collection({
      name: 'sentinela_automations',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'trigger_event', type: 'text', required: true },
        { name: 'condition_formula', type: 'text' },
        { name: 'action_formula', type: 'text' },
        { name: 'requires_human_approval', type: 'bool' },
        { name: 'active', type: 'bool' },
        { name: 'executions_count', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(autoCol)

    // 5. sentinela_incidents
    const incCol = new Collection({
      name: 'sentinela_incidents',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'severity', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'incident_type', type: 'text' },
        { name: 'affected_count', type: 'number' },
        { name: 'affected_items_ids', type: 'json' },
        { name: 'contingency_plan', type: 'text' },
        { name: 'incident_leader', type: 'text' },
        { name: 'timeline_updates', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(incCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('sentinela_incidents'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sentinela_automations'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sentinela_agenda'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sentinela_tasks'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('sentinela_communications'))
    } catch (_) {}
  },
)
