import React, { useEffect, useRef } from 'react'
import { NeuralLinkState, NEURAL_ACCENT_COLORS } from './neuralTypes'

interface NeuralOscilloscopeProps {
  state: NeuralLinkState
  micActive: boolean
  timeDataRef: React.MutableRefObject<Uint8Array | null>
  speakPulseRef: React.MutableRefObject<number>
  className?: string
}

export const NeuralOscilloscope: React.FC<NeuralOscilloscopeProps> = ({
  state,
  micActive,
  timeDataRef,
  speakPulseRef,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number | null = null
    let isDisposed = false
    let startTime = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
    }
    resize()

    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas)

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

    const render = (now: number) => {
      if (isDisposed) return
      animId = requestAnimationFrame(render)

      const t = (now - startTime) / 1000
      const w = canvas.width
      const h = canvas.height
      if (!w || !h) return

      ctx.clearRect(0, 0, w, h)
      const mid = h * 0.52
      const col = NEURAL_ACCENT_COLORS[state] || '#00e5ff'

      ctx.strokeStyle = col
      ctx.lineWidth = Math.max(1.4, h * 0.016)
      ctx.shadowColor = col
      ctx.shadowBlur = 14
      ctx.globalAlpha = 0.9
      ctx.beginPath()

      const N = 96
      const timeData = timeDataRef.current

      for (let i = 0; i <= N; i++) {
        const x = (i / N) * w
        let y = mid

        if (state === 'listening' && micActive && timeData && timeData.length > 0) {
          const idx = Math.min(timeData.length - 1, Math.floor((i / N) * (timeData.length - 1)))
          const v = (timeData[idx] - 128) / 128
          y = mid + v * h * 0.42
        } else if (state === 'speaking') {
          const env = clamp(speakPulseRef.current || 0, 0, 1)
          y = mid + Math.sin(i * 0.55 + t * 22) * Math.sin(i * 0.13 + t * 7) * env * h * 0.4
        } else if (state === 'thinking') {
          y = mid + Math.sin(i * 0.9 + t * 30) * h * 0.05 + Math.sin(i * 0.21 - t * 13) * h * 0.04
        } else {
          y = mid + Math.sin(i * 0.28 + t * 2.2) * h * 0.02
        }

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    animId = requestAnimationFrame(render)

    return () => {
      isDisposed = true
      if (animId !== null) cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [state, micActive])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none select-none ${className}`}
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)',
      }}
      aria-hidden="true"
    />
  )
}
