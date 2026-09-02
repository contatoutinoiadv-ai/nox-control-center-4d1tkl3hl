import React, { useMemo } from 'react'
import { NoxRecord } from '@/types/nox'
import { useNavigate } from 'react-router-dom'

interface MiniRadarProps {
  records: NoxRecord[]
  className?: string
}

export const MiniRadar: React.FC<MiniRadarProps> = ({ records, className = '' }) => {
  const navigate = useNavigate()

  // Position calculation based on severity (radius) and hash/recency (angle)
  const points = useMemo(() => {
    const center = 110
    const maxRadius = 90

    return records.slice(0, 35).map((r, i) => {
      let radiusRatio = 0.85 // info
      if (r.severity === 'critico') radiusRatio = 0.28
      else if (r.severity === 'alto') radiusRatio = 0.52
      else if (r.severity === 'medio') radiusRatio = 0.72

      // Deterministic angle based on index and code
      const hash = r.recordCode.split('').reduce((acc, c) => acc + c.charCodeAt(0), i * 17)
      const angle = (hash % 360) * (Math.PI / 180)
      const radius = radiusRatio * maxRadius

      const cx = center + radius * Math.cos(angle)
      const cy = center + radius * Math.sin(angle)

      return {
        id: r.id,
        code: r.recordCode,
        severity: r.severity,
        cx,
        cy,
        tribunal: r.tribunal,
      }
    })
  }, [records])

  return (
    <div
      onClick={() => navigate('/radar')}
      className={`relative cursor-pointer group flex flex-col items-center justify-center ${className}`}
      title="Clique para abrir o Radar de Alertas Completo"
    >
      <svg width="220" height="220" viewBox="0 0 220 220" className="overflow-visible">
        <defs>
          <radialGradient id="miniRadarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="miniSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Glow backdrop */}
        <circle cx="110" cy="110" r="100" fill="url(#miniRadarGlow)" />

        {/* Rings */}
        <circle
          cx="110"
          cy="110"
          r="90"
          fill="none"
          stroke="#1e293b"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle cx="110" cy="110" r="65" fill="none" stroke="#334155" strokeWidth="1" />
        <circle
          cx="110"
          cy="110"
          r="45"
          fill="none"
          stroke="#f59e0b"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        <circle
          cx="110"
          cy="110"
          r="25"
          fill="none"
          stroke="#ef4444"
          strokeOpacity="0.4"
          strokeWidth="1"
        />

        {/* Axis Crosshairs */}
        <line x1="110" y1="15" x2="110" y2="205" stroke="#1e293b" strokeWidth="1" />
        <line x1="15" y1="110" x2="205" y2="110" stroke="#1e293b" strokeWidth="1" />

        {/* Subtle sweeping sector */}
        <g className="animate-radar-sweep origin-center">
          <path
            d="M 110 110 L 110 20 A 90 90 0 0 1 190 70 Z"
            fill="url(#miniSweepGrad)"
            opacity="0.6"
          />
        </g>

        {/* Render Points */}
        {points.map((p) => {
          const color =
            p.severity === 'critico'
              ? '#ef4444'
              : p.severity === 'alto'
                ? '#f59e0b'
                : p.severity === 'medio'
                  ? '#eab308'
                  : '#06b6d4'

          return (
            <g key={p.id}>
              {p.severity === 'critico' && (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r="6"
                  fill={color}
                  opacity="0.3"
                  className="animate-ping"
                />
              )}
              <circle
                cx={p.cx}
                cy={p.cy}
                r={p.severity === 'critico' ? 4 : 3}
                fill={color}
                stroke="#030712"
                strokeWidth="1.5"
                className="group-hover:scale-125 transition-transform"
              />
            </g>
          )
        })}

        {/* Center core */}
        <circle cx="110" cy="110" r="3" fill="#06b6d4" />
      </svg>
      <div className="absolute bottom-1 text-[10px] font-mono text-cyan-400 font-semibold group-hover:text-cyan-300 transition-colors flex items-center gap-1">
        <span>Abrir Radar Interativo</span>
        <span>→</span>
      </div>
    </div>
  )
}
