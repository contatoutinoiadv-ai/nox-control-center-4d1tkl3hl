/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook: evolution_discover.js
 * Rota: POST /api/integrations/evolution/discover
 *
 * Responsabilidade:
 * - Executa a rotina formal de DESCOBERTA AUTOMÁTICA da Evolution API.
 * - Somente-leitura estrita:
 *   - Não recria instâncias
 *   - Não deleta instâncias
 *   - Não chama logout
 *   - Não altera banco da Evolution
 * - Consulta endpoints públicos de diagnóstico:
 *   1. GET /
 *   2. GET /instance/fetchInstances
 *   3. GET /instance/connectionState/{instanceName}
 * - Registra em `nox_integration_discovery` o resultado com:
 *   - detected_version
 *   - endpoints_confirmed
 *   - events_available
 *   - instance_state
 *   - auth_mode
 *   - raw_summary_sanitized (SEM segredos ou chaves)
 * - Se segredos ausentes, retorna NOT_CONFIGURED de forma limpa.
 */

routerAdd('POST', '/api/integrations/evolution/discover', (e) => {
  const apiUrl = $os.getenv('EVOLUTION_API_URL') || ''
  const apiKey = $os.getenv('EVOLUTION_API_KEY') || ''
  const instanceName = $os.getenv('EVOLUTION_INSTANCE_NAME') || ''
  const webhookSecret = $os.getenv('EVOLUTION_WEBHOOK_SECRET') || ''

  if (!apiUrl.trim() || !apiKey.trim() || !instanceName.trim() || !webhookSecret.trim()) {
    return e.json(200, {
      success: false,
      status: 'NOT_CONFIGURED',
      message: 'Não é possível executar descoberta: segredos da Evolution API ausentes no backend.',
      missing: {
        EVOLUTION_API_URL: !apiUrl.trim(),
        EVOLUTION_API_KEY: !apiKey.trim(),
        EVOLUTION_INSTANCE_NAME: !instanceName.trim(),
        EVOLUTION_WEBHOOK_SECRET: !webhookSecret.trim(),
      },
    })
  }

  let cleanUrl = apiUrl.trim()
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1)
  }

  const endpointsMap = {}
  let detectedVersion = 'UNKNOWN'
  let instanceFoundState = 'DISCONNECTED'
  let errorSummary = ''
  let statusResult = 'FAILED'

  // 1. GET /
  try {
    const resRoot = $http.send({
      url: cleanUrl + '/',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey.trim(),
      },
      timeout: 8,
    })
    endpointsMap['GET /'] = 'HTTP_' + resRoot.statusCode
    if (resRoot.statusCode >= 200 && resRoot.statusCode < 300) {
      const j = resRoot.json || {}
      detectedVersion = j.version || j.build || j.message || 'DETECTED_ROOT'
    }
  } catch (err) {
    endpointsMap['GET /'] = 'UNREACHABLE'
    errorSummary += 'Root: ' + String(err) + '; '
  }

  // 2. GET /instance/connectionState/{instanceName}
  try {
    const resState = $http.send({
      url: cleanUrl + '/instance/connectionState/' + encodeURIComponent(instanceName.trim()),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey.trim(),
      },
      timeout: 8,
    })
    endpointsMap['GET /instance/connectionState'] = 'HTTP_' + resState.statusCode
    if (resState.statusCode === 200) {
      const sj = resState.json || {}
      const rawState = sj.state || (sj.instance && sj.instance.state) || sj.status || 'UNKNOWN'
      if (String(rawState).toLowerCase() === 'open') {
        instanceFoundState = 'CONNECTED'
      } else if (String(rawState).toLowerCase() === 'connecting') {
        instanceFoundState = 'CONNECTING'
      } else {
        instanceFoundState = 'DISCONNECTED'
      }
      statusResult = 'DISCOVERED'
    }
  } catch (err) {
    endpointsMap['GET /instance/connectionState'] = 'UNREACHABLE'
    errorSummary += 'ConnectionState: ' + String(err) + '; '
  }

  // 3. GET /instance/fetchInstances (Somente leitura para listar instâncias)
  try {
    const resInstances = $http.send({
      url: cleanUrl + '/instance/fetchInstances',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey.trim(),
      },
      timeout: 8,
    })
    endpointsMap['GET /instance/fetchInstances'] = 'HTTP_' + resInstances.statusCode
  } catch (_) {
    endpointsMap['GET /instance/fetchInstances'] = 'NOT_SUPPORTED_OR_ERROR'
  }

  // Persiste na coleção nox_integration_discovery
  let recordId = null
  try {
    const discCol = $app.findCollectionByNameOrId('nox_integration_discovery')
    const rec = new Record(discCol)
    rec.set('provider', 'EVOLUTION')
    rec.set('status', statusResult)
    rec.set('detected_version', detectedVersion)
    rec.set('instance_name', instanceName.trim())
    rec.set('instance_state', instanceFoundState)
    rec.set('endpoints_confirmed', endpointsMap)
    rec.set('events_available', [
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE',
      'MESSAGES_DELETE',
      'SEND_MESSAGE',
      'CONNECTION_UPDATE',
      'QRCODE_UPDATED',
    ])
    rec.set('webhook_format', {
      authHeader: 'apikey',
      secretHeader: 'x-webhook-secret',
      queryParam: 'secret',
    })
    rec.set('auth_mode', 'API_KEY_HEADER')
    rec.set('raw_summary_sanitized', {
      targetInstance: instanceName.trim(),
      endpointsAudited: endpointsMap,
      versionReported: detectedVersion,
    })
    if (errorSummary) {
      rec.set('error_message', errorSummary.slice(0, 500))
    }
    rec.set('executed_at', new Date().toISOString())
    $app.save(rec)
    recordId = rec.id

    // Registra em audit_logs
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const aRec = new Record(auditCol)
      aRec.set('action', 'PROVIDER_DISCOVERY_EXECUTED')
      aRec.set('category', 'atendimento')
      aRec.set('actor', 'NOX Evolution Discovery Hook')
      aRec.set('target_id', rec.id)
      aRec.set('details', {
        status: statusResult,
        version: detectedVersion,
        instanceState: instanceFoundState,
      })
      $app.save(aRec)
    } catch (_) {}
  } catch (saveErr) {
    errorSummary += 'Falha ao salvar discovery: ' + String(saveErr)
  }

  return e.json(200, {
    success: statusResult === 'DISCOVERED',
    status: statusResult,
    discoveryId: recordId,
    version: detectedVersion,
    instanceName: instanceName.trim(),
    instanceState: instanceFoundState,
    endpoints: endpointsMap,
    errors: errorSummary || null,
    executedAt: new Date().toISOString(),
  })
})
