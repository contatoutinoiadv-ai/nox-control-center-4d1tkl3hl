import React, { useState } from 'react'
import { MessageMediaAttachment } from '@/types/atendimento'
import { Play, Pause, Volume2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AudioMessageProps {
  attachment: MessageMediaAttachment
  isIncoming: boolean
  className?: string
}

export const AudioMessage: React.FC<AudioMessageProps> = ({
  attachment,
  isIncoming,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showTranscription, setShowTranscription] = useState(Boolean(attachment.transcriptionNox))

  const durationSec = attachment.durationSeconds || 30
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <div className={cn('space-y-2 w-full max-w-sm', className)}>
      {/* Barra de Reprodução */}
      <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#050914]/80 border border-slate-800">
        <button
          onClick={togglePlay}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0',
            isPlaying
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
              : 'bg-slate-800 text-cyan-400 hover:bg-slate-700',
          )}
          title={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Forma de onda sintética */}
        <div className="flex-1 flex items-center gap-0.5 h-6 px-1">
          {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 95, 30, 60, 85, 40, 70, 55, 35].map(
            (val, idx) => (
              <span
                key={idx}
                style={{ height: `${val}%` }}
                className={cn(
                  'w-1 rounded-full transition-colors',
                  isPlaying && idx < 9 ? 'bg-cyan-400' : 'bg-slate-700/80 group-hover:bg-slate-600',
                )}
              />
            ),
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0">
          <Volume2 className="w-3 h-3 text-slate-500" />
          <span>{formatDuration(durationSec)}</span>
        </div>
      </div>

      {/* Área Reservada: TRANSCRIÇÃO NOX (somente demonstrativa / placeholder no Lote 1) */}
      <div className="rounded-lg border border-purple-900/40 bg-purple-950/20 p-2.5 text-xs">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={() => setShowTranscription(!showTranscription)}
        >
          <div className="flex items-center gap-1.5 text-purple-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Transcrição NOX (Demonstrativo)</span>
          </div>
          <button className="text-purple-400 hover:text-purple-200">
            {showTranscription ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {showTranscription && (
          <div className="mt-2 pt-2 border-t border-purple-800/30 text-purple-200/90 font-sans text-xs leading-relaxed italic">
            {attachment.transcriptionNox ||
              'Transcrição automática do áudio reservada para a esteira com Oráculo IA NOX. Áudio íntegro em custódia.'}
          </div>
        )}
      </div>
    </div>
  )
}
