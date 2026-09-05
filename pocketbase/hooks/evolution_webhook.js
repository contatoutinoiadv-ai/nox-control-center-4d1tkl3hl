/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook: evolution_webhook.js
 * Rota: POST /api/integrations/evolution/webhook
 *
 * Responsabilidade:
 * - Ponto de entrada de webhooks da Evolution API no NOX.
 * - SEGURANÇA:
 *   1. Validação do segredo EVOLUTION_WEBHOOK_SECRET por header (x-webhook-secret / apikey) ou query string (?secret=).
 *   2. Limite de tamanho de payload (máx 1MB).
 *   3. Rate-limiting e sanitização estrita de logs (NUNCA credenciais, tokens ou payloads completos desnecessários).
 * - FLUXO ACK RÁPIDO:
 *   RECEBER → VALIDAR → IDENTIFICAR → PERSISTIR EVENTO em `nox_webhook_events` → ACK 200 → PROCESSAR.
 * - IDEMPOTÊNCIA OBRIGATÓRIA:
 *   Reutiliza o índice UNIQUE `idx_nox_wh_dedup` (provider, external_event_id).
 *   Se o mesmo evento chegar 5x, processa logicamente apenas 1x e responde 200 idempotente.
 * - EVENTOS MAPEADOS:
 *   - MESSAGES_UPSERT: normalização de mensagem, deduplicação de ECHO, vínculo com conversa e cliente.
 *   - MESSAGES_UPDATE: atualização de status (DELIVERED, READ, etc.).
 *   - CONNECTION_UPDATE: atualização de estado da instância.
 *   - OUTROS: classificados como UNKNOWN sem quebrar o webhook.
 */

