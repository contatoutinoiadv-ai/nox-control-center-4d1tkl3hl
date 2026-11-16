import React, { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './visualKit'

/* ============================================================
   Identidade NOX PULSAR (apenas a consulta pública)
   Malha de nós reativa ao cursor: os pontos se acendem e se
   deslocam levemente perto do mouse. Com prefers-reduced-motion
   o fundo fica estático (grade + vinheta, sem canvas).
   ============================================================ */

type Node = { x: number; y: number; vx: number; vy: number; r: number; c: string; a: number }

export const NoxPulsarBackdrop: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reduced) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let nodes: Node[] = []
    const mouse = { x: -9999, y: -9999 }
    const REACH = 150

    const colors = ['#22D3EE', '#F5B301', '#3B4C6B']

    const seed = () => {
      const n = Math.max(20, Math.floor((w * h) / 42000))
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.07,
        r: Math.random() * 1.5 + 0.7,
        c: colors[Math.floor(Math.random() * colors.length)],
        a: 0.18 + Math.random() * 0.2,
      }))
    }

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      const rect = canvas.getBoundingClientRect()
      const mx = mouse.x - rect.left
      const my = mouse.y - rect.top

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0) n.x = w
        if (n.x > w) n.x = 0
        if (n.y < 0) n.y = h
        if (n.y > h) n.y = 0

        const dx = n.x - mx
        const dy = n.y - my
        const dist = Math.hypot(dx, dy)
        let glow = 0
        if (dist < REACH) {
          glow = 1 - dist / REACH
          const push = glow * 5
          const inv = dist > 0.001 ? 1 / dist : 0
          n.x += dx * inv * push * 0.16
          n.y += dy * inv * push * 0.16
        }

        const alpha = Math.min(0.9, n.a + glow * 0.6)
        const radius = n.r + glow * 1.6
        ctx.globalAlpha = alpha
        ctx.fillStyle = glow > 0.05 ? (dx > 0 ? '#22D3EE' : '#F5B301') : n.c
        if (glow > 0.05) {
          ctx.shadowColor = ctx.fillStyle
          ctx.shadowBlur = 8 * glow
        }
        ctx.beginPath()
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div
      aria-hidden
      className={`fixed inset-0 pointer-events-none z-0 ${className || ''}`}
      style={{ background: 'linear-gradient(180deg, #05070D 0%, #0B1020 100%)' }}
    >
      <div className="absolute inset-0 nox-public-grid" />
      {!reduced && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
      <div className="absolute inset-0 nox-public-vignette" />
    </div>
  )
}

export default NoxPulsarBackdrop
