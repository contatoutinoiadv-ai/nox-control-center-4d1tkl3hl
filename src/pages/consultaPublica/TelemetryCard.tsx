import React from 'react'
import { useCountUp, useTilt } from './visualKit'

/* ============================================================
   Cartão de telemetria da Consulta Pública: contagem animada,
   mini gráfico de barras em cascata, tilt 3D leve e clique para
   filtrar a lista por tipo (estado ativo destacado).
   ============================================================ */

export interface TelemetryCardProps {
  label: string
  value: number
  color: string
  accent: string
  active: boolean
  isCritical?: boolean
  animateKey: number
  reducedMotion: boolean
  onClick: () => void
}

const BAR_HEIGHTS = [42, 68, 54, 88, 100, 76]

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  label,
  value,
  color,
  accent,
  active,
  isCritical,
  animateKey,
  reducedMotion,
  onClick,
}) => {
  const tiltRef = useTilt(4)
  const displayed = useCountUp(value, 900, true)

  return (
    <div
      ref={tiltRef}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      className={`nox-metric-card ${active ? 'nox-metric-active' : ''} ${
        isCritical && value > 0 ? 'nox-metric-aura' : ''
      }`}
    >
      <span className="nox-metric-glow" />
      <span className="nox-corner nox-corner-tl" style={{ borderColor: accent }} />
      <span className="nox-corner nox-corner-br" style={{ borderColor: accent }} />

      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div
        className="mt-1 text-3xl font-black font-mono tabular-nums leading-none"
        style={{ color, textShadow: `0 0 18px ${accent}55` }}
      >
        {displayed}
      </div>

      <div className="flex items-end gap-1 h-4 mt-2.5" aria-hidden>
        {BAR_HEIGHTS.map((h, i) => (
          <span
            key={`${animateKey}-${i}`}
            className="nox-metric-bar"
            style={{
              height: `${h}%`,
              background: accent,
              opacity: active ? 0.95 : 0.45,
              animationDelay: reducedMotion ? undefined : `${i * 45}ms`,
              animationDuration: reducedMotion ? undefined : '420ms',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default TelemetryCard
