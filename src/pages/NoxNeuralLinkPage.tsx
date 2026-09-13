import React, { useState, useEffect, useRef, useCallback } from 'react'
import { NeuralLinkState, NEURAL_STATES, AudioBands } from '@/components/neural/neuralTypes'
import {
  NoxNeuralLinkService,
  NeuralPreferences,
  NeuralMessageItem,
} from '@/services/noxNeuralLinkService'
import {
  NeuralHeader,
  NeuralStatusPill,
  NeuralFabButton,
  NeuralHistoryPanel,
  NeuralConfigPanel,
} from '@/components/neural/NeuralOverlayControls'
import { NeuralOscilloscope } from '@/components/neural/NeuralOscilloscope'
import { Sliders, History } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

// Lazy import Three.js brain scene for code splitting & clean mounting
const NeuralBrainCanvas = React.lazy(() =>
  import('@/components/neural/NeuralBrainCanvas').then((m) => ({
    default: m.NeuralBrainCanvas,
  })),
)

export const NoxNeuralLinkPage: React.FC = () => {
  const [state, setState] = useState<NeuralLinkState>('idle')
  const [history, setHistory] = useState<NeuralMessageItem[]>([])
  const [preferences, setPreferences] = useState<NeuralPreferences>(
    NoxNeuralLinkService.getPreferences(),
  )
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [recActive, setRecActive] = useState(false)
  const [micBlocked, setMicBlocked] = useState(false)
  const [userTranscript, setUserTranscript] = useState('')
  const [aiSubtitle, setAiSubtitle] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Real operational indicators
  const [online, setOnline] = useState(navigator.onLine)
  const [routingAvailable, setRoutingAvailable] = useState(
    Boolean(pb.authStore?.isValid && pb.authStore.token),
  )
  const [voiceAvailable, setVoiceAvailable] = useState(false)
  const [agentsAvailable] = useState(true) // NOX Core Agent

  // Audio & Animation refs
  const audioBandsRef = useRef<AudioBands>({ bass: 0, mid: 0, treble: 0, level: 0 })
  const timeDataRef = useRef<Uint8Array | null>(null)
  const speakPulseRef = useRef<number>(0)
  const actxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const micAnalyserRef = useRef<AnalyserNode | null>(null)
  const micSrcRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const recRef = useRef<any>(null)
  const speakTimerRef = useRef<any>(null)
  const startWatchRef = useRef<any>(null)
  const speakGenRef = useRef<number>(0)
  const userHideTimerRef = useRef<any>(null)
  const stateRef = useRef<NeuralLinkState>(state)
  stateRef.current = state
  const preferencesRef = useRef<NeuralPreferences>(preferences)
  preferencesRef.current = preferences

  // Reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Network state listeners
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Check Web Speech API support
  useEffect(() => {
    const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window
    const hasRecognition =
      typeof window !== 'undefined' &&
      Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    setVoiceAvailable(hasSpeechSynthesis || hasRecognition)

    if (hasSpeechSynthesis) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices()
        if (v && v.length > 0) {
          setVoices(v)
        }
      }
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    setRoutingAvailable(Boolean(pb.authStore?.isValid && pb.authStore.token))
  }, [])

  /* -------------------------------------------------------------
     Áudio (AudioContext + AnalyserNode)
  ------------------------------------------------------------- */
  const ensureAudioCtx = async () => {
    if (!actxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        actxRef.current = new AudioCtx()
      }
    }
    if (actxRef.current && actxRef.current.state === 'suspended') {
      await actxRef.current.resume()
    }
    return actxRef.current
  }

  const startMicAudio = async () => {
    try {
      const ctx = await ensureAudioCtx()
      if (!ctx) return
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      micStreamRef.current = stream
      const src = ctx.createMediaStreamSource(stream)
      micSrcRef.current = src
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.72
      src.connect(analyser)
      micAnalyserRef.current = analyser

      const freqData = new Uint8Array(analyser.frequencyBinCount)
      const timeData = new Uint8Array(analyser.fftSize)
      timeDataRef.current = timeData

      setMicBlocked(false)

      // Audio loop para atualizar audioBandsRef
      const updateAudio = () => {
        if (!micAnalyserRef.current || !micStreamRef.current?.active) return
        analyser.getByteFrequencyData(freqData)
        analyser.getByteTimeDomainData(timeData)

        const n = freqData.length
        let bass = 0
        let mid = 0
        let treb = 0
        let sum = 0
        const b1 = (n / 8) | 0
        const b2 = (n / 2) | 0

        for (let i = 0; i < b1; i++) bass += freqData[i]
        for (let i = b1; i < b2; i++) mid += freqData[i]
        for (let i = b2; i < n; i++) treb += freqData[i]
        bass /= b1 * 255
        mid /= (b2 - b1) * 255
        treb /= (n - b2) * 255

        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / timeData.length)
        audioBandsRef.current = {
          bass,
          mid,
          treble: treb,
          level: Math.min(1, rms * 3.2),
          rms,
        }

        // Barge-in por voz: se o usuário falar alto enquanto a IA está respondendo, corta a fala
        if (stateRef.current === 'speaking' && rms > 0.14) {
          cutSpeech()
        }

        if (stateRef.current === 'listening' || stateRef.current === 'speaking') {
          requestAnimationFrame(updateAudio)
        }
      }

      requestAnimationFrame(updateAudio)
    } catch (err: any) {
      console.warn('[NoxNeuralLink] Microfone não acessível:', err)
      setMicBlocked(true)
      toast.error('Microfone bloqueado ou indisponível', {
        description: 'Verifique as permissões de mídia no navegador para usar a voz.',
      })
    }
  }

  const stopMicAudio = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
    }
    if (micSrcRef.current) {
      try {
        micSrcRef.current.disconnect()
      } catch {
        /* intentionally ignored */
      }
      micSrcRef.current = null
    }
    micAnalyserRef.current = null
  }

  /* -------------------------------------------------------------
     Síntese de Fala (TTS) + Barge-in
  ------------------------------------------------------------- */
  const cutSpeech = useCallback(() => {
    speakGenRef.current++
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    clearInterval(speakTimerRef.current)
    clearTimeout(startWatchRef.current)
    speakPulseRef.current = 0
    audioBandsRef.current = { bass: 0, mid: 0, treble: 0, level: 0 }
    if (stateRef.current === 'speaking') {
      setState('idle')
    }
  }, [])

  const speak = useCallback(
    (text: string, isRetry = false, plainVoice = false) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setState('idle')
        return
      }

      const gen = ++speakGenRef.current
      window.speechSynthesis.cancel()
      clearTimeout(startWatchRef.current)
      clearInterval(speakTimerRef.current)

      const utterance = new SpeechSynthesisUtterance(text)
      const currentPrefs = preferencesRef.current

      if (!plainVoice && currentPrefs.voiceURI) {
        const found = voices.find((v) => v.voiceURI === currentPrefs.voiceURI)
        if (found) {
          utterance.voice = found
          utterance.lang = found.lang
        } else {
          utterance.lang = 'pt-BR'
        }
      } else {
        const defaultPt =
          voices.find((v) => v.lang === 'pt-BR' && v.default) ||
          voices.find((v) => /^pt/i.test(v.lang))
        if (defaultPt) utterance.voice = defaultPt
        utterance.lang = 'pt-BR'
      }

      utterance.rate = currentPrefs.rate || 1.05
      utterance.pitch = currentPrefs.pitch || 1.0

      let started = false

      const done = () => {
        if (gen !== speakGenRef.current) return
        clearInterval(speakTimerRef.current)
        clearTimeout(startWatchRef.current)
        speakPulseRef.current = 0
        audioBandsRef.current = { bass: 0, mid: 0, treble: 0, level: 0 }
        if (stateRef.current === 'speaking' || stateRef.current === 'thinking') {
          setState('idle')
        }
      }

      utterance.onstart = () => {
        if (gen !== speakGenRef.current) return
        started = true
        setState('speaking')
      }

      utterance.onboundary = () => {
        if (gen !== speakGenRef.current) return
        speakPulseRef.current = Math.min(1, speakPulseRef.current + 0.55)
      }

      utterance.onerror = (ev) => {
        if (gen !== speakGenRef.current) return
        if (ev && ev.error && !/cancel|interrupt|abort/i.test(ev.error)) {
          if (!plainVoice && /network|synthesis|not-allowed|audio-busy/i.test(ev.error)) {
            speak(text, false, true)
            return
          }
          toast.error(`Falha no áudio: ${ev.error}`)
        }
        done()
      }

      utterance.onend = done

      speakTimerRef.current = setInterval(() => {
        speakPulseRef.current = Math.min(1, speakPulseRef.current + 0.28 + Math.random() * 0.3)
        const t = performance.now() / 1000
        const lvl = Math.min(1, speakPulseRef.current)
        audioBandsRef.current = {
          bass: lvl * (0.65 + 0.35 * Math.sin(t * 8.0)),
          mid: lvl * (0.55 + 0.45 * Math.sin(t * 12.5 + 1.3)),
          treble: lvl * (0.45 + 0.55 * Math.sin(t * 23.0 + 0.4)),
          level: lvl * (0.75 + 0.25 * Math.sin(t * 17.0)),
        }
        try {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume()
        } catch {
          /* intentionally ignored */
        }
      }, 240)

      window.speechSynthesis.speak(utterance)

      // Watchdog para motores mudos
      startWatchRef.current = setTimeout(() => {
        if (
          gen !== speakGenRef.current ||
          started ||
          window.speechSynthesis.speaking ||
          window.speechSynthesis.pending
        )
          return
        if (!isRetry) {
          speak(text, true)
          return
        }
        clearInterval(speakTimerRef.current)
        toast.info('Áudio indisponível neste navegador; resposta exibida em texto.')
        done()
      }, 1200)
    },
    [voices],
  )

  /* -------------------------------------------------------------
     Envio de Mensagem à Inteligência (NoxNeuralLinkService)
  ------------------------------------------------------------- */
  const handleSendMessage = async (text: string) => {
    cutSpeech()
    const cleanText = text.trim()
    if (!cleanText) return

    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const userMsg: NeuralMessageItem = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: cleanText,
      timestamp: timeStr,
    }

    setHistory((prev) => [...prev, userMsg])
    setUserTranscript(cleanText)
    setAiSubtitle('')
    setState('thinking')
    setIsSending(true)

    // Esconder transcrição do usuário após alguns segundos
    clearTimeout(userHideTimerRef.current)
    userHideTimerRef.current = setTimeout(() => setUserTranscript(''), 6000)

    try {
      const response = await NoxNeuralLinkService.sendMessage(cleanText, history, 'core')
      const aiMsg: NeuralMessageItem = {
        id: `ai_${Date.now()}`,
        role: 'ai',
        text: response.text,
        timestamp: timeStr,
        agent: response.agent,
        source: response.source,
      }
      setHistory((prev) => [...prev, aiMsg])
      setAiSubtitle(response.text)
      speak(response.text)
    } catch (err: any) {
      console.error('[NoxNeuralLink] Erro no envio:', err)
      toast.error('Falha no enlace neural', {
        description: err.message || 'Não foi possível obter resposta da inteligência.',
      })
      setState('idle')
    } finally {
      setIsSending(false)
    }
  }

  /* -------------------------------------------------------------
     Reconhecimento de Voz (STT) + Wake Word
  ------------------------------------------------------------- */
  const WAKE_RE = /^\s*(assistente|nox)[\s,.:!?]+/i

  const startRec = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      toast.error('Reconhecimento de voz não suportado', {
        description: 'Utilize o Google Chrome ou Edge, ou envie mensagens escritas no painel.',
      })
      return
    }

    try {
      const rec = new SR()
      recRef.current = rec
      rec.lang = 'pt-BR'
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.continuous = preferences.wakeWordEnabled

      rec.onresult = (e: any) => {
        let interim = ''
        let final = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) final += r[0].transcript
          else interim += r[0].transcript
        }
        if (interim) setUserTranscript(interim)
        if (final) {
          const clean = final.replace(/\s+/g, ' ').trim()
          if (!clean) return
          if (preferencesRef.current.wakeWordEnabled) {
            if (!WAKE_RE.test(clean)) {
              setUserTranscript(clean)
              return
            }
            handleSendMessage(clean.replace(WAKE_RE, '').trim() || 'olá')
          } else {
            handleSendMessage(clean)
          }
        }
      }

      rec.onerror = (ev: any) => {
        if (ev.error === 'not-allowed') {
          setMicBlocked(true)
          toast.error('Acesso ao microfone negado.')
          setRecActive(false)
        } else if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
          console.warn('[NoxNeuralLink] Erro de reconhecimento:', ev.error)
        }
      }

      rec.onend = () => {
        setRecActive(false)
        if (preferencesRef.current.wakeWordEnabled) {
          try {
            rec.start()
            setRecActive(true)
          } catch {
            /* intentionally ignored */
          }
        } else if (stateRef.current === 'listening') {
          setState('idle')
        }
      }

      rec.start()
      setRecActive(true)
      setState('listening')
      startMicAudio()
    } catch (err: any) {
      console.warn('[NoxNeuralLink] Falha ao iniciar reconhecimento:', err)
      toast.error(`Falha ao iniciar escuta: ${err.message || err}`)
    }
  }

  const stopRec = () => {
    if (recRef.current) {
      try {
        recRef.current.stop()
      } catch {
        /* intentionally ignored */
      }
      recRef.current = null
    }
    setRecActive(false)
    stopMicAudio()
    if (stateRef.current === 'listening') {
      setState('idle')
    }
  }

  const handleFabClick = () => {
    ensureAudioCtx()
    if (state === 'speaking') {
      cutSpeech()
      return
    }
    if (state === 'thinking') return

    if (recActive) {
      stopRec()
    } else {
      startRec()
    }
  }

  // Teclado Escape corta fala
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (stateRef.current === 'speaking') {
          cutSpeech()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cutSpeech])

  // Desmontagem e isolamento estrito de ciclo de vida
  useEffect(() => {
    return () => {
      cutSpeech()
      stopRec()
      stopMicAudio()
      if (actxRef.current) {
        try {
          actxRef.current.close()
        } catch {
          /* intentionally ignored */
        }
      }
    }
  }, [cutSpeech])

  const handleUpdatePreferences = (newPrefs: Partial<NeuralPreferences>) => {
    const updated = NoxNeuralLinkService.savePreferences(newPrefs)
    setPreferences(updated)
    toast.success('Parâmetros do núcleo salvos.')
  }

  const handleClearHistory = () => {
    setHistory([])
    setAiSubtitle('')
    setUserTranscript('')
    toast.info('Registros da sessão foram limpos.')
  }

  const handleTestVoice = () => {
    speak(
      'Enlace neural operacional. Todos os sistemas respondendo dentro dos parâmetros previstos.',
    )
  }

  return (
    <div className="relative flex flex-col w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] bg-[#020408] text-slate-100 overflow-hidden select-none">
      {/* 1. Cabeçalho Interno */}
      <NeuralHeader
        online={online}
        routingAvailable={routingAvailable}
        voiceAvailable={voiceAvailable}
        agentsAvailable={agentsAvailable}
        isDevMode={preferences.useDevKey}
      />

      {/* 2. Palco Neural Central (3D + Osciloscópio + Legendas + HUD) */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden flex flex-col items-center justify-center">
        {/* Cena 3D Three.js com container isolado */}
        <React.Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-cyan-400/80 animate-pulse">
              INICIANDO ENLACE NEURAL 3D...
            </div>
          }
        >
          <NeuralBrainCanvas
            state={state}
            audioBandsRef={audioBandsRef}
            reducedMotion={reducedMotion}
            className="absolute inset-0"
          />
        </React.Suspense>

        {/* Scanlines & Vinheta decorativa contida estritamente dentro do módulo */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              'radial-gradient(ellipse 110% 85% at 50% 45%, transparent 50%, rgba(2,4,8,0.85) 100%)',
          }}
        />

        {/* HUD Top: Botões de Acesso Rápido aos Painéis e Pílula de Estado */}
        <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={() => {
              setIsHistoryOpen((v) => !v)
              setIsConfigOpen(false)
            }}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-[#080e1c]/80 backdrop-blur-md text-xs font-mono text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 shadow-lg shadow-black/40 transition-all uppercase tracking-wider"
            title="Abrir registros de conversa"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Registros</span>
          </button>

          <div className="pointer-events-auto">
            <NeuralStatusPill state={state} onInterrupt={cutSpeech} micBlocked={micBlocked} />
          </div>

          <button
            type="button"
            onClick={() => {
              setIsConfigOpen((v) => !v)
              setIsHistoryOpen(false)
            }}
            className="pointer-events-auto flex items-center justify-center w-8 h-8 rounded-xl border border-slate-700/80 bg-[#080e1c]/80 backdrop-blur-md text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 shadow-lg shadow-black/40 transition-all"
            title="Abrir configurações de voz e chave"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* Legenda Dinâmica de Fala / Transcrição */}
        <div className="absolute bottom-28 inset-x-6 z-20 flex flex-col items-center pointer-events-none text-center max-w-2xl mx-auto space-y-1.5">
          {userTranscript && (
            <div className="text-xs text-slate-400 font-sans tracking-wide bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800/80 backdrop-blur-sm animate-in fade-in">
              &raquo; {userTranscript}
            </div>
          )}
          {aiSubtitle && (
            <div className="text-sm sm:text-base font-sans text-slate-100 leading-relaxed font-normal bg-[#040812]/80 px-4 py-2 rounded-2xl border border-purple-800/40 backdrop-blur-md shadow-lg shadow-purple-950/40 animate-in fade-in">
              <span className="block font-mono text-[9px] uppercase tracking-widest text-purple-400 font-bold mb-0.5">
                NOX Responde
              </span>
              <p className="select-text pointer-events-auto">{aiSubtitle}</p>
            </div>
          )}
        </div>

        {/* Base: Osciloscópio 2D integrado */}
        <div className="absolute inset-x-0 bottom-0 h-32 flex items-end justify-center pointer-events-none z-10">
          <NeuralOscilloscope
            state={state}
            micActive={recActive}
            timeDataRef={timeDataRef}
            speakPulseRef={speakPulseRef}
            className="h-24 w-full"
          />
        </div>

        {/* Controle Circular FAB Centralizado na Base */}
        <div className="absolute bottom-6 z-20 flex flex-col items-center">
          <NeuralFabButton
            state={state}
            recActive={recActive}
            onClick={handleFabClick}
            disabled={!online}
          />
        </div>

        {/* 3. Painéis Laterais Internos */}
        <NeuralHistoryPanel
          open={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          messages={history}
          onSendMessage={handleSendMessage}
          onClearHistory={handleClearHistory}
          isSending={isSending}
        />

        <NeuralConfigPanel
          open={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          voices={voices}
          onTestVoice={handleTestVoice}
        />
      </div>
    </div>
  )
}

export default NoxNeuralLinkPage
