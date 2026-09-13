routerAdd(
  'POST',
  '/backend/v1/nox/neural/message',
  (e) => {
    // NOX NEURAL LINK - Proxy Seguro de Comunicação com Inteligências Artificiais NOX
    // Conecta com os segredos SKIP_AI_GATEWAY_URL e SKIP_AI_GATEWAY_API_KEY ou GEMINI_API_KEY do servidor.
    // Nenhuma credencial ou chave privada é exposta ao frontend.
    try {
      const auth = e.auth
      if (!auth) {
        return e.json(401, { ok: false, error: 'Sessão não autenticada no NOX Control Center.' })
      }

      const isAtivo = auth.getBool('ativo')
      if (isAtivo === false) {
        return e.json(403, {
          ok: false,
          error: 'Usuário inativo. Enlace neural desabilitado para esta conta.',
        })
      }

      const info = e.requestInfo()
      const body = info.body || {}
      const text = typeof body.text === 'string' ? body.text.trim() : ''
      const history = Array.isArray(body.history) ? body.history : []
      const agentTarget = typeof body.agentTarget === 'string' ? body.agentTarget.trim() : 'core'

      if (!text) {
        return e.json(400, { ok: false, error: 'Mensagem vazia recebida pelo enlace neural.' })
      }

      // Sanitização server-side anti-prompt injection e truncamento de segurança
      let cleanText = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

      if (cleanText.length > 4000) {
        cleanText = cleanText.slice(0, 4000) + '... [truncado]'
      }

      const SYSTEM_INSTRUCTION =
        'Você é o NOX NEURAL LINK, canal operacional e executivo de comunicação com as inteligências do ecossistema NOX. ' +
        'Suas respostas devem ser concisas, assertivas, naturais e diretas (máximo 2 a 3 frases por resposta falada em português do Brasil). ' +
        'Nunca aja como pessoa física ou robô fictício; seja a interface de comando neural operacional rápida e precisa.'

      let aiResponseText = ''
      let usedModel = 'gemini-flash'
      let usedProvider = 'Skip AI Gateway'

      // Montagem dos conteúdos para o modelo
      const contentsForGemini = []
      const safeHistory = history.slice(-10)
      for (let i = 0; i < safeHistory.length; i++) {
        const item = safeHistory[i]
        const role = item.role === 'model' || item.role === 'assistant' ? 'model' : 'user'
        const contentStr =
          typeof item.text === 'string'
            ? item.text
            : Array.isArray(item.parts) && item.parts[0] && item.parts[0].text
              ? item.parts[0].text
              : ''
        if (contentStr) {
          contentsForGemini.push({
            role: role,
            parts: [{ text: contentStr.slice(0, 2000) }],
          })
        }
      }
      contentsForGemini.push({
        role: 'user',
        parts: [{ text: cleanText }],
      })

      // 1. Tentar Skip AI Gateway via HTTP com segredos
      const gwUrl = $os.getenv('SKIP_AI_GATEWAY_URL')
      const gwKey = $os.getenv('SKIP_AI_GATEWAY_API_KEY')

      if (gwUrl && gwKey) {
        try {
          let ep = gwUrl
          if (ep.endsWith('/')) ep = ep.slice(0, -1)
          if (!ep.includes('/chat/completions') && !ep.includes('/v1')) {
            ep = ep + '/v1/chat/completions'
          } else if (!ep.includes('/chat/completions')) {
            ep = ep + '/chat/completions'
          }

          const gwMessages = [{ role: 'system', content: SYSTEM_INSTRUCTION }]
          for (let i = 0; i < contentsForGemini.length; i++) {
            const c = contentsForGemini[i]
            gwMessages.push({
              role: c.role === 'model' ? 'assistant' : 'user',
              content: c.parts[0].text,
            })
          }

          const gwRes = $http.send({
            url: ep,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + gwKey,
              'api-key': gwKey,
            },
            body: JSON.stringify({
              model: 'fast',
              messages: gwMessages,
              temperature: 0.7,
              max_tokens: 250,
            }),
            timeout: 25,
          })

          if (gwRes && gwRes.statusCode >= 200 && gwRes.statusCode < 300) {
            const data = gwRes.json || JSON.parse(gwRes.raw || '{}')
            if (data && data.choices && data.choices.length > 0) {
              aiResponseText = data.choices[0].message?.content || ''
              usedModel = data.model || 'fast'
              usedProvider = 'Skip AI Gateway'
            }
          } else {
            console.log(
              '[nox-neural] Gateway HTTP status:',
              gwRes ? gwRes.statusCode : 'sem resposta',
            )
          }
        } catch (httpErr) {
          console.log('[nox-neural] Erro no gateway http:', httpErr.message || httpErr)
        }
      }

      // 2. Se não respondeu, tentar via $ai.chat se disponível
      if (!aiResponseText && typeof $ai !== 'undefined' && typeof $ai.chat === 'function') {
        try {
          const aiChatMessages = [{ role: 'system', content: SYSTEM_INSTRUCTION }]
          for (let i = 0; i < contentsForGemini.length; i++) {
            const c = contentsForGemini[i]
            aiChatMessages.push({
              role: c.role === 'model' ? 'assistant' : 'user',
              content: c.parts[0].text,
            })
          }
          const chatRes = $ai.chat({
            model: 'fast',
            messages: aiChatMessages,
          })
          if (chatRes && chatRes.choices && chatRes.choices.length > 0) {
            aiResponseText = chatRes.choices[0].message?.content || ''
            usedModel = 'fast (Skip AI)'
            usedProvider = 'Skip AI'
          }
        } catch (aiErr) {
          console.log('[nox-neural] Erro em $ai.chat:', aiErr.message || aiErr)
        }
      }

      // 3. Se ainda não respondeu, tentar GEMINI_API_KEY direta se definida no servidor
      const directGeminiKey = $os.getenv('GEMINI_API_KEY')
      if (!aiResponseText && directGeminiKey) {
        try {
          const directUrl =
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
            encodeURIComponent(directGeminiKey)

          const directRes = $http.send({
            url: directUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
              contents: contentsForGemini,
              generationConfig: { temperature: 0.7, maxOutputTokens: 250 },
            }),
            timeout: 25,
          })

          if (directRes && directRes.statusCode >= 200 && directRes.statusCode < 300) {
            const data = directRes.json || JSON.parse(directRes.raw || '{}')
            const cand = data.candidates && data.candidates[0]
            const parts = ((cand || {}).content || {}).parts || []
            aiResponseText = parts
              .map((p) => p.text || '')
              .join('')
              .trim()
            usedModel = 'gemini-2.5-flash (Direto)'
            usedProvider = 'Google Gemini Direct'
          }
        } catch (dirErr) {
          console.log('[nox-neural] Erro no Gemini direto:', dirErr.message || dirErr)
        }
      }

      if (!aiResponseText || aiResponseText.trim().length === 0) {
        return e.json(503, {
          ok: false,
          error: 'Inteligência NOX temporariamente indisponível no gateway neural.',
          code: 'NEURAL_GATEWAY_UNAVAILABLE',
        })
      }

      // Registro de Auditoria no banco (categoria sistema)
      try {
        const authUser = auth.getString('email') || auth.id
        const auditCol = $app.findCollectionByNameOrId('audit_logs')
        const logRec = new Record(auditCol)
        logRec.set('action', 'NOX_NEURAL_LINK_MESSAGE')
        logRec.set('category', 'sistema')
        logRec.set('actor', authUser)
        logRec.set('target_id', 'neural_link')
        logRec.set('details', {
          canal: 'NOX NEURAL LINK',
          targetAgent: agentTarget,
          model: usedModel,
          provider: usedProvider,
          inputLength: cleanText.length,
          outputLength: aiResponseText.length,
          timestamp: new Date().toISOString(),
        })
        logRec.set('ip_address', e.requestInfo().remoteIP || '127.0.0.1')
        $app.save(logRec)
      } catch (auditErr) {
        console.log('[nox-neural] Aviso ao auditar:', auditErr.message || auditErr)
      }

      return e.json(200, {
        ok: true,
        text: aiResponseText.trim(),
        model: usedModel,
        provider: usedProvider,
        agent: agentTarget === 'core' ? 'NOX Central Intelligence' : agentTarget,
      })
    } catch (err) {
      console.log('[nox-neural] Falha geral no endpoint:', err.message || err)
      return e.json(500, {
        ok: false,
        error: 'Erro interno no NOX NEURAL LINK: ' + (err.message || err),
        code: 'NEURAL_INTERNAL_ERROR',
      })
    }
  },
  $apis.requireAuth(),
)
