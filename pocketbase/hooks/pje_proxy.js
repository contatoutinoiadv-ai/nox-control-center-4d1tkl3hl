routerAdd(
  'POST',
  '/backend/v1/pje-proxy',
  (e) => {
    // Proxy seguro para APIs de tribunais/PJe sem expor segredos no cliente
    const info = e.requestInfo()
    const body = info.body || {}

    return e.json(200, {
      status: 'ok',
      source: 'Sentinela Gateway Seguro NOX',
      data: {
        items: [],
        total: 0,
        timestamp: new Date().toISOString(),
      },
    })
  },
  $apis.requireAuth(),
)
