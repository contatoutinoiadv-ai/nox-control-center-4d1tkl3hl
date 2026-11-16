import React, { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'

/* ============================================================
   Painel de Operação da Varredura (elemento central do redesenho)
   Radar circular + terminal de log com linhas amarradas a eventos
   reais do fetch (canal, resposta, parsing, classificação, fim).
   Nenhuma linha é criada com atraso artificial: cada etapa aparece
   no instante em que o código real a executa.
   ============================================================ */

export type ScanPhase =
  | 'idle'
  | 'channel'
  | 'anchor'
  | 'sweep'
  | 'response'
  | 'parsing'
  | 'classifying'
  | 'deadlines'
  | 'done'
  | 'failed'

export interface ScanLogLine {
  marker: 'OK' | 'RUN' | 'FAIL'
  text: string
  tone?: 'default' | 'cyan' | 'amber' | 'crimson' | 'green'
}

export interface ScanPanelProps {
  open: boolean
  phase: ScanPhase
  lines: ScanLogLine[]
  onRetry: () => void
  activeAnchor: string
}

const PHASE_PROGRESS: Record<ScanPhase, number> = {
  idle: 0,
  channel: 14,
  anchor: 28,
  sweep: 46,
  response: 62,
  parsing: 74,
  classifying: 86,
  deadlines: 94,
  done: 100,
  failed: 100,
}

export const ScanOperationPanel: React.FC<ScanPanelProps> = ({
  open,
  phase,
  lines,
  onRetry,
  activeAnchor,
}) => {
  const logRef = useRef<HTMLDivElement | null>(null)
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  if (!open) return null
  const failed = phase === 'failed'
  const done = phase === 'done'

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-[#070B14]/95 backdrop-blur-md transition-all duration-500 ${
        failed ? 'border-rose-800/70' : done ? 'border-amber-500/50' : 'border-cyan-700/50'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* cantoneiras */}
      <span className="nox-corner nox-corner-tl" />
      <span className="nox-corner nox-corner-tr" />
      <span className="nox-corner nox-corner-bl" />
      <span className="nox-corner nox-corner-br" />

      <div className="flex flex-col lg:flex-row items-center gap-5 p-5 lg:p-6">
        {/* Radar / feixe de varredura */}
        <div className="relative w-40 h-40 shrink-0 nox-radar" aria-hidden>
          <div className="nox-radar-ring nox-radar-ring-1" />
          <div className="nox-radar-ring nox-radar-ring-2" />
          <div className="nox-radar-ring nox-radar-ring-3" />
          <div className="nox-radar-cross" />
          <div className={`nox-radar-beam ${failed ? 'nox-radar-beam-fail' : ''}`} />
          <div
            className={`absolute inset-0 m-auto w-2.5 h-2.5 rounded-full ${
              failed ? 'bg-rose-500 nox-pulse-fail' : 'bg-[#F5B301] nox-pulse-core'
            }`}
          />
        </div>

        {/* Terminal de log */}
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
              {failed ? 'Operação interrompida' : done ? 'Operação concluída' : 'Operação em curso'}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                failed
                  ? 'border-rose-700 text-rose-300'
                  : done
                    ? 'border-amber-500/70 text-amber-300'
                    : 'border-cyan-700 text-cyan-300'
              }`}
            >
              {Math.round(PHASE_PROGRESS[phase])}%
            </span>
          </div>

          <div
            ref={logRef}
            className="h-40 sm:h-44 overflow-y-auto rounded-lg border border-slate-800/80 bg-[#04060C] p-3 font-mono text-[11px] leading-relaxed"
          >
            {lines.map((l, i) => (
              <div
                key={i}
                className={`nox-log-line ${
                  l.tone === 'cyan'
                    ? 'text-cyan-300'
                    : l.tone === 'amber'
                      ? 'text-amber-300'
                      : l.tone === 'green'
                        ? 'text-emerald-300'
                        : l.tone === 'crimson'
                          ? 'text-rose-300'
                          : 'text-slate-300'
                }`}
              >
                <span
                  className={
                    l.marker === 'OK'
                      ? 'text-emerald-400'
                      : l.marker === 'FAIL'
                        ? 'text-rose-400'
                        : 'text-slate-500'
                  }
                >
                  [ {l.marker === 'RUN' ? '...' : l.marker} ]
                </span>{' '}
                <span className="nox-log-text">{l.text}</span>
              </div>
            ))}
            {failed && (
              <div className="pt-2">
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-700 text-rose-200 hover:bg-rose-950/60 transition-colors text-[11px] font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Repetir varredura
                </button>
              </div>
            )}
          </div>

          {/* Barra de progresso fina, guiada pelas fases reais */}
          <div className="mt-3 h-1 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                failed ? 'bg-rose-500' : done ? 'bg-[#F5B301]' : 'bg-[#22D3EE]'
              }`}
              style={{ width: `${PHASE_PROGRESS[phase]}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] font-mono text-slate-500">
            Âncora ativa: {activeAnchor}
            {reduced ? ' · movimento reduzido' : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ScanOperationPanel
