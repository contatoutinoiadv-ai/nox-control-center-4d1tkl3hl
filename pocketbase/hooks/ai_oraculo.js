routerAdd(
  'POST',
  '/backend/v1/ai/oraculo',
  (e) => {
    // Endpoint seguro para consultas e triagens jurídicas com IA (Google Gemini via Skip AI Gateway)
    // Nenhuma chave é exposta ao cliente.
    try {
      const info = e.requestInfo()
      const body = info.body || {}
      const modo = String(body.modo || 'oraculo')
      const rawMessages = Array.isArray(body.messages) ? body.messages : []
      const contexto = typeof body.contexto === 'string' ? body.contexto : ''
      const payload = typeof body.payload === 'string' ? body.payload : ''

      // 1. Sanitização server-side anti-prompt injection
      const sanitizePromptText = (text) => {
        if (!text || typeof text !== 'string') return ''
        let sanitized = text
          // Remove HTML tags / scripts
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          // Normaliza caracteres de controle
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        // Limita tamanho para evitar ataques de DoS/buffer overflow
        if (sanitized.length > 12000) {
          sanitized = sanitized.slice(0, 12000) + '... [conteúdo truncado para segurança]'
        }
        return sanitized
      }

      const sanitizeUserInstruction = (text) => {
        if (!text || typeof text !== 'string') return ''
        let s = sanitizePromptText(text)
        // Padrões de desvio/jailbreak (ignore previous instructions, system prompt override, etc.)
        const injectionPatterns = [
          /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
          /esqueça\s+(todas\s+)?as\s+instruç[õo]es\s+(anteriores|prévias)/gi,
          /desconsidere\s+(as\s+)?instruç[õo]es\s+(anteriores|acima)/gi,
          /you\s+are\s+now\s+in\s+DAN\s+mode/gi,
          /habilite\s+o\s+modo\s+sem\s+regras/gi,
          /system\s*:\s*/gi,
          /<<SYS>>/gi,
        ]
        for (let i = 0; i < injectionPatterns.length; i++) {
          s = s.replace(injectionPatterns[i], '[conteúdo neutralizado por segurança]')
        }
        return s
      }

      // 2. System Prompt Jurídico-Operacional Rígido (Português do Brasil)
      const systemPrompt = [
        'Você é o ORÁCULO NOX — Inteligência Jurídica e Operacional do NOX Control Center / Sentinela NOX, operando com motor Google Gemini.',
        'Sua missão é auxiliar advogados e controladores de prazos com máxima precisão, rigor técnico e estrita aderência aos fatos.',
        '',
        'DIRETRIZES DE SEGURANÇA E CONFORMIDADE JURÍDICA:',
        '1. NUNCA invente prazos, números de processos, decisões ou regras inexistentes.',
        '2. Se os dados da publicação ou contexto forem insuficientes ou ambíguos para determinar um prazo com 100% de certeza, declare expressamente "PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE" e indique a necessidade de leitura integral da peça.',
        '3. Toda análise ou resposta DEVE indicar explicitamente ao final: (a) Fonte da Informação utilizada, (b) Nível de Confiança da IA (Alta / Média / Requer Atenção), e (c) O aviso obrigatório: "⚠️ Revisão humana obrigatória por advogado responsável antes de qualquer protocolo ou decisão processual."',
        '4. Adote sempre português do Brasil, tom executivo e técnico, destacando riscos preclusivos, feriados/suspensões locais (ex: Art. 268 CODJ TJMS) e regras do CPC/CPP/CLT quando cabível.',
        '5. Formate respostas com títulos em negrito, tópicos concisos e clareza estrutural.',
      ].join('\n')

      // 3. Montagem das mensagens para a IA
      const aiMessages = [{ role: 'system', content: systemPrompt }]

      // Adiciona contexto sanitizado se houver
      if (contexto && contexto.trim().length > 0) {
        aiMessages.push({
          role: 'system',
          content: 'CONTEXTO DE PUBLICAÇÕES E OPERAÇÃO ATUAL:\n' + sanitizePromptText(contexto),
        })
      }

      if (modo === 'analise-lote') {
        const batchPayload = sanitizePromptText(payload)
        aiMessages.push({
          role: 'user',
          content:
            'Execute a análise em lote das seguintes publicações judiciais. Para cada publicação, analise a urgência, identifique a natureza do ato (intimação, citação, acórdão, audiência) e sugira as providências operacionais:\n\n' +
            batchPayload +
            '\n\nRetorne um resumo executivo estruturado com o panorama e os alertas de maior urgência.',
        })
      } else if (modo === 'briefing') {
        const briefingPayload = sanitizePromptText(payload)
        aiMessages.push({
          role: 'user',
          content:
            'Gere o briefing operacional inicial do dia com base no seguinte cenário de publicações:\n\n' +
            briefingPayload +
            '\n\nIdentifique prioridades para as próximas 48-72h, riscos de preclusão e direcionamento estratégico.',
        })
      } else {
        // Modo oráculo / chat
        if (rawMessages.length > 0) {
          // Pega as últimas 8 mensagens para manter limite de contexto
          const recent = rawMessages.slice(-8)
          for (let i = 0; i < recent.length; i++) {
            const m = recent[i]
            const role = m.role === 'user' ? 'user' : 'assistant'
            const content =
              m.role === 'user' ? sanitizeUserInstruction(m.content) : sanitizePromptText(m.content)
            if (content.trim()) {
              aiMessages.push({ role: role, content: content })
            }
          }
        } else if (payload) {
          aiMessages.push({
            role: 'user',
            content: sanitizeUserInstruction(payload),
          })
        } else {
          aiMessages.push({
            role: 'user',
            content:
              'Apresente-se como Oráculo NOX e faça um diagnóstico operacional breve do contexto ativo.',
          })
        }
      }

      // 4. Chamada via Skip AI Gateway (rotas gerenciadas para modelos Google Gemini / fast / reasoning)
      let aiResponse = null
      let usedModel = 'gemini-flash (via Skip AI)'
      let usageInfo = null

      // Tentativa 1: usar o helper nativo $ai se disponível no runtime
      if (typeof $ai !== 'undefined' && typeof $ai.chat === 'function') {
        try {
          // O gateway Skip roteia o alias 'fast' para o modelo rápido provisionado (Gemini 2.5 Flash / Flash)
          const result = $ai.chat({
            model: 'fast',
            messages: aiMessages,
          })
          if (result && result.choices && result.choices.length > 0) {
            aiResponse = result.choices[0].message?.content || ''
            usedModel = result.model || 'gemini-flash (Skip AI fast)'
            usageInfo = result.usage || null
          }
        } catch (aiErr) {
          console.log('[Oraculo NOX] Erro em $ai.chat:', aiErr.message || aiErr)
        }
      }

      // Tentativa 2: chamada direta via $http.send ao gateway nativo Skip Cloud configurado nos segredos
      if (!aiResponse) {
        const gatewayUrl = $os.getenv('SKIP_AI_GATEWAY_URL')
        const gatewayKey = $os.getenv('SKIP_AI_GATEWAY_API_KEY')

        if (gatewayUrl && gatewayKey) {
          try {
            let endpoint = gatewayUrl
            if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1)
            if (!endpoint.includes('/chat/completions') && !endpoint.includes('/v1')) {
              endpoint = endpoint + '/v1/chat/completions'
            } else if (!endpoint.includes('/chat/completions')) {
              endpoint = endpoint + '/chat/completions'
            }

            // Tenta 'fast' primeiro, se falhar tenta 'gemini-2.5-flash' / 'gemini-2.0-flash'
            const modelsToTry = ['fast', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
            for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
              const modelCandidate = modelsToTry[mIdx]
              const httpRes = $http.send({
                url: endpoint,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: 'Bearer ' + gatewayKey,
                  'api-key': gatewayKey,
                },
                body: JSON.stringify({
                  model: modelCandidate,
                  messages: aiMessages,
                  temperature: 0.2,
                  max_tokens: 1500,
                }),
                timeout: 30,
              })

              if (httpRes && httpRes.statusCode >= 200 && httpRes.statusCode < 300) {
                const data = httpRes.json || JSON.parse(httpRes.raw || '{}')
                if (data && data.choices && data.choices.length > 0) {
                  aiResponse = data.choices[0].message?.content || ''
                  usedModel = data.model || modelCandidate
                  usageInfo = data.usage || null
                  break
                }
              }
            }
          } catch (httpErr) {
            console.log('[Oraculo NOX] Erro em $http.send gateway:', httpErr.message || httpErr)
          }
        }
      }

      // Se obtivemos resposta da IA com sucesso
      if (aiResponse && aiResponse.trim().length > 0) {
        return e.json(200, {
          ok: true,
          content: aiResponse,
          model: usedModel,
          modo: modo,
          usage: usageInfo,
          source: 'Google Gemini (Skip AI Gateway)',
          disclaimer: 'Revisão humana obrigatória. Informações sujeitas a conferência processual.',
        })
      }

      // Caso o gateway não responda ou retorne vazio
      return e.json(503, {
        ok: false,
        error: 'Serviço de IA temporariamente indisponível no gateway. Fallback local recomendado.',
        code: 'AI_GATEWAY_UNAVAILABLE',
      })
    } catch (globalErr) {
      console.log('[Oraculo NOX] Erro inesperado:', globalErr.message || globalErr)
      return e.json(500, {
        ok: false,
        error: 'Falha interna ao processar requisição de IA.',
        code: 'INTERNAL_AI_ERROR',
      })
    }
  },
  $apis.requireAuth(),
)