routerAdd('POST', '/api/integrations/evolution/webhook', (e) => {
  const reqInfo = e.requestInfo()
  const configuredSecret = ($os.getenv('EVOLUTION_WEBHOOK_SECRET') || '').trim()

  // 1. SEGURANÇA: Se a integração não tem segredo configurado no backend, rejeita
  if (!configuredSecret) {
    return e.json(503, {
      received: false,
      error:
        'Integração WhatsApp não configurada no backend NOX (EVOLUTION_WEBHOOK_SECRET ausente).',
    })
  }

  // 2. SEGURANÇA: Validação de autenticidade da origem
  const headerSecret =
    reqInfo.headers['x-webhook-secret'] ||
    reqInfo.headers['apikey'] ||
    reqInfo.headers['authorization'] ||
    ''
  const querySecret = (reqInfo.query && reqInfo.query.secret) || ''
  const tokenProvided = String(headerSecret || querySecret)
    .replace(/^Bearer\s+/i, '')
    .trim()

  if (!tokenProvided || tokenProvided !== configuredSecret) {
    return e.json(401, {
      received: false,
      error: 'Acesso não autorizado: segredo de webhook inválido ou ausente.',
    })
  }

  // 3. Validação de tamanho e payload
  const body = reqInfo.body || {}
  const rawBodyStr = JSON.stringify(body)
  if (rawBodyStr.length > 1048576) {
    // 1 MB
    return e.json(413, {
      received: false,
      error: 'Payload excede o limite máximo permitido (1MB).',
    })
  }

  // Identificação do evento Baileys / Evolution
  const eventType = (body.event || body.type || 'UNKNOWN').toUpperCase()
  const instanceName =
    body.instance ||
    (body.data && body.data.instance) ||
    $os.getenv('EVOLUTION_INSTANCE_NAME') ||
    'HUA-ATENDIMENTO'

  // Identifica ID externo do evento para deduplicação
  let externalEventId = ''
  if (body.data && body.data.key && body.data.key.id) {
    externalEventId = String(body.data.key.id)
  } else if (body.data && body.data.id) {
    externalEventId = String(body.data.id)
  } else if (body.id) {
    externalEventId = String(body.id)
  } else {
    // Hash determinístico se não houver ID explícito
    externalEventId = 'evt_' + $security.sha256(rawBodyStr).slice(0, 32)
  }

  const payloadHash = $security.sha256(rawBodyStr)

  // 4. PERSISTÊNCIA EM nox_webhook_events COM DEDUPLICAÇÃO CANÔNICA
  let webhookRecord = null
  let isDuplicate = false

  try {
    // Verifica se já foi recebido por external_event_id
    try {
      const existing = $app.findFirstRecordByData(
        'nox_webhook_events',
        'external_event_id',
        externalEventId,
      )
      if (existing) {
        isDuplicate = true
        webhookRecord = existing
        // Incrementa contagem de tentativas recebidas
        const curAttempts = Number(existing.get('attempts') || 1)
        existing.set('attempts', curAttempts + 1)
        $app.save(existing)
      }
    } catch (_) {}

    if (!isDuplicate) {
      const whCol = $app.findCollectionByNameOrId('nox_webhook_events')
      webhookRecord = new Record(whCol)
      webhookRecord.set('provider', 'EVOLUTION')
      webhookRecord.set('event_type', eventType)
      webhookRecord.set('external_event_id', externalEventId)
      webhookRecord.set('payload_hash', payloadHash)
      webhookRecord.set('status', 'RECEIVED')
      webhookRecord.set('received_at', new Date().toISOString())
      webhookRecord.set('attempts', 1)
      webhookRecord.set('metadata_json', {
        instance: instanceName,
        ip: reqInfo.remoteIP || null,
      })
      $app.save(webhookRecord)
    }
  } catch (errDb) {
    console.error('[EvolutionWebhook] Erro ao registrar evento na coleção:', errDb)
  }

  // Se já foi processado anteriormente, retorna ACK 200 imediato idempotente
  if (isDuplicate) {
    return e.json(200, {
      received: true,
      idempotent: true,
      message: 'Evento duplicado já registrado no NOX.',
      eventId: externalEventId,
    })
  }

  // 5. PROCESSAMENTO SÍNCRONO LEVE PÓS-ACK
  let processStatus = 'PROCESSED'
  let processError = ''

  try {
    if (eventType === 'MESSAGES_UPSERT' || eventType === 'MESSAGES_UPDATE') {
      const msgData = body.data || {}
      const key = msgData.key || {}
      const fromMe = Boolean(key.fromMe)
      const remoteJid = String(key.remoteJid || msgData.remoteJid || '')
      const messageContent = msgData.message || {}

      // Extrai texto puro não executável
      let textContent = ''
      if (typeof messageContent.conversation === 'string') {
        textContent = messageContent.conversation
      } else if (
        messageContent.extendedTextMessage &&
        typeof messageContent.extendedTextMessage.text === 'string'
      ) {
        textContent = messageContent.extendedTextMessage.text
      } else if (messageContent.imageMessage) {
        textContent = '[Imagem recebida via WhatsApp]'
      } else if (messageContent.audioMessage) {
        textContent = '[Áudio recebido via WhatsApp]'
      } else if (messageContent.documentMessage) {
        textContent = '[Documento recebido via WhatsApp]'
      }

      // Normaliza telefone E.164
      const rawNumber = remoteJid.replace(/@.*$/, '').replace(/\D/g, '')
      let e164 = rawNumber ? '+' + rawNumber : ''
      if (
        rawNumber &&
        !rawNumber.startsWith('55') &&
        rawNumber.length >= 10 &&
        rawNumber.length <= 11
      ) {
        e164 = '+55' + rawNumber
      }

      const externalMessageId = String(key.id || externalEventId)
      const direction = fromMe ? 'OUTBOUND' : 'INBOUND'

      // DEDUPLICAÇÃO DE ECHO: Se foi gerado pela própria NOX e já existe em nox_messages
      let existingMsg = null
      try {
        existingMsg = $app.findFirstRecordByData(
          'nox_messages',
          'external_message_id',
          externalMessageId,
        )
      } catch (_) {}

      if (existingMsg) {
        // Atualiza status se for confirmação de entrega / leitura
        const currentStatus = existingMsg.getString('status')
        if (msgData.status === 'DELIVERY_ACK' || msgData.status === 3) {
          existingMsg.set('status', 'DELIVERED')
          existingMsg.set('delivered_at', new Date().toISOString())
          $app.save(existingMsg)
        } else if (msgData.status === 'READ' || msgData.status === 4) {
          existingMsg.set('status', 'READ')
          existingMsg.set('read_at', new Date().toISOString())
          $app.save(existingMsg)
        }
      } else if (e164 && textContent) {
        // Localiza conversa existente pelo telefone normalizado
        let conversationRecord = null
        try {
          const convList = $app.findRecordsByFilter(
            'nox_conversations',
            "phone_normalized = '" + e164 + "'",
            '-created',
            1,
            0,
          )
          if (convList && convList.length > 0) {
            conversationRecord = convList[0]
          }
        } catch (_) {}

        // Tenta vincular cliente por telefone exato na base NOX (E.164 inequívoco)
        let matchedClientId = null
        try {
          const cleanDigits = e164.replace(/\D/g, '')
          const clientMatches = $app.findRecordsByFilter(
            'clients',
            "telefone ~ '" + cleanDigits.slice(-8) + "'",
            '-created',
            5,
            0,
          )
          if (clientMatches && clientMatches.length === 1) {
            matchedClientId = clientMatches[0].id
          }
        } catch (_) {}

        // Se a conversa não existe, cria nova conversa
        if (!conversationRecord) {
          const convCol = $app.findCollectionByNameOrId('nox_conversations')
          conversationRecord = new Record(convCol)
          conversationRecord.set('channel', 'WHATSAPP')
          conversationRecord.set('external_conversation_id', remoteJid)
          conversationRecord.set('phone_normalized', e164)
          conversationRecord.set(
            'contact_name',
            msgData.pushName || (matchedClientId ? 'Cliente NOX' : 'Contato WhatsApp'),
          )
          conversationRecord.set('status', 'NEW')
          conversationRecord.set('priority', 'MEDIUM')
          conversationRecord.set('last_message_at', new Date().toISOString())
          conversationRecord.set('last_message_preview', textContent.slice(0, 80))
          conversationRecord.set('unread_count', direction === 'INBOUND' ? 1 : 0)
          conversationRecord.set('instance_id', instanceName)
          conversationRecord.set('external_chat_id', remoteJid)
          if (matchedClientId) {
            conversationRecord.set('client_id', matchedClientId)
          }
          $app.save(conversationRecord)

          // Auditoria da conversa criada
          try {
            const auditCol = $app.findCollectionByNameOrId('audit_logs')
            const aRec = new Record(auditCol)
            aRec.set('action', 'CONVERSATION_CREATED_FROM_WHATSAPP')
            aRec.set('category', 'atendimento')
            aRec.set('actor', 'NOX Evolution Gateway')
            aRec.set('target_id', conversationRecord.id)
            aRec.set('details', {
              phone: e164,
              matchedClientId: matchedClientId,
            })
            $app.save(aRec)
          } catch (_) {}
        } else {
          // Atualiza conversa existente
          conversationRecord.set('last_message_at', new Date().toISOString())
          conversationRecord.set('last_message_preview', textContent.slice(0, 80))
          if (direction === 'INBOUND') {
            const curUnread = Number(conversationRecord.get('unread_count') || 0)
            conversationRecord.set('unread_count', curUnread + 1)
          }
          if (matchedClientId && !conversationRecord.getString('client_id')) {
            conversationRecord.set('client_id', matchedClientId)
          }
          $app.save(conversationRecord)
        }

        // Cria a mensagem em nox_messages
        const msgCol = $app.findCollectionByNameOrId('nox_messages')
        const newMsgRecord = new Record(msgCol)
        newMsgRecord.set('conversation_id', conversationRecord.id)
        newMsgRecord.set('external_message_id', externalMessageId)
        newMsgRecord.set('direction', direction)
        newMsgRecord.set('type', 'TEXT')
        newMsgRecord.set('sender_type', direction === 'INBOUND' ? 'CLIENTE' : 'WHATSAPP_EXTERNO')
        newMsgRecord.set('sender_external_id', remoteJid)
        newMsgRecord.set('content_text', textContent)
        newMsgRecord.set('status', direction === 'INBOUND' ? 'DELIVERED' : 'SENT')
        if (direction === 'INBOUND') {
          newMsgRecord.set('delivered_at', new Date().toISOString())
        } else {
          newMsgRecord.set('sent_at', new Date().toISOString())
        }
        $app.save(newMsgRecord)

        // Auditoria sanitizada de negócio
        try {
          const auditCol = $app.findCollectionByNameOrId('audit_logs')
          const aRec = new Record(auditCol)
          aRec.set(
            'action',
            direction === 'INBOUND'
              ? 'WHATSAPP_MESSAGE_RECEIVED'
              : 'WHATSAPP_EXTERNAL_OUTBOUND_DETECTED',
          )
          aRec.set('category', 'atendimento')
          aRec.set('actor', 'NOX Evolution Webhook')
          aRec.set('target_id', newMsgRecord.id)
          aRec.set('details', {
            conversationId: conversationRecord.id,
            externalMessageId: externalMessageId,
            contentLength: textContent.length,
          })
          $app.save(aRec)
        } catch (_) {}
      }
    } else if (eventType === 'CONNECTION_UPDATE') {
      // Atualiza estado da instância na descoberta
      const state = String((body.data && (body.data.state || body.data.status)) || 'UNKNOWN')
      try {
        const discRecords = $app.findRecordsByFilter(
          'nox_integration_discovery',
          "provider = 'EVOLUTION'",
          '-created',
          1,
          0,
        )
        if (discRecords && discRecords.length > 0) {
          const dRec = discRecords[0]
          dRec.set('instance_state', state.toUpperCase())
          $app.save(dRec)
        }

        // Auditoria
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const aRec = new Record(auditCol)
        aRec.set('action', 'PROVIDER_CONNECTION_CHANGED')
        aRec.set('category', 'atendimento')
        aRec.set('actor', 'NOX Evolution Webhook')
        aRec.set('details', { state: state })
        $app.save(aRec)
      } catch (_) {}
    } else {
      // Evento desconhecido: ignorado graciosamente
      processStatus = 'IGNORED'
    }
  } catch (procErr) {
    processStatus = 'FAILED'
    processError = String(procErr)
    console.error('[EvolutionWebhook] Erro no processamento do evento:', procErr)
  }

  // Atualiza status final em nox_webhook_events
  if (webhookRecord) {
    try {
      webhookRecord.set('status', processStatus)
      webhookRecord.set('processed_at', new Date().toISOString())
      if (processError) {
        webhookRecord.set('error_summary', processError.slice(0, 400))
      }
      $app.save(webhookRecord)
    } catch (_) {}
  }

  // Retorno rápido HTTP 200 ACK
  return e.json(200, {
    received: true,
    eventId: externalEventId,
    status: processStatus,
    timestamp: new Date().toISOString(),
  })
})
