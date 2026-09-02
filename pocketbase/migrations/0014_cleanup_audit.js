migrate((app) => {
  // Limpeza do registro de log de diagnóstico
  try {
    const logs = app.findRecordsByFilter('audit_logs', 'action = "TESTE_DIAGNOSTICO_DATAJUD"', '', 10, 0)
    for (let i = 0; i < logs.length; i++) {
      app.delete(logs[i])
    }
  } catch (_) {}
}, (app) => {})
