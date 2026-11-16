import React, { useEffect, useRef, useState } from 'react'

/* ============================================================
   Utilidades de apresentação da Consulta Pública DJEN
   (apenas esta página: relógio, contagem animada, tilt 3D,
   partículas de fundo e classes de painel HUD)
   ============================================================ */

export const useClock = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export const useCountUp = (target: number, duration = 900, enabled = true) => {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!enabled) return
    if (reduced) {
      setValue(target)
      return
    }
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, enabled, reduced])

  return enabled ? value : target
}

export const useTilt = (max = 4) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      el.style.transform = `perspective(600px) rotateX(${(0.5 - y) * (max * 2)}deg) rotateY(${(x - 0.5) * (max * 2)}deg)`
      el.style.setProperty('--glow-x', `${x * 100}%`)
      el.style.setProperty('--glow-y', `${y * 100}%`)
    }
    const onLeave = () => {
      el.style.transform = ''
      el.style.setProperty('--glow-x', '50%')
      el.style.setProperty('--glow-y', '50%')
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [max, reduced])

  return ref
}

export const AmbientBackdrop: React.FC = () => {
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
    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string }
    let dots: P[] = []

    const seed = () => {
      const colors = ['#22D3EE', '#F5B301', '#3B4C6B']
      const n = Math.max(18, Math.floor((w * h) / 60000))
      dots = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
        r: Math.random() * 1.4 + 0.6,
        c: colors[Math.floor(Math.random() * colors.length)],
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

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0) d.x = w
        if (d.x > w) d.x = 0
        if (d.y < 0) d.y = h
        if (d.y > h) d.y = 0
        ctx.globalAlpha = 0.25
        ctx.fillStyle = d.c
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none z-0 nox-public-bg"
      style={{ background: 'linear-gradient(180deg, #05070D 0%, #0B1020 100%)' }}
    >
      <div className="absolute inset-0 nox-public-grid" />
      {!reduced && <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />}
      <div className="absolute inset-0 nox-public-vignette" />
    </div>
  )
}
