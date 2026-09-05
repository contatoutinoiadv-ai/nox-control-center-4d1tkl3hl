/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook: evolution_health.js
 * Rota: GET /api/integrations/evolution/health
 *
 * Responsabilidade:
 * - Informa ao frontend o estado operacional da integração WhatsApp / Evolution.
 * - Estados:
 *   - NOT_CONFIGURED (segredos ausentes)
 *   - CONNECTED (instância conectada e pronta)
 *   - CONNECTING (instância iniciando ou reconectando)
 *   - DISCONNECTED (instância desconectada no WhatsApp)
 *   - DEGRADED (falha de comunicação com Evolution ou descoberta com erro)
 *   - UNKNOWN (estado ainda não aferido)
 * - REGRA ABSOLUTA: NUNCA expõe segredos, tokens ou URLs brutas com credenciais.
 * - Se os 4 segredos existirem e a descoberta estiver pendente, dispara a descoberta automaticamente de forma transparente.
 */

routerAdd('GET', '/api/integrations/evolution/health', (e) => {
  const apiUrl = $os.getenv('EVOLUTION_API_URL') || ''
  const apiKey = $os.getenv('EVOLUTION_API_KEY') || ''
  const instanceName = $os.getenv('EVOLUTION_INSTANCE_NAME') || ''
  const webhookSecret = $os.getenv('EVOLUTION_WEBHOOK_SECRET') || ''

  // 1. Verifica se os 4 segredos estão presentes
  const hasSecrets = Boolean(
    apiUrl.trim() && apiKey.trim() && instanceName.trim() && webhookSecret.trim(),
  )

  // 2. Consulta Kill Switch
  let killSwitchActive = false
  try {
    const ksRecord = $app.findFirstRecordByData(
      'nox_integration_settings',
      'setting_key',
      'KILL_SWITCH_WHATSAPP_SENDING',
    )
    if (ksRecord && ksRecord.get('is_enabled') === true) {
      killSwitchActive = true
    }
  } catch (_) {}

  // 3. Se segredos não existem, retorna NOT_CONFIGURED imediatamente
  if (!hasSecrets) {
    return e.json(200, {
      success: true,
      configured: false,
      status: 'NOT_CONFIGURED',
      instanceName: instanceName || null,
      killSwitchActive: killSwitchActive,
      discoveryStatus: 'NOT_CONFIGURED',
      details:
        'Credenciais da Evolution API ainda não configuradas nas variáveis de ambiente do backend.',
      checkedAt: new Date().toISOString(),
    })
  }

  // 4. Se segredos existem, verifica se já temos descoberta persistida
  let lastDiscovery = null
  try {
    const records = $app.findRecordsByFilter(
      'nox_integration_discovery',
      "provider = 'EVOLUTION'",
      '-created',
      1,
      0,
    )
    if (records && records.length > 0) {
      lastDiscovery = records[0]
    }
  } catch (_) {}

  // Se não tem descoberta prévia ou foi solicitada re-execução, executa descoberta inline
  let discoveryStatus = lastDiscovery ? lastDiscovery.getString('status') : 'PENDING'
  let detectedVersion = lastDiscovery ? lastDiscovery.getString('detected_version') : null
  let instanceState = lastDiscovery ? lastDiscovery.getString('instance_state') : 'UNKNOWN'

  if (!lastDiscovery || discoveryStatus === 'PENDING') {
    // Executa descoberta somente-leitura segura inline
    let cleanApiUrl = apiUrl.trim()
    if (cleanApiUrl.endsWith('/')) {
      cleanApiUrl = cleanApiUrl.slice(0, -1)
    }

    let detectedStatus = 'FAILED'
    let versionFound = 'UNKNOWN'
    let stateFound = 'DISCONNECTED'
    let endpointsMap = {}
    let errSummary = ''

    try {
      // 1. GET / (Raiz / versão)
      const resRoot = $http.send({
        url: cleanApiUrl + '/',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey.trim(),
        },
        timeout: 5,
      })

      if (resRoot.statusCode >= 200 && resRoot.statusCode < 300) {
        endpointsMap['GET /'] = 'AVAILABLE'
        const rootJson = resRoot.json || {}
        versionFound = rootJson.version || rootJson.build || 'DETECTED_ROOT'
      } else {
        endpointsMap['GET /'] = 'HTTP_' + resRoot.statusCode
      }
    } catch (errRoot) {
      endpointsMap['GET /'] = 'ERROR'
      errSummary += 'Falha na raiz: ' + String(errRoot) + '; '
    }

    try {
      // 2. GET /instance/connectionState/{instanceName}
      const resState = $http.send({
        url: cleanApiUrl + '/instance/connectionState/' + encodeURIComponent(instanceName.trim()),
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey.trim(),
        },
        timeout: 5,
      })

      if (resState.statusCode === 200) {
        endpointsMap['GET /instance/connectionState'] = 'AVAILABLE'
        const stateJson = resState.json || {}
        const rawState =
          stateJson.state ||
          (stateJson.instance && stateJson.instance.state) ||
          stateJson.status ||
          'UNKNOWN'

        if (String(rawState).toLowerCase() === 'open') {
          stateFound = 'CONNECTED'
          detectedStatus = 'DISCOVERED'
        } else if (String(rawState).toLowerCase() === 'connecting') {
          stateFound = 'CONNECTING'
          detectedStatus = 'DISCOVERED'
        } else {
          stateFound = 'DISCONNECTED'
          detectedStatus = 'DISCOVERED'
        }
      } else {
        endpointsMap['GET /instance/connectionState'] = 'HTTP_' + resState.statusCode
      }
    } catch (errState) {
      endpointsMap['GET /instance/connectionState'] = 'ERROR'
      errSummary += 'Falha no connectionState: ' + String(errState) + '; '
    }

    // Persiste registro de descoberta
    try {
      const discCol = $app.findCollectionByNameOrId('nox_integration_discovery')
      const rec = new Record(discCol)
      rec.set('provider', 'EVOLUTION')
      rec.set('status', detectedStatus)
      rec.set('detected_version', versionFound)
      rec.set('instance_name', instanceName.trim())
      rec.set('instance_state', stateFound)
      rec.set('endpoints_confirmed', endpointsMap)
      rec.set('events_available', [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE',
        'SEND_MESSAGE',
      ])
      rec.set('webhook_format', { authHeader: 'apikey', secretHeader: 'x-webhook-secret' })
      rec.set('auth_mode', 'API_KEY_HEADER')
      rec.set('raw_summary_sanitized', {
        instanceTarget: instanceName.trim(),
        endpointsTested: Object.keys(endpointsMap),
      })
      if (errSummary) {
        rec.set('error_message', errSummary.slice(0, 500))
      }
      rec.set('executed_at', new Date().toISOString())
      $app.save(rec)

      discoveryStatus = detectedStatus
      detectedVersion = versionFound
      instanceState = stateFound
    } catch (_) {}
  }

  // Mapeia para estado final do Health Check
  let operationalStatus = 'UNKNOWN'
  if (instanceState === 'CONNECTED') {
    operationalStatus = 'CONNECTED'
  } else if (instanceState === 'CONNECTING') {
    operationalStatus = 'CONNECTING'
  } else if (instanceState === 'DISCONNECTED') {
    operationalStatus = 'DISCONNECTED'
  } else if (discoveryStatus === 'FAILED') {
    operationalStatus = 'DEGRADED'
  }

  return e.json(200, {
    success: true,
    configured: true,
    status: operationalStatus,
    instanceName: instanceName.trim(),
    detectedVersion: detectedVersion,
    killSwitchActive: killSwitchActive,
    discoveryStatus: discoveryStatus,
    details:
      'Evolution configurada. Instância: ' + instanceName.trim() + ' (' + operationalStatus + ')',
    checkedAt: new Date().toISOString(),
  })
})
