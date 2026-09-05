/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook: evolution_send_proxy.js
 * Rota: POST /api/integrations/evolution/send
 *
 * Responsabilidade:
 * - Ponto único de saída backend do NOX para envio de mensagens via Evolution API.
 * - CAMADAS ABSOLUTAS DE SEGURANÇA:
 *   1. Requer autenticação de operador/admin ($apis.requireAuth()).
 *   2. PROTEÇÃO DE NOTA INTERNA: Se o payload tentar enviar nota interna, aborta com 403 e registra auditoria de segurança.
 *   3. KILL SWITCH CHECK: Se o kill switch estiver ativo, recusa o envio com código explicativo sem derrubar o app.
 *   4. CONFIGURATION CHECK: Se segredos ausentes, recusa com NOT_CONFIGURED.
 *   5. ATUALIZAÇÃO DE STATUS: Atualiza nox_messages para SENT ou FAILED conforme resultado da Evolution.
 *   6. LOG SANITIZADO: NUNCA loga chaves nem o corpo confidencial completo.
 */

routerAdd(
  'POST',
  '/api/integrations/evolution/send',
  (e) => {
    const body = e.requestInfo().body || {}

    // 1. PROTEÇÃO CRÍTICA DE NOTA INTERNA (CAMADA BACKEND)
    if (
      body.isInternalNote === true ||
      body.type === 'INTERNAL_NOTE' ||
      body.collection === 'nox_internal_notes' ||
      (body.metadata && body.metadata.isInternalNote === true)
    ) {
      try {
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const aRec = new Record(auditCol)
        aRec.set('action', 'SECURITY_VIOLATION_INTERNAL_NOTE_BLOCKED')
        aRec.set('category', 'seguranca')
        aRec.set('actor', (e.auth && e.auth.getString('name')) || 'Operador')
        aRec.set('details', {
          reason: 'Tentativa de disparo externo de nota interna bloqueada no gateway.',
          messageId: body.messageId || null,
        })
        $app.save(aRec)
      } catch (_) {}

      return e.json(403, {
        success: false,
        code: 'INTERNAL_NOTE_PROHIBITED',
        error:
          'VIOLAÇÃO DE SEGURANÇA: Notas internas residem exclusivamente na NOX e jamais alcançam canais externos.',
      })
    }

    // 2. VERIFICAÇÃO DO KILL SWITCH
    try {
      const ksRecord = $app.findFirstRecordByData(
        'nox_integration_settings',
        'setting_key',
        'KILL_SWITCH_WHATSAPP_SENDING',
      )
      if (ksRecord && ksRecord.get('is_enabled') === true) {
        return e.json(423, {
          success: false,
          code: 'KILL_SWITCH_ACTIVE',
          error:
            'Envio externo suspenso temporariamente via Kill Switch administrativo. A mensagem foi registrada como pendente/não enviada.',
        })
      }
    } catch (_) {}

    // 3. VERIFICAÇÃO DE CONFIGURAÇÃO (SEGREDOS)
    const apiUrl = $os.getenv('EVOLUTION_API_URL') || ''
    const apiKey = $os.getenv('EVOLUTION_API_KEY') || ''
    const instanceName = $os.getenv('EVOLUTION_INSTANCE_NAME') || ''

    if (!apiUrl.trim() || !apiKey.trim() || !instanceName.trim()) {
      return e.json(503, {
        success: false,
        code: 'NOT_CONFIGURED',
        error:
          'Integração WhatsApp não configurada no backend. Cadastre os segredos da Evolution API no painel Skip Cloud.',
      })
    }

    // 4. VALIDAÇÃO DE CAMPOS MÍNIMOS
    const messageId = (body.messageId || '').trim()
    const recipientPhone = (body.recipientPhone || body.number || '').trim().replace(/\D/g, '')
    const textContent = (body.text || body.content || '').trim()

    if (!recipientPhone) {
      return e.json(400, {
        success: false,
        code: 'INVALID_PHONE',
        error: 'Número do destinatário não informado ou inválido.',
      })
    }

    if (!textContent) {
      return e.json(400, {
        success: false,
        code: 'EMPTY_CONTENT',
        error: 'Conteúdo da mensagem não pode ser vazio.',
      })
    }

    let cleanUrl = apiUrl.trim()
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1)
    }

    // Formata endpoint padrão de envio de texto Baileys da Evolution API
    // POST /message/sendText/{instance}
    const sendEndpoint = cleanUrl + '/message/sendText/' + encodeURIComponent(instanceName.trim())
    const payloadOutbound = {
      number: recipientPhone,
      text: textContent,
      options: {
        delay: 1200,
        presence: 'composing',
        linkPreview: false,
      },
    }

    let sendSuccess = false
    let externalMsgId = null
    let errorDetail = ''

    try {
      const res = $http.send({
        url: sendEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey.trim(),
        },
        body: JSON.stringify(payloadOutbound),
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        sendSuccess = true
        const respJson = res.json || {}
        externalMsgId =
          (respJson.key && respJson.key.id) ||
          respJson.id ||
          (respJson.message && respJson.message.id) ||
          null
      } else {
        errorDetail = 'HTTP_' + res.statusCode + ': ' + JSON.stringify(res.json || {})
      }
    } catch (httpErr) {
      errorDetail = 'Network error: ' + String(httpErr)
    }

    // 5. ATUALIZAÇÃO NO POCKETBASE (nox_messages)
    if (messageId) {
      try {
        const msgRec = $app.findFirstRecordByData('nox_messages', 'id', messageId)
        if (msgRec) {
          if (sendSuccess) {
            msgRec.set('status', 'SENT')
            msgRec.set('sent_at', new Date().toISOString())
            if (externalMsgId) {
              msgRec.set('external_message_id', externalMsgId)
            }
          } else {
            msgRec.set('status', 'FAILED')
            msgRec.set('failed_at', new Date().toISOString())
            msgRec.set('failure_reason', errorDetail.slice(0, 400))
          }
          $app.save(msgRec)
        }
      } catch (_) {}
    }

    // 6. AUDITORIA OPERACIONAL SANITIZADA
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const aRec = new Record(auditCol)
      aRec.set('action', sendSuccess ? 'WHATSAPP_MESSAGE_SENT' : 'WHATSAPP_MESSAGE_FAILED')
      aRec.set('category', 'atendimento')
      aRec.set('actor', (e.auth && e.auth.getString('name')) || 'Operador NOX')
      aRec.set('target_id', messageId || recipientPhone)
      aRec.set('details', {
        recipientEnding: recipientPhone.slice(-4),
        contentLength: textContent.length,
        success: sendSuccess,
        externalMessageId: externalMsgId,
        error: sendSuccess ? null : errorDetail.slice(0, 200),
      })
      $app.save(aRec)
    } catch (_) {}

    if (!sendSuccess) {
      return e.json(502, {
        success: false,
        code: 'SEND_FAILED',
        error: 'Mensagem não enviada pelo provedor WhatsApp. Verifique conexão da instância.',
        detail: errorDetail.slice(0, 300),
      })
    }

    return e.json(200, {
      success: true,
      status: 'SENT',
      externalMessageId: externalMsgId,
      sentAt: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
