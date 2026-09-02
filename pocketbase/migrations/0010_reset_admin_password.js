migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const email = 'contatoutinoiadv@gmail.com'

    let record
    try {
      record = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      record = new Record(users)
      record.setEmail(email)
      record.set('name', 'Operador NOX Master')
    }

    record.setPassword('Adm@2360')
    record.setVerified(true)
    record.set('role', 'admin')
    record.set('ativo', true)
    app.save(record)
  },
  (app) => {
    // Revert hook / noop
  },
)
