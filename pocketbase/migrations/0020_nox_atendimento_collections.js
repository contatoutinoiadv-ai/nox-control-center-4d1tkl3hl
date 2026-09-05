/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0020: Central de Atendimento NOX V2 (Fase 6 - Lote 1)
 *
 * 1. Expande a categoria em `audit_logs` para suportar `atendimento`.
 * 2. Cria coleções do domínio da Central de Atendimento:
 *    - nox_conversations
 *    - nox_messages
 *    - nox_message_attachments
 *    - nox_assignments
 *    - nox_internal_notes
 *    - nox_ai_analysis
 *    - nox_webhook_events
 *
 * Separação estrutural estrita: notas internas residem exclusivamente em nox_internal_notes,
 * nunca como mensagens outbound de nox_messages.
 * Relacionamentos canônicos reutilizam `clients`, `processos_monitorados` e `users` (_pb_users_auth_).
 * Princípio do menor privilégio em API Rules e preservação probatória (sem exclusão de auditoria).
 */

migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const clientsColId = app.findCollectionByNameOrId('clients').id
    const processosColId = app.findCollectionByNameOrId('processos_monitorados').id

    // 1. Expandir categorias de audit_logs para incluir 'atendimento'
    try {
      const auditCol = app.findCollectionByNameOrId('audit_logs')
      if (auditCol) {
        const catField = auditCol.fields.getByName('category')
        if (catField) {
          const currentValues = Array.isArray(catField.values) ? catField.values : []
          if (!currentValues.includes('atendimento')) {
            catField.values = [...currentValues, 'atendimento']
            app.save(auditCol)
          }
        }
      }
    } catch (err) {
      console.warn('0020: Erro ao expandir categoria de audit_logs:', err)
    }

    // 2. Coleção nox_conversations
    let convCol
    try {
      convCol = app.findCollectionByNameOrId('nox_conversations')
    } catch (_) {
      convCol = new Collection({
        name: 'nox_conversations',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          {
            name: 'channel',
            type: 'select',
            required: true,
            values: ['WHATSAPP', 'INTERNAL', 'PORTAL', 'SISTEMA'],
            maxSelect: 1,
          },
          { name: 'external_conversation_id', type: 'text', required: false },
          { name: 'phone_normalized', type: 'text', required: false },
          { name: 'contact_name', type: 'text', required: false },
          {
            name: 'client_id',
            type: 'relation',
            required: false,
            collectionId: clientsColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'process_id',
            type: 'relation',
            required: false,
            collectionId: processosColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'assigned_user_id',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'NEW',
              'TRIAGE',
              'IN_PROGRESS',
              'WAITING_CLIENT',
              'WAITING_OFFICE',
              'WAITING_DOCUMENT',
              'COMPLETED',
              'ARCHIVED',
            ],
            maxSelect: 1,
          },
          {
            name: 'priority',
            type: 'select',
            required: true,
            values: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
            maxSelect: 1,
          },
          { name: 'last_message_at', type: 'text', required: false },
          { name: 'last_message_preview', type: 'text', required: false },
          { name: 'unread_count', type: 'number', required: false },
          { name: 'is_archived', type: 'bool', required: false },
          { name: 'instance_id', type: 'text', required: false },
          { name: 'external_chat_id', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_nox_conv_status ON nox_conversations (status)',
          'CREATE INDEX idx_nox_conv_priority ON nox_conversations (priority)',
          'CREATE INDEX idx_nox_conv_assigned ON nox_conversations (assigned_user_id)',
          'CREATE INDEX idx_nox_conv_client ON nox_conversations (client_id)',
          'CREATE INDEX idx_nox_conv_process ON nox_conversations (process_id)',
          'CREATE INDEX idx_nox_conv_last_msg ON nox_conversations (last_message_at DESC)',
          'CREATE INDEX idx_nox_conv_phone ON nox_conversations (phone_normalized)',
          'CREATE INDEX idx_nox_conv_ext_id ON nox_conversations (external_conversation_id)',
        ],
      })
      app.save(convCol)
    }

    const conversationsColId = app.findCollectionByNameOrId('nox_conversations').id

    // 3. Coleção nox_messages
    let msgCol
    try {
      msgCol = app.findCollectionByNameOrId('nox_messages')
    } catch (_) {
      msgCol = new Collection({
        name: 'nox_messages',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          {
            name: 'conversation_id',
            type: 'relation',
            required: true,
            collectionId: conversationsColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'external_message_id', type: 'text', required: false },
          {
            name: 'direction',
            type: 'select',
            required: true,
            values: ['INBOUND', 'OUTBOUND', 'INTERNAL_SYSTEM'],
            maxSelect: 1,
          },
          {
            name: 'type',
            type: 'select',
            required: true,
            values: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'SYSTEM'],
            maxSelect: 1,
          },
          { name: 'sender_type', type: 'text', required: false },
          {
            name: 'sender_user_id',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'sender_external_id', type: 'text', required: false },
          { name: 'content_text', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'],
            maxSelect: 1,
          },
          { name: 'reply_to_message_id', type: 'text', required: false },
          { name: 'sent_at', type: 'text', required: false },
          { name: 'delivered_at', type: 'text', required: false },
          { name: 'read_at', type: 'text', required: false },
          { name: 'failed_at', type: 'text', required: false },
          { name: 'failure_reason', type: 'text', required: false },
          { name: 'metadata_json', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_nox_msg_conv_created ON nox_messages (conversation_id, created ASC)',
          'CREATE INDEX idx_nox_msg_ext_id ON nox_messages (external_message_id)',
          'CREATE INDEX idx_nox_msg_status ON nox_messages (status)',
          'CREATE INDEX idx_nox_msg_direction ON nox_messages (direction)',
        ],
      })
      app.save(msgCol)
    }

    const messagesColId = app.findCollectionByNameOrId('nox_messages').id

    // 4. Coleção nox_message_attachments
    let attachCol
    try {
      attachCol = app.findCollectionByNameOrId('nox_message_attachments')
    } catch (_) {
      attachCol = new Collection({
        name: 'nox_message_attachments',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          {
            name: 'message_id',
            type: 'relation',
            required: true,
            collectionId: messagesColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'file',
            type: 'file',
            required: false,
            maxSelect: 1,
            maxSize: 26214400, // 25 MB
            mimeTypes: [
              'image/jpeg',
              'image/png',
              'image/webp',
              'image/gif',
              'audio/ogg',
              'audio/mpeg',
              'audio/mp4',
              'audio/wav',
              'video/mp4',
              'video/quicktime',
              'application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'text/plain',
              'text/csv',
            ],
          },
          { name: 'mime_type', type: 'text', required: true },
          { name: 'original_name', type: 'text', required: true },
          { name: 'size', type: 'number', required: false },
          { name: 'sha256', type: 'text', required: false },
          { name: 'storage_provider', type: 'text', required: false },
          { name: 'metadata_json', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_nox_attach_msg ON nox_message_attachments (message_id)',
          'CREATE INDEX idx_nox_attach_sha256 ON nox_message_attachments (sha256)',
        ],
      })
      app.save(attachCol)
    }

    // 5. Coleção nox_assignments (Histórico real de atribuições)
    let assignCol
    try {
      assignCol = app.findCollectionByNameOrId('nox_assignments')
    } catch (_) {
      assignCol = new Collection({
        name: 'nox_assignments',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          {
            name: 'conversation_id',
            type: 'relation',
            required: true,
            collectionId: conversationsColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'assigned_to_user_id',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'assigned_by_user_id',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'reason', type: 'text', required: false },
          { name: 'assigned_at', type: 'text', required: false },
          { name: 'ended_at', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_nox_assign_conv ON nox_assignments (conversation_id, created DESC)',
          'CREATE INDEX idx_nox_assign_user ON nox_assignments (assigned_to_user_id)',
        ],
      })
      app.save(assignCol)
    }

    // 6. Coleção nox_internal_notes (CRÍTICA: separação estrutural de mensagens outbound)
    let noteCol
    try {
      noteCol = app.findCollectionByNameOrId('nox_internal_notes')
    } catch (_) {
      noteCol = new Collection({
        name: 'nox_internal_notes',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != "" && author_user_id = @request.auth.id',
        deleteRule:
          '@request.auth.id != "" && (@request.auth.role = "admin" || author_user_id = @request.auth.id)',
        fields: [
          {
            name: 'conversation_id',
            type: 'relation',
            required: true,
            collectionId: conversationsColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'author_user_id',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'content', type: 'text', required: true },
          { name: 'mentions', type: 'json', required: false },
          { name: 'is_archived', type: 'bool', required: false },
          { name: 'deleted_at', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_nox_notes_conv ON nox_internal_notes (conversation_id, created ASC)',
          'CREATE INDEX idx_nox_notes_author ON nox_internal_notes (author_user_id)',
        ],
      })
      app.save(noteCol)
    }

    // 7. Coleção nox_ai_analysis (Sugestões de IA com revisão humana)
    let aiCol
    try {
      aiCol = app.findCollectionByNameOrId('nox_ai_analysis')
    } catch (_) {
      aiCol = new Collection({
        name: 'nox_ai_analysis',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          {
            name: 'conversation_id',
            type: 'relation',
            required: true,
            collectionId: conversationsColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'message_id',
            type: 'relation',
            required: false,
            collectionId: messagesColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'analysis_type',
            type: 'select',
            required: true,
            values: [
              'TRIAGE',
              'SUMMARY',
              'INTENT',
              'URGENCY',
              'CLASSIFICATION',
              'RESPONSE_SUGGESTION',
              'DOCUMENT_ANALYSIS',
            ],
            maxSelect: 1,
          },
          { name: 'provider', type: 'text', required: false },
          { name: 'model', type: 'text', required: false },
          { name: 'result_json', type: 'json', required: true },
          { name: 'confidence', type: 'number', required: false },
          {
            name: 'review_status',
            type: 'select',
            required: true,
            values: ['PENDING', 'APPROVED', 'REJECTED', 'EDITED', 'NOT_REQUIRED'],
            maxSelect: 1,
          },
          {
            name: 'reviewed_by',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_nox_ai_conv ON nox_ai_analysis (conversation_id, created DESC)',
          'CREATE INDEX idx_nox_ai_type ON nox_ai_analysis (analysis_type)',
          'CREATE INDEX idx_nox_ai_review ON nox_ai_analysis (review_status)',
        ],
      })
      app.save(aiCol)
    }

    // 8. Coleção nox_webhook_events (Idempotência e resiliência)
    let webhookCol
    try {
      webhookCol = app.findCollectionByNameOrId('nox_webhook_events')
    } catch (_) {
      webhookCol = new Collection({
        name: 'nox_webhook_events',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
        fields: [
          { name: 'provider', type: 'text', required: true },
          { name: 'event_type', type: 'text', required: true },
          { name: 'external_event_id', type: 'text', required: false },
          { name: 'payload_hash', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED'],
            maxSelect: 1,
          },
          { name: 'received_at', type: 'text', required: false },
          { name: 'processed_at', type: 'text', required: false },
          { name: 'attempts', type: 'number', required: false },
          { name: 'error_summary', type: 'text', required: false },
          { name: 'metadata_json', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_nox_wh_dedup ON nox_webhook_events (provider, external_event_id) WHERE external_event_id != ""',
          'CREATE INDEX idx_nox_wh_hash ON nox_webhook_events (payload_hash)',
          'CREATE INDEX idx_nox_wh_status ON nox_webhook_events (status)',
          'CREATE INDEX idx_nox_wh_created ON nox_webhook_events (created DESC)',
        ],
      })
      app.save(webhookCol)
    }
  },
  (app) => {
    // Reversão em ordem inversa respeitando chaves estrangeiras
    const collectionsToDelete = [
      'nox_webhook_events',
      'nox_ai_analysis',
      'nox_internal_notes',
      'nox_assignments',
      'nox_message_attachments',
      'nox_messages',
      'nox_conversations',
    ]

    for (const name of collectionsToDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) {
          app.delete(col)
        }
      } catch (err) {
        console.warn('0020 rollback: erro ao remover coleção ' + name + ':', err)
      }
    }
  },
)
