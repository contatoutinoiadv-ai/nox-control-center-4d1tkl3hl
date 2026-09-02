migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'contatoutinoiadv@gmail.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('contatoutinoiadv@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Operador NOX Master')
      app.save(record)
    }

    // Initial audit log
    const auditCol = app.findCollectionByNameOrId('audit_logs')
    const initLog = new Record(auditCol)
    initLog.set('action', 'SISTEMA_INICIALIZADO')
    initLog.set('category', 'sistema')
    initLog.set('actor', 'NOX System Engine')
    initLog.set('target_id', 'SYS-001')
    initLog.set('details', {
      message: 'NOX Control Center inicializado com sucesso no ambiente operacional.',
      version: '1.0.0',
      compliance: 'Sentinela-Isolation-Level-1',
    })
    app.save(initLog)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'contatoutinoiadv@gmail.com')
      app.delete(record)
    } catch (_) {}
  },
)
