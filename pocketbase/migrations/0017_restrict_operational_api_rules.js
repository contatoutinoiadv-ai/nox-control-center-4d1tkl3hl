/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0017: Restrição de API Rules para Coleções Operacionais (Fase 1 - Segurança)
 *
 * Exige usuário autenticado (@request.auth.id != "") para operações de leitura, listagem,
 * criação, atualização e exclusão nas seguintes coleções operacionais:
 * - records
 * - clients
 * - sentinela_communications
 * - sentinela_agenda
 * - production_items
 * - imports
 * - document_templates
 * - processos_monitorados
 * - alertas_movimentacao
 * - movimentacoes_processo
 *
 * Coleção audit_logs:
 * - Leitura e listagem restritas a usuários autenticados (@request.auth.id != "")
 * - Criação permitida (@request.auth.id != "" || @request.auth.id = "") para permitir
 *   registro de eventos de auditoria de login e falhas não autenticadas
 * - Edição e exclusão bloqueadas (null) para garantir integridade probatória / custódia
 *
 * Coleções de sistema / hooks / server-side:
 * - Operações server-side via $app.findCollectionByNameOrId utilizam permissões de admin/sistema
 *   e não são afetadas por estas API rules.
 * - Endpoints públicos (Intake, Preparação) utilizam hooks dedicados com rate limit e validação.
 */

migrate(
  (app) => {
    const operationalCollections = [
      'records',
      'clients',
      'sentinela_communications',
      'sentinela_agenda',
      'production_items',
      'imports',
      'document_templates',
      'processos_monitorados',
      'alertas_movimentacao',
      'movimentacoes_processo',
    ]

    for (const name of operationalCollections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) {
          col.listRule = '@request.auth.id != ""'
          col.viewRule = '@request.auth.id != ""'
          col.createRule = '@request.auth.id != ""'
          col.updateRule = '@request.auth.id != ""'
          col.deleteRule = '@request.auth.id != ""'
          app.save(col)
        }
      } catch (err) {
        console.warn('Erro ao atualizar rules da coleção ' + name + ':', err)
      }
    }

    // audit_logs: append-only, leitura restrita
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      if (auditCol) {
        auditCol.listRule = '@request.auth.id != ""'
        auditCol.viewRule = '@request.auth.id != ""'
        auditCol.createRule = '' // Permite registro de eventos do sistema e login
        auditCol.updateRule = null // Imutável
        auditCol.deleteRule = null // Imutável
        app.save(auditCol)
      }
    } catch (err) {
      console.warn('Erro ao atualizar rules de audit_logs:', err)
    }
  },
  (app) => {
    // Reversão / Rollback para estado público anterior
    const operationalCollections = [
      'records',
      'clients',
      'sentinela_communications',
      'sentinela_agenda',
      'production_items',
      'imports',
      'document_templates',
      'processos_monitorados',
      'alertas_movimentacao',
      'movimentacoes_processo',
    ]

    for (const name of operationalCollections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) {
          col.listRule = ''
          col.viewRule = ''
          col.createRule = ''
          col.updateRule = ''
          col.deleteRule = ''
          app.save(col)
        }
      } catch (err) {
        console.warn('Rollback: erro ao reverter collection ' + name + ':', err)
      }
    }

    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      if (auditCol) {
        auditCol.listRule = ''
        auditCol.viewRule = ''
        auditCol.createRule = ''
        auditCol.updateRule = ''
        auditCol.deleteRule = ''
        app.save(auditCol)
      }
    } catch (err) {
      console.warn('Rollback: erro ao reverter audit_logs:', err)
    }
  },
)
