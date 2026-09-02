migrate(
  (app) => {
    // 1. Campos na coleção 'sentinela_agenda'
    try {
      const agendaCol = app.findCollectionByNameOrId('sentinela_agenda')
      if (!agendaCol.fields.getByName('preparacao_habilitada')) {
        agendaCol.fields.add(new BoolField({ name: 'preparacao_habilitada' }))
      }
      if (!agendaCol.fields.getByName('client_id')) {
        agendaCol.fields.add(new TextField({ name: 'client_id' }))
      }
      if (!agendaCol.fields.getByName('client_cpf')) {
        agendaCol.fields.add(new TextField({ name: 'client_cpf' }))
      }
      if (!agendaCol.fields.getByName('client_name')) {
        agendaCol.fields.add(new TextField({ name: 'client_name' }))
      }
      if (!agendaCol.fields.getByName('alegacoes_processo')) {
        agendaCol.fields.add(new JSONField({ name: 'alegacoes_processo' }))
      }
      if (!agendaCol.fields.getByName('aprovado_para_cliente')) {
        agendaCol.fields.add(new BoolField({ name: 'aprovado_para_cliente' }))
      }
      if (!agendaCol.fields.getByName('tipo_audiencia')) {
        agendaCol.fields.add(new TextField({ name: 'tipo_audiencia' }))
      }
      app.save(agendaCol)
    } catch (err) {
      console.warn('[0011_preparacao_audiencia] Warning updating sentinela_agenda:', err)
    }

    // 2. Campos na coleção 'clients' para vínculo direto com alegações aprovadas
    try {
      const clientsCol = app.findCollectionByNameOrId('clients')
      if (!clientsCol.fields.getByName('alegacoes_processo')) {
        clientsCol.fields.add(new JSONField({ name: 'alegacoes_processo' }))
      }
      if (!clientsCol.fields.getByName('aprovado_para_cliente')) {
        clientsCol.fields.add(new BoolField({ name: 'aprovado_para_cliente' }))
      }
      app.save(clientsCol)
    } catch (err) {
      console.warn('[0011_preparacao_audiencia] Warning updating clients:', err)
    }

    // 3. Atualizar/expandir categorias do 'audit_logs' se aplicável ou garantir campos
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      // Se necessário
      app.save(auditCol)
    } catch (err) {
      console.warn('[0011_preparacao_audiencia] Warning updating audit_logs:', err)
    }

    // 4. Seed de exemplo realista para validação do módulo Preparação
    try {
      const clientsCol = app.findCollectionByNameOrId('clients')
      const agendaCol = app.findCollectionByNameOrId('sentinela_agenda')

      // Criar ou atualizar cliente de teste com CPF formatado
      let clientRec = null
      try {
        clientRec = app.findFirstRecordByData('clients', 'cpf', '123.456.789-00')
      } catch (_) {
        clientRec = new Record(clientsCol)
        clientRec.set('client_code', 'CLI-2026-042')
        clientRec.set('protocolo', 'INT-2026-9812')
        clientRec.set('nome', 'Carlos Eduardo Mendes')
        clientRec.set('cpf', '123.456.789-00')
        clientRec.set('rg', '1.892.411-SSP/MS')
        clientRec.set('telefone', '(67) 99234-5678')
        clientRec.set('email', 'carlos.mendes@email.com')
        clientRec.set('endereco', 'Rua 14 de Julho, 1200, Centro, Campo Grande - MS')
        clientRec.set('profissao', 'Analista de Sistemas')
        clientRec.set('nacionalidade', 'Brasileiro')
        clientRec.set('estado_civil', 'Casado(a)')
        clientRec.set('demanda', 'consumidor')
        clientRec.set(
          'descricao_caso',
          'Contratou serviço de telecomunicação com pacote de internet e telefonia, mas sofreu sucessivas interrupções de sinal e cobranças indevidas de serviços não contratados, culminando em negativação indevida nos órgãos de proteção ao crédito.',
        )
        clientRec.set('origem', 'intake_site')
        clientRec.set('estagio', 'ativo')
        clientRec.set('docs_gerados', [])
        clientRec.set('processos_vinculados', ['0801234-56.2026.8.12.0001'])
        clientRec.set('responsavel', 'Dr. Higor Utinoi de Oliveira')
        app.save(clientRec)
      }

      // Criar audiência de Conciliação de teste com preparacao_habilitada: true
      try {
        app.findFirstRecordByData('sentinela_agenda', 'process_number', '0801234-56.2026.8.12.0001')
      } catch (_) {
        const agendaRec = new Record(agendaCol)
        agendaRec.set(
          'title',
          'Audiência de Conciliação - Carlos Eduardo Mendes vs. Telecom Brasil',
        )
        agendaRec.set(
          'description',
          'Audiência de conciliação referente à ação declaratória de inexistência de débito c/c indenização por danos morais.',
        )
        agendaRec.set('event_type', 'AUDIENCIA')
        // Data futura para contagem regressiva viva (ex: daqui a 5 dias)
        const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        futureDate.setHours(14, 30, 0, 0)
        agendaRec.set('start_date', futureDate.toISOString())
        agendaRec.set('end_date', new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString())
        agendaRec.set('is_all_day', false)
        agendaRec.set(
          'location_or_link',
          'https://tjms-jus-br.zoom.us/j/8291823910?pwd=NoxPrep2026',
        )
        agendaRec.set('is_virtual', true)
        agendaRec.set('process_number', '0801234-56.2026.8.12.0001')
        agendaRec.set('responsible', 'Dr. Higor Utinoi de Oliveira (OAB/MS 15.400)')
        agendaRec.set('participants', [
          'Carlos Eduardo Mendes (Autor)',
          'Dr. Higor Utinoi de Oliveira (Advogado do Autor)',
          'Telecom Brasil S/A (Réu)',
          'Conciliador Judicial CEJUSC',
        ])
        agendaRec.set('tribunal', 'TJMS - 3ª Vara Cível de Campo Grande / CEJUSC')
        agendaRec.set('status', 'CONFIRMADO')
        agendaRec.set('preparacao_habilitada', true)
        agendaRec.set('client_id', clientRec ? clientRec.id : '')
        agendaRec.set('client_cpf', '123.456.789-00')
        agendaRec.set('client_name', 'Carlos Eduardo Mendes')
        agendaRec.set('tipo_audiencia', 'CONCILIACAO')
        agendaRec.set('aprovado_para_cliente', true)
        agendaRec.set('alegacoes_processo', {
          revisado_por: 'Dr. Higor Utinoi de Oliveira (OAB/MS 15.400)',
          data_revisao: '2026-09-02',
          o_que_voce_contou:
            'Você contratou um plano de internet e telefonia com valor fixo mensal, mas passou a receber faturas quase 50% mais altas com tarifas avulsas que nunca contratou. Mesmo após registrar diversos protocolos de reclamação, as cobranças continuaram e seu nome foi negativado indevidamente por uma fatura cancelada.',
          o_que_outra_parte_respondeu:
            'A empresa alegou que as cobranças correspondem ao uso efetivo dos serviços adicionais e que a negativação decorreu do não pagamento regular das mensalidades devidas dentro do vencimento contratual.',
          o_que_esta_em_aberto:
            'O conciliador vai verificar se ambas as partes concordam em dar baixa definitiva na negativação, cancelar eventuais cobranças remanescentes e fixar uma indenização amigável para encerrar o litígio sem novos recursos.',
        })
        app.save(agendaRec)
      }

      // Criar segundo cliente e audiência de Instrução e Julgamento de teste
      let clientInstRec = null
      try {
        clientInstRec = app.findFirstRecordByData('clients', 'cpf', '987.654.321-99')
      } catch (_) {
        clientInstRec = new Record(clientsCol)
        clientInstRec.set('client_code', 'CLI-2026-088')
        clientInstRec.set('protocolo', 'INT-2026-4421')
        clientInstRec.set('nome', 'Mariana Alencar Silveira')
        clientInstRec.set('cpf', '987.654.321-99')
        clientInstRec.set('rg', '2.145.890-SSP/MS')
        clientInstRec.set('telefone', '(67) 98877-1122')
        clientInstRec.set('email', 'mariana.silveira@email.com')
        clientInstRec.set(
          'endereco',
          'Av. Afonso Pena, 3500, Jardim dos Estados, Campo Grande - MS',
        )
        clientInstRec.set('profissao', 'Supervisora Operacional')
        clientInstRec.set('nacionalidade', 'Brasileira')
        clientInstRec.set('estado_civil', 'Solteiro(a)')
        clientInstRec.set('demanda', 'trabalhista')
        clientInstRec.set(
          'descricao_caso',
          'Trabalhou durante 4 anos como supervisora operacional realizando horas extras diárias não registradas no espelho de ponto e acúmulo de função na gestão de estoque após corte de pessoal.',
        )
        clientInstRec.set('origem', 'manual')
        clientInstRec.set('estagio', 'ativo')
        clientInstRec.set('docs_gerados', [])
        clientInstRec.set('processos_vinculados', ['0024891-12.2025.5.24.0002'])
        clientInstRec.set('responsavel', 'Dr. Higor Utinoi de Oliveira')
        app.save(clientInstRec)
      }

      // Audiência de Instrução e Julgamento
      try {
        app.findFirstRecordByData('sentinela_agenda', 'process_number', '0024891-12.2025.5.24.0002')
      } catch (_) {
        const agendaInstRec = new Record(agendaCol)
        agendaInstRec.set(
          'title',
          'Audiência de Instrução e Julgamento - Mariana Silveira vs. Distribuidora Central',
        )
        agendaInstRec.set(
          'description',
          'Audiência de instrução telepresencial para oitiva de depoimento pessoal das partes e testemunhas.',
        )
        agendaInstRec.set('event_type', 'AUDIENCIA')
        const futureDateInst = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
        futureDateInst.setHours(10, 0, 0, 0)
        agendaInstRec.set('start_date', futureDateInst.toISOString())
        agendaInstRec.set(
          'end_date',
          new Date(futureDateInst.getTime() + 90 * 60 * 1000).toISOString(),
        )
        agendaInstRec.set('is_all_day', false)
        agendaInstRec.set(
          'location_or_link',
          'https://trt24-jus-br.zoom.us/j/9128391283?pwd=NoxTrt2026',
        )
        agendaInstRec.set('is_virtual', true)
        agendaInstRec.set('process_number', '0024891-12.2025.5.24.0002')
        agendaInstRec.set('responsible', 'Dr. Higor Utinoi de Oliveira (OAB/MS 15.400)')
        agendaInstRec.set('participants', [
          'Mariana Alencar Silveira (Reclamante)',
          'Dr. Higor Utinoi de Oliveira (Advogado da Reclamante)',
          'Preposto Distribuidora Central Ltda. (Reclamada)',
          'Advogado da Reclamada',
          'Juiz do Trabalho Titular da 2ª Vara',
        ])
        agendaInstRec.set('tribunal', 'TRT24 - 2ª Vara do Trabalho de Campo Grande')
        agendaInstRec.set('status', 'CONFIRMADO')
        agendaInstRec.set('preparacao_habilitada', true)
        agendaInstRec.set('client_id', clientInstRec ? clientInstRec.id : '')
        agendaInstRec.set('client_cpf', '987.654.321-99')
        agendaInstRec.set('client_name', 'Mariana Alencar Silveira')
        agendaInstRec.set('tipo_audiencia', 'INSTRUCAO_E_JULGAMENTO')
        agendaInstRec.set('aprovado_para_cliente', true)
        agendaInstRec.set('alegacoes_processo', {
          revisado_por: 'Dr. Higor Utinoi de Oliveira (OAB/MS 15.400)',
          data_revisao: '2026-09-02',
          o_que_voce_contou:
            'Você exerceu a função de supervisora cumprindo jornada média de 10 a 11 horas diárias, sem recebimento das horas excedentes e sem intervalo intrajornada integral, assumindo ainda o controle de inventário físico da empresa.',
          o_que_outra_parte_respondeu:
            'A reclamada sustentou que todos os cartões de ponto são fidedignos e registram a jornada real, que eventuais horas extras foram compensadas pelo banco de horas e que as atribuições eram inerentes ao cargo ocupado.',
          o_que_esta_em_aberto:
            'O juiz vai ouvir você e as testemunhas para apurar se os registros de ponto eram britânicos ou britanizados, como funcionava a rotina diária e se havia exigência presencial fora do horário contratual.',
        })
        app.save(agendaInstRec)
      }
    } catch (seedErr) {
      console.warn('[0011_preparacao_audiencia] Warning in seed data:', seedErr)
    }
  },
  (app) => {
    // Revert logic if needed
  },
)
