/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook: evolution_killswitch.js
 * Rota: POST /api/integrations/evolution/killswitch
 *
 * Responsabilidade:
 * - Permite ao administrador ATIVAR ou DESATIVAR o Kill Switch de envio WhatsApp.
 * - Ativar kill switch (is_enabled = true): suspende todo disparo externo de mensagens.
 *   A Central de Atendimento continua operando normalmente para notas internas e recepção de mensagens.
 * - Requer autenticação de administrador no PocketBase.
 */

routerAdd(
  'POST',
  '/api/integrations/evolution/killswitch',
  (e) => {
    const body = e.requestInfo().body || {}
    const activate = Boolean(body.active)
    const reason = (body.reason || 'Acionamento manual pelo operador/administrador').trim()

    let ksRecord
    try {
      ksRecord = $app.findFirstRecordByData(
        'nox_integration_settings',
        'setting_key',
        'KILL_SWITCH_WHATSAPP_SENDING',
      )
    } catch (_) {
      const col = $app.findCollectionByNameOrId('nox_integration_settings')
      ksRecord = new Record(col)
      ksRecord.set('setting_key', 'KILL_SWITCH_WHATSAPP_SENDING')
    }

    ksRecord.set('is_enabled', activate)
    ksRecord.set(
      'setting_value',
      activate ? 'KILL_SWITCH_ACTIVE_SENDING_DISABLED' : 'NORMAL_OPERATION',
    )
    ksRecord.set('metadata_json', {
      reason: reason,
      updatedAt: new Date().toISOString(),
      adminId: (e.auth && e.auth.id) || 'unknown_admin',
    })
    ksRecord.set('updated_by', (e.auth && e.auth.getString('name')) || 'Administrador NOX')
    $app.save(ksRecord)

    // Log de auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('audit_logs')
      const aRec = new Record(auditCol)
      aRec.set('action', activate ? 'KILL_SWITCH_ACTIVATED' : 'KILL_SWITCH_DEACTIVATED')
      aRec.set('category', 'atendimento')
      aRec.set('actor', (e.auth && e.auth.getString('name')) || 'Administrador NOX')
      aRec.set('target_id', ksRecord.id)
      aRec.set('details', {
        active: activate,
        reason: reason,
      })
      $app.save(aRec)
    } catch (_) {}

    return e.json(200, {
      success: true,
      killSwitchActive: activate,
      message: activate
        ? 'Kill Switch ATIVADO: envio de mensagens externas WhatsApp suspenso com sucesso.'
        : 'Kill Switch DESATIVADO: envio de mensagens externas WhatsApp restabelecido.',
      updatedAt: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
