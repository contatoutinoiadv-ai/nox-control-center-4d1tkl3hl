migrate(
  (app) => {
    // 1. Coleção processos_monitorados
    const processosCol = new Collection({
      name: 'processos_monitorados',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'numero_processo', type: 'text', required: true },
        { name: 'cliente', type: 'text' },
        { name: 'tribunal', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'tem_prazo_aberto', type: 'bool' },
        { name: 'ultimo_status_mapeamento', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_proc_mon_num ON processos_monitorados (numero_processo)',
        'CREATE INDEX idx_proc_mon_ativo ON processos_monitorados (ativo)',
        'CREATE INDEX idx_proc_mon_trib ON processos_monitorados (tribunal)',
      ],
    })
    app.save(processosCol)

    // 2. Coleção processos_datajud_cache (Cabeçalho do processo no DataJud)
    const cacheCol = new Collection({
      name: 'processos_datajud_cache',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'numero_processo', type: 'text', required: true },
        { name: 'tribunal_alias', type: 'text' },
        { name: 'classe_codigo', type: 'number' },
        { name: 'classe_nome', type: 'text' },
        { name: 'grau', type: 'text' },
        { name: 'data_ajuizamento', type: 'text' },
        { name: 'orgao_julgador_codigo', type: 'number' },
        { name: 'orgao_julgador_nome', type: 'text' },
        { name: 'nivel_sigilo', type: 'number' },
        { name: 'formato_nome', type: 'text' },
        { name: 'sistema_nome', type: 'text' },
        { name: 'assuntos_json', type: 'json' },
        { name: 'ultima_consulta_em', type: 'text' },
        { name: 'ultimo_resultado', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_datajud_cache_num ON processos_datajud_cache (numero_processo)',
        'CREATE INDEX idx_datajud_cache_trib ON processos_datajud_cache (tribunal_alias)',
      ],
    })
    app.save(cacheCol)

    // 3. Coleção movimentacoes_processo (Movimentações com hash dedup único)
    const movCol = new Collection({
      name: 'movimentacoes_processo',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'numero_processo', type: 'text', required: true },
        { name: 'tribunal_alias', type: 'text', required: true },
        { name: 'datajud_id', type: 'text' },
        { name: 'codigo_movimento', type: 'number', required: true },
        { name: 'nome_movimento', type: 'text', required: true },
        { name: 'data_hora_movimento', type: 'text', required: true },
        { name: 'orgao_codigo_movimento', type: 'number' },
        { name: 'orgao_nome_movimento', type: 'text' },
        { name: 'complementos_json', type: 'json' },
        { name: 'nivel_sigilo_processo', type: 'number' },
        { name: 'hash_dedup', type: 'text', required: true },
        { name: 'sigilo_descricao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_mov_hash_dedup ON movimentacoes_processo (hash_dedup)',
        'CREATE INDEX idx_mov_num_proc ON movimentacoes_processo (numero_processo)',
        'CREATE INDEX idx_mov_data_hora ON movimentacoes_processo (data_hora_movimento)',
      ],
    })
    app.save(movCol)

    // 4. Coleção alertas_movimentacao
    const alertasCol = new Collection({
      name: 'alertas_movimentacao',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
      fields: [
        { name: 'numero_processo', type: 'text', required: true },
        { name: 'descricao', type: 'text', required: true },
        { name: 'tipo', type: 'text' },
        { name: 'lido', type: 'bool' },
        { name: 'movimentacao_id', type: 'text' },
        { name: 'hash_dedup', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_alertas_proc ON alertas_movimentacao (numero_processo)',
        'CREATE INDEX idx_alertas_lido ON alertas_movimentacao (lido)',
        'CREATE INDEX idx_alertas_created ON alertas_movimentacao (created DESC)',
      ],
    })
    app.save(alertasCol)

    // 5. Seed inicial de processos monitorados do escritório (extraídos dos clientes e casos reais existentes)
    const initialProcesses = [
      {
        numero_processo: '0801234-56.2026.8.12.0001',
        cliente: 'Carlos Eduardo Mendes',
        tribunal: 'tjms',
        ativo: true,
        tem_prazo_aberto: true,
      },
      {
        numero_processo: '0859614-16.2025.8.12.0001',
        cliente: 'Carlos Eduardo Mendes',
        tribunal: 'tjms',
        ativo: true,
        tem_prazo_aberto: false,
      },
      {
        numero_processo: '0024891-12.2025.5.24.0002',
        cliente: 'Mariana Alencar Silveira',
        tribunal: 'trt24',
        ativo: true,
        tem_prazo_aberto: true,
      },
      {
        numero_processo: '0800045-33.2026.8.24.0005',
        cliente: 'Vitória Martins Duarte',
        tribunal: 'tjsc',
        ativo: true,
        tem_prazo_aberto: false,
      },
      {
        numero_processo: '5012345-67.2025.8.09.0051',
        cliente: 'Agropecuária Sul Goiana Ltda',
        tribunal: 'tjgo',
        ativo: true,
        tem_prazo_aberto: false,
      },
    ]

    for (const p of initialProcesses) {
      try {
        const rec = new Record(processosCol)
        rec.set('numero_processo', p.numero_processo)
        rec.set('cliente', p.cliente)
        rec.set('tribunal', p.tribunal)
        rec.set('ativo', p.ativo)
        rec.set('tem_prazo_aberto', p.tem_prazo_aberto)
        rec.set('ultimo_status_mapeamento', 'mapeado')
        app.save(rec)
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const a = app.findCollectionByNameOrId('alertas_movimentacao')
      app.delete(a)
    } catch (_) {}
    try {
      const m = app.findCollectionByNameOrId('movimentacoes_processo')
      app.delete(m)
    } catch (_) {}
    try {
      const c = app.findCollectionByNameOrId('processos_datajud_cache')
      app.delete(c)
    } catch (_) {}
    try {
      const p = app.findCollectionByNameOrId('processos_monitorados')
      app.delete(p)
    } catch (_) {}
  },
)
