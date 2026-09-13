import React from 'react'
import {
  Mic,
  Square,
  Activity,
  Sliders,
  History,
  X,
  Send,
  Eye,
  EyeOff,
  Volume2,
  Trash2,
  Cpu,
  Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NeuralLinkState, NEURAL_STATES, NEURAL_ACCENT_COLORS } from './neuralTypes'
import { NeuralPreferences, NeuralMessageItem } from '@/services/noxNeuralLinkService'

/* -------------------------------------------------------------
   1. CABEÇALHO INTERNO COM INDICADORES REAIS
------------------------------------------------------------- */
interface NeuralHeaderProps {
  online: boolean
  routingAvailable: boolean
  voiceAvailable: boolean
  agentsAvailable: boolean
  isDevMode: boolean
}

export const NeuralHeader: React.FC<NeuralHeaderProps> = ({
  online,
  routingAvailable,
  voiceAvailable,
  agentsAvailable,
  isDevMode,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-[#050811]/90 border-b border-slate-800/80 backdrop-blur-md shrink-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
          <h1 className="text-sm font-extrabold tracking-wider font-mono text-slate-100 uppercase">
            NOX NEURAL LINK
          </h1>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-cyan-800/60 bg-cyan-950/40 text-cyan-300 px-1.5 py-0"
          >
            COMUNICAÇÃO NEURAL
          </Badge>
          {isDevMode && (
            <Badge
              variant="outline"
              className="text-[9px] font-mono border-amber-800/60 bg-amber-950/40 text-amber-300 px-1.5 py-0"
            >
              MODO DEV (CHAVE LOCAL)
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xl">
          Interface central de comunicação por voz e texto com as inteligências NOX.
        </p>
      </div>

      {/* Indicadores Compactos Reais */}
      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
            online
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/50'
          }`}
          title={online ? 'Rede operacional online' : 'Sem conexão de rede'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-rose-400'}`}
          />
          {online ? 'COMUNICAÇÃO ONLINE' : 'CONEXÃO INDISPONÍVEL'}
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
            routingAvailable
              ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/50'
              : 'bg-amber-950/40 text-amber-300 border-amber-800/50'
          }`}
          title={routingAvailable ? 'Roteamento seguro backend ativo' : 'Aguardando autenticação'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${routingAvailable ? 'bg-cyan-400' : 'bg-amber-400'}`}
          />
          {routingAvailable ? 'ROTEAMENTO DISPONÍVEL' : 'AGUARDANDO CONEXÃO'}
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
            voiceAvailable
              ? 'bg-purple-950/40 text-purple-300 border-purple-800/50'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
          title={
            voiceAvailable
              ? 'Web Speech API disponível no navegador'
              : 'Reconhecimento/síntese não suportado'
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${voiceAvailable ? 'bg-purple-400' : 'bg-slate-500'}`}
          />
          {voiceAvailable ? 'VOZ DISPONÍVEL' : 'DADO INDISPONÍVEL'}
        </span>

        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
            agentsAvailable
              ? 'bg-blue-950/40 text-blue-300 border-blue-800/50'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}
          title={
            agentsAvailable ? 'Agentes do ecossistema NOX conectados' : 'Sem agentes cadastrados'
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${agentsAvailable ? 'bg-blue-400' : 'bg-slate-500'}`}
          />
          {agentsAvailable ? 'AGENTES DISPONÍVEIS' : 'DADO INDISPONÍVEL'}
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------
   2. PÍLULA DE ESTADO
------------------------------------------------------------- */
interface NeuralStatusPillProps {
  state: NeuralLinkState
  onInterrupt: () => void
  micBlocked?: boolean
  customStatusLabel?: string | null
  statusTone?: 'normal' | 'error' | 'warning'
}

export const NeuralStatusPill: React.FC<NeuralStatusPillProps> = ({
  state,
  onInterrupt,
  micBlocked,
  customStatusLabel,
  statusTone = 'normal',
}) => {
  const cfg = NEURAL_STATES[state]
  const color = NEURAL_ACCENT_COLORS[state]

  let labelText = cfg.label
  let activeColor = color

  if (micBlocked) {
    labelText = 'MICROFONE BLOQUEADO'
    activeColor = '#f43f5e'
  } else if (customStatusLabel) {
    labelText = customStatusLabel
    if (statusTone === 'error') {
      activeColor = '#f43f5e'
    } else if (statusTone === 'warning') {
      activeColor = '#f59e0b'
    }
  }

  return (
    <button
      onClick={() => {
        if (state === 'speaking') onInterrupt()
      }}
      className="group relative flex items-center gap-2.5 px-4 py-2 rounded-full border border-slate-700/80 bg-[#080e1c]/80 backdrop-blur-md shadow-lg shadow-black/40 transition-all hover:border-cyan-500/40"
      title={
        state === 'speaking'
          ? 'Clique para interromper a fala (barge-in)'
          : `Estado atual: ${labelText}`
      }
      aria-live="polite"
    >
      <span
        className="w-2.5 h-2.5 rounded-full transition-all duration-300 animate-pulse"
        style={{
          backgroundColor: activeColor,
          boxShadow: `0 0 8px ${activeColor}`,
        }}
      />
      <span className="font-mono text-[11px] tracking-widest text-slate-200 font-semibold uppercase">
        NOX · NEURAL LINK :: <b style={{ color: activeColor }}>{labelText}</b>
      </span>
    </button>
  )
}

/* -------------------------------------------------------------
   3. BOTÃO CIRCULAR DE VOZ (FAB)
------------------------------------------------------------- */
interface NeuralFabButtonProps {
  state: NeuralLinkState
  recActive: boolean
  onClick: () => void
  disabled?: boolean
  micBlocked?: boolean
}

export const NeuralFabButton: React.FC<NeuralFabButtonProps> = ({
  state,
  recActive,
  onClick,
  disabled = false,
  micBlocked = false,
}) => {
  const isSpeaking = state === 'speaking'
  const isThinking = state === 'thinking'
  const color = micBlocked ? '#f43f5e' : NEURAL_ACCENT_COLORS[state]

  return (
    <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isThinking}
        aria-label={
          isSpeaking
            ? 'Interromper fala da IA'
            : recActive
              ? 'Interromper escuta do microfone'
              : micBlocked
                ? 'Microfone bloqueado, clique para tentar novamente'
                : 'Ativar microfone para falar'
        }
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#020408] ${
          isSpeaking
            ? 'bg-purple-950/80 border-2 border-purple-400 text-purple-300 hover:scale-105 active:scale-95 shadow-purple-950/60'
            : micBlocked
              ? 'bg-rose-950/80 border-2 border-rose-500 text-rose-300 hover:scale-105 active:scale-95 shadow-rose-950/60'
              : recActive
                ? 'bg-emerald-950/80 border-2 border-emerald-400 text-emerald-300 hover:scale-105 active:scale-95 shadow-emerald-950/60'
                : 'bg-[#080e1c]/90 border-2 border-cyan-500/60 text-cyan-400 hover:border-cyan-400 hover:scale-105 active:scale-95 shadow-cyan-950/60'
        }`}
      >
        {/* Anel pulsante decorativo */}
        {(recActive || isSpeaking) && (
          <span
            className="absolute -inset-2 rounded-full border border-dashed opacity-60 animate-ping pointer-events-none"
            style={{ borderColor: color }}
          />
        )}

        {isSpeaking ? (
          <Square className="w-6 h-6 fill-current" />
        ) : isThinking ? (
          <Activity className="w-6 h-6 animate-spin" />
        ) : (
          <Mic className={`w-6 h-6 ${recActive ? 'animate-bounce' : ''}`} />
        )}
      </button>

      <span className="font-mono text-[9px] tracking-widest text-slate-400 uppercase select-none">
        {isSpeaking
          ? 'interromper'
          : micBlocked
            ? 'bloqueado'
            : recActive
              ? 'ouvindo...'
              : isThinking
                ? 'processando'
                : 'falar'}
      </span>
    </div>
  )
}

/* -------------------------------------------------------------
   4. PAINEL LATERAL INTERNO: HISTÓRICO DE CONVERSA
------------------------------------------------------------- */
interface NeuralHistoryPanelProps {
  open: boolean
  onClose: () => void
  messages: NeuralMessageItem[]
  onSendMessage: (text: string) => void
  onClearHistory: () => void
  isSending: boolean
}

export const NeuralHistoryPanel: React.FC<NeuralHistoryPanelProps> = ({
  open,
  onClose,
  messages,
  onSendMessage,
  onClearHistory,
  isSending,
}) => {
  const [inputText, setInputText] = React.useState('')
  const logRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [messages])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return
    onSendMessage(inputText.trim())
    setInputText('')
  }

  return (
    <div
      className="absolute top-4 left-4 z-20 w-80 sm:w-96 max-w-[calc(100%-2rem)] h-[calc(100%-2rem)] max-h-[560px] flex flex-col rounded-2xl bg-[#070c18]/95 border border-slate-800 shadow-2xl backdrop-blur-xl pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      role="region"
      aria-label="Registros de Conversa"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-[#050811]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h2 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-widest">
            Registros de Sessão
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Limpar registros desta sessão"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar registros"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={logRef} className="flex-1 p-3 overflow-y-auto space-y-3 font-sans text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6 space-y-2">
            <Cpu className="w-8 h-8 text-slate-600 mb-1" />
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-300">
              Nenhum registro ainda
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Fale através do microfone ou digite abaixo para iniciar o enlace neural.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'ml-6 bg-cyan-950/20 border-cyan-800/40 text-slate-200'
                  : 'mr-6 bg-purple-950/20 border-purple-800/40 text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider mb-1 opacity-80">
                <span
                  className={
                    m.role === 'user' ? 'text-cyan-400 font-bold' : 'text-purple-400 font-bold'
                  }
                >
                  {m.role === 'user' ? 'Você' : m.agent || 'NOX Central'}
                </span>
                <span className="text-slate-400">{m.timestamp}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Entrada manual de texto */}
      <form
        onSubmit={handleSubmit}
        className="p-2 border-t border-slate-800/80 bg-[#050811] flex gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Digite sua mensagem ao enlace..."
          disabled={isSending}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!inputText.trim() || isSending}
          className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold h-8 px-3"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  )
}

/* -------------------------------------------------------------
   5. PAINEL LATERAL INTERNO: CONFIGURAÇÕES DO NÚCLEO
------------------------------------------------------------- */
interface NeuralConfigPanelProps {
  open: boolean
  onClose: () => void
  preferences: NeuralPreferences
  onUpdatePreferences: (prefs: Partial<NeuralPreferences>) => void
  voices: SpeechSynthesisVoice[]
  onTestVoice: () => void
}

export const NeuralConfigPanel: React.FC<NeuralConfigPanelProps> = ({
  open,
  onClose,
  preferences,
  onUpdatePreferences,
  voices,
  onTestVoice,
}) => {
  const [showKey, setShowKey] = React.useState(false)

  if (!open) return null

  const ptVoices = voices.filter((v) => /^pt/i.test(v.lang))
  const displayVoices = ptVoices.length > 0 ? ptVoices : voices

  return (
    <div
      className="absolute top-4 right-4 z-20 w-80 sm:w-96 max-w-[calc(100%-2rem)] h-[calc(100%-2rem)] max-h-[580px] flex flex-col rounded-2xl bg-[#070c18]/95 border border-slate-800 shadow-2xl backdrop-blur-xl pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      role="dialog"
      aria-label="Configurações do Núcleo"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-[#050811]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-widest">
            Parâmetros do Núcleo
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar configurações"
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs font-sans">
        {/* Voz de síntese */}
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            Voz de Síntese (TTS)
          </label>
          <select
            value={preferences.voiceURI}
            onChange={(e) => onUpdatePreferences({ voiceURI: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Padrão do Sistema (pt-BR)</option>
            {displayVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        {/* Velocidade da fala */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Velocidade da Fala
            </label>
            <span className="font-mono text-[10px] text-cyan-400">
              {preferences.rate.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.7"
            max="1.4"
            step="0.05"
            value={preferences.rate}
            onChange={(e) => onUpdatePreferences({ rate: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>

        {/* Tom da fala */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Tom da Fala (Pitch)
            </label>
            <span className="font-mono text-[10px] text-cyan-400">
              {preferences.pitch.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.6"
            max="1.4"
            step="0.05"
            value={preferences.pitch}
            onChange={(e) => onUpdatePreferences({ pitch: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>

        {/* Modo Sentinela (Wake Word) */}
        <div className="flex items-center justify-between py-2 border-t border-b border-slate-800/80">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-200">
              Modo Sentinela (Wake Word)
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Acionamento contínuo por &quot;assistente&quot; ou &quot;nox&quot;
            </div>
          </div>
          <input
            type="checkbox"
            checked={preferences.wakeWordEnabled}
            onChange={(e) => onUpdatePreferences({ wakeWordEnabled: e.target.checked })}
            className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
          />
        </div>

        {/* Configuração de Segurança / Provedor */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                Modo de Desenvolvimento
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400">Opcional</span>
          </div>

          <p className="text-[10px] text-slate-400 leading-normal">
            Em produção, o NOX NEURAL LINK utiliza o proxy seguro do backend Skip Cloud. Você pode
            inserir uma chave local Gemini para testes offline ou desenvolvimento isolado:
          </p>

          <div className="flex gap-1.5">
            <input
              type={showKey ? 'text' : 'password'}
              value={preferences.devApiKey}
              onChange={(e) => onUpdatePreferences({ devApiKey: e.target.value.trim() })}
              placeholder="AIzaSy..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowKey(!showKey)}
              className="border-slate-800 text-slate-400 px-2"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </Button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="text-[10px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.useDevKey}
                onChange={(e) => onUpdatePreferences({ useDevKey: e.target.checked })}
                className="w-3.5 h-3.5 rounded accent-amber-500"
              />
              Priorizar chave local (Modo Dev)
            </label>
            <span
              className={`text-[9px] font-mono ${
                preferences.devApiKey ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {preferences.devApiKey ? 'Chave salva no browser' : 'Sem chave dev'}
            </span>
          </div>
        </div>

        {/* Ações */}
        <div className="pt-3 border-t border-slate-800/80 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTestVoice}
            className="flex-1 border-slate-800 text-slate-200 hover:text-cyan-300 hover:border-cyan-500/50 text-[10px] font-mono uppercase"
          >
            <Volume2 className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            Testar Síntese
          </Button>
        </div>
      </div>
    </div>
  )
}
