/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0021: Central de Atendimento NOX V2 (Fase 8 - Preparatório Evolution API)
 *
 * 1. Cria coleção `nox_integration_discovery` para persistir o mapa de descoberta
 *    automática da Evolution API (versão real, endpoints, eventos, autenticação, status da instância HUA-ATENDIMENTO).
 * 2. Cria coleção `nox_integration_settings` para gerenciar Kill Switch de envio,
 *    modo operacional, quotas e configurações administrativas sem reiniciar a aplicação.
 */

migrate(
  (app) => {
    // 1. Coleção nox_integration_discovery
    let discoveryCol
    try {
      discoveryCol = app.findCollectionByNameOrId('nox_integration_discovery')
    } catch (_) {
      discoveryCol = new Collection({
        name: 'nox_integration_discovery',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        updateRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          { name: 'provider', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['PENDING', 'NOT_CONFIGURED', 'DISCOVERED', 'FAILED'],
            maxSelect: 1,
          },
          { name: 'detected_version', type: 'text', required: false },
          { name: 'instance_name', type: 'text', required: false },
          { name: 'instance_state', type: 'text', required: false },
          { name: 'endpoints_confirmed', type: 'json', required: false },
          { name: 'events_available', type: 'json', required: false },
          { name: 'webhook_format', type: 'json', required: false },
          { name: 'auth_mode', type: 'text', required: false },
          { name: 'raw_summary_sanitized', type: 'json', required: false },
          { name: 'error_message', type: 'text', required: false },
          { name: 'executed_at', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_nox_disc_provider ON nox_integration_discovery (provider)',
          'CREATE INDEX idx_nox_disc_status ON nox_integration_discovery (status)',
          'CREATE INDEX idx_nox_disc_created ON nox_integration_discovery (created DESC)',
        ],
      })
      app.save(discoveryCol)
    }

    // 2. Coleção nox_integration_settings (Kill switch, flags administrativas)
    let settingsCol
    try {
      settingsCol = app.findCollectionByNameOrId('nox_integration_settings')
    } catch (_) {
      settingsCol = new Collection({
        name: 'nox_integration_settings',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        updateRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          { name: 'setting_key', type: 'text', required: true },
          { name: 'is_enabled', type: 'bool', required: false },
          { name: 'setting_value', type: 'text', required: false },
          { name: 'metadata_json', type: 'json', required: false },
          { name: 'updated_by', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_nox_sett_key ON nox_integration_settings (setting_key)'],
      })
      app.save(settingsCol)

      // Seed inicial do Kill Switch (habilitado por padrão quando configurado, mas seguro)
      try {
        const killSwitchRecord = new Record(settingsCol)
        killSwitchRecord.set('setting_key', 'KILL_SWITCH_WHATSAPP_SENDING')
        killSwitchRecord.set('is_enabled', false) // false = NÃO bloqueado (envio permitido quando configurado)
        killSwitchRecord.set('setting_value', 'NORMAL_OPERATION')
        killSwitchRecord.set('metadata_json', {
          description:
            'Quando is_enabled=true, o envio de mensagens WhatsApp pela NOX é imediatamente suspenso no backend sem derrubar a recepção.',
        })
        killSwitchRecord.set('updated_by', 'system_init')
        app.save(killSwitchRecord)
      } catch (err) {
        console.warn('0021: Erro ao semear kill switch inicial:', err)
      }
    }
  },
  (app) => {
    try {
      const sCol = app.findCollectionByNameOrId('nox_integration_settings')
      if (sCol) app.delete(sCol)
    } catch (_) {}

    try {
      const dCol = app.findCollectionByNameOrId('nox_integration_discovery')
      if (dCol) app.delete(dCol)
    } catch (_) {}
  },
)
