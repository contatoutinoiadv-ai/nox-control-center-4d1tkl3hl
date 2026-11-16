import React from 'react'

/* ============================================================
   Logomarca NOX PULSAR: monograma HU dentro do núcleo HUD
   da marca NOX, com anéis orbitais. Estados: ocioso (vigília
   lenta), varrendo (pulso acelerado em ciano) e concluído
   (brilho âmbar pleno). SVG inline, sem dependências.
   ============================================================ */

export type NoxPulsarState = 'idle' | 'scanning' | 'done' | 'failed'

export const NoxPulsarMark: React.FC<{
  state?: NoxPulsarState
  size?: number
  className?: string
}> = ({ state = 'idle', size = 52, className }) => {
  const scanning = state === 'scanning'
  const done = state === 'done'
  const failed = state === 'failed'
  const core = failed ? '#E11D48' : scanning ? '#22D3EE' : '#F5B301'
  const halo = failed
    ? 'rgba(225,29,72,0.5)'
    : scanning
      ? 'rgba(34,211,238,0.45)'
      : 'rgba(245,179,1,0.35)'

  return (
    <span
      className={`nox-mark ${scanning ? 'nox-mark-scanning' : ''} ${done ? 'nox-mark-done' : ''} ${
        failed ? 'nox-mark-failed' : ''
      } ${className || ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Logomarca NOX PULSAR"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden focusable="false">
        <defs>
          <linearGradient id="nox-mark-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={core} stopOpacity="0.22" />
            <stop offset="100%" stopColor="#0B1020" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* núcleo hexagonal HUD */}
        <polygon
          points="32,4 56,18 56,46 32,60 8,46 8,18"
          fill="url(#nox-mark-grad)"
          stroke={core}
          strokeWidth="1.6"
          opacity="0.9"
        />
        <polygon
          points="32,11 50,21.5 50,42.5 32,53 14,42.5 14,21.5"
          fill="none"
          stroke={core}
          strokeWidth="0.8"
          opacity="0.45"
          strokeDasharray="3 4"
        />

        {/* anel orbital de varredura */}
        <g className="nox-mark-orbit">
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="#22D3EE"
            strokeWidth="1"
            opacity="0.5"
            strokeDasharray="8 40"
            strokeLinecap="round"
          />
        </g>
        <g className="nox-mark-orbit-rev">
          <circle
            cx="32"
            cy="32"
            r="21"
            fill="none"
            stroke="#F5B301"
            strokeWidth="0.8"
            opacity="0.4"
            strokeDasharray="4 30"
            strokeLinecap="round"
          />
        </g>

        {/* monograma HU */}
        <g
          stroke={core}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          style={{ filter: `drop-shadow(0 0 3px ${halo})` }}
        >
          {/* H */}
          <path d="M19 22 V42" />
          <path d="M30 22 V42" />
          <path d="M19 32 H30" />
          {/* U */}
          <path d="M36 22 V36 Q36 42 41.5 42 Q47 42 47 36 V22" />
        </g>

        {/* pulso central */}
        <circle className="nox-mark-pulse" cx="32" cy="32" r="2.2" fill={core} />
      </svg>
    </span>
  )
}

export default NoxPulsarMark
