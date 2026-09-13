import pb from '@/lib/pocketbase/client'

export interface NeuralMessageItem {
  id: string
  role: 'user' | 'ai'
  text: string
  timestamp: string
  agent?: string
  source?: string
}

export interface NeuralPreferences {
  voiceURI: string
  rate: number
  pitch: number
  wakeWordEnabled: boolean
  devApiKey: string
  useDevKey: boolean
}

export const DEFAULT_NEURAL_PREFERENCES: NeuralPreferences = {
  voiceURI: '',
  rate: 1.05,
  pitch: 1.0,
  wakeWordEnabled: false,
  devApiKey: '',
  useDevKey: false,
}

const PREF_STORAGE_KEY = 'nox.neural.preferences.v1'

export interface NeuralSendResponse {
  text: string
  agent: string
  source: string
  model?: string
}

export class NoxNeuralLinkService {
  private static loadPreferences(): NeuralPreferences {
    try {
      const raw = localStorage.getItem(PREF_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          ...DEFAULT_NEURAL_PREFERENCES,
          ...parsed,
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // Fallbacks legados do protótipo
    return {
      voiceURI: localStorage.getItem('nox.voiceURI') || '',
      rate: parseFloat(localStorage.getItem('nox.rate') || '1.05') || 1.05,
      pitch: parseFloat(localStorage.getItem('nox.pitch') || '1') || 1.0,
      wakeWordEnabled: localStorage.getItem('nox.wake') === '1',
      devApiKey: (localStorage.getItem('nox.key') || '').trim(),
      useDevKey: Boolean((localStorage.getItem('nox.key') || '').trim()),
    }
  }

  public static getPreferences(): NeuralPreferences {
    return this.loadPreferences()
  }

  public static savePreferences(prefs: Partial<NeuralPreferences>): NeuralPreferences {
    const current = this.loadPreferences()
    const updated: NeuralPreferences = {
      ...current,
      ...prefs,
    }
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(updated))
      // Manter sincronizado com chaves antigas se necessário
      localStorage.setItem('nox.voiceURI', updated.voiceURI)
      localStorage.setItem('nox.rate', String(updated.rate))
      localStorage.setItem('nox.pitch', String(updated.pitch))
      localStorage.setItem('nox.wake', updated.wakeWordEnabled ? '1' : '0')
      if (updated.devApiKey !== undefined) {
        localStorage.setItem('nox.key', updated.devApiKey)
      }
    } catch (e) {
      console.warn('[NoxNeuralLinkService] Falha ao persistir preferências:', e)
    }
    return updated
  }

  /**
   * Envia a mensagem com rota prioritária no backend seguro da Central NOX.
   * Se o backend não responder ou se o modo dev de chave manual estiver ativado,
   * recorre ao Google Gemini cliente com alerta explícito de segurança.
   */
  public static async sendMessage(
    text: string,
    history: NeuralMessageItem[],
    agentTarget: string = 'core',
  ): Promise<NeuralSendResponse> {
    const cleanText = text.trim()
    if (!cleanText) {
      throw new Error('Mensagem vazia para o enlace neural.')
    }

    const prefs = this.getPreferences()

    // 1. TENTATIVA PRIORITÁRIA: Rota segura no backend PocketBase
    let backendError: string | null = null
    const token = pb.authStore?.isValid ? pb.authStore.token : null

    if (token && !prefs.useDevKey) {
      try {
        const baseUrl = pb.baseUrl.replace(/\/$/, '')
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const res = await fetch(`${baseUrl}/backend/v1/nox/neural/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token,
          },
          body: JSON.stringify({
            text: cleanText,
            history: history.slice(-8).map((h) => ({
              role: h.role === 'user' ? 'user' : 'assistant',
              text: h.text,
            })),
            agentTarget,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (res.ok) {
          const data = await res.json()
          if (data && data.text) {
            return {
              text: data.text,
              agent: data.agent || 'NOX Central Intelligence',
              source: data.provider || 'Gateway Seguro NOX',
              model: data.model,
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}))
          backendError = errData.error || `HTTP ${res.status}`
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          backendError = 'Tempo limite excedido ao aguardar resposta da inteligência (30s).'
        } else {
          backendError = err.message || 'Falha de conexão com o backend'
        }
      }
    }

    // 2. MODO DESENVOLVIMENTO / CHAVE MANUAL DO USUÁRIO (se configurada e ativada)
    if (prefs.devApiKey && (prefs.useDevKey || backendError)) {
      try {
        const res = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': prefs.devApiKey,
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [
                  {
                    text:
                      'Você é o NOX NEURAL LINK, canal operacional e executivo de comunicação com as inteligências do ecossistema NOX. ' +
                      'Suas respostas devem ser concisas, assertivas, naturais e diretas (máximo 2 a 3 frases por resposta falada em português do Brasil). ' +
                      'Seja rápido e objetivo.',
                  },
                ],
              },
              contents: [
                ...history.slice(-6).map((h) => ({
                  role: h.role === 'user' ? 'user' : 'model',
                  parts: [{ text: h.text }],
                })),
                {
                  role: 'user',
                  parts: [{ text: cleanText }],
                },
              ],
              generationConfig: { temperature: 0.7, maxOutputTokens: 250 },
            }),
          },
        )

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error((err && err.error && err.error.message) || `HTTP ${res.status}`)
        }

        const data = await res.json()
        const cand = data.candidates && data.candidates[0]
        const out = (((cand || {}).content || {}).parts || [])
          .map((p: any) => p.text || '')
          .join('')
          .trim()
        if (!out) throw new Error('O modelo retornou resposta vazia.')

        return {
          text: out,
          agent: 'NOX Direct Model (Dev Mode)',
          source: 'Gemini Client (Chave Local Dev)',
          model: 'gemini-2.5-flash',
        }
      } catch (devErr: any) {
        throw new Error(`Falha no modo Dev (Chave Local): ${devErr.message || devErr}`)
      }
    }

    if (backendError) {
      throw new Error(`Enlace seguro indisponível: ${backendError}`)
    }

    throw new Error('Sessão sem credencial de gateway neural. Configure a chave dev ou faça login.')
  }
}
