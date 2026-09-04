/**
 * NOX CONTROL CENTER INTELLIGENCE PLATFORM — DESIGN TOKENS V2
 * Centralização canônica de tokens de cor, tipografia, espaçamento,
 * raios de curvatura, sombras, transições e z-index.
 *
 * Todas as variáveis CSS possuem prefixo canônico `--nox-` para evitar colisões.
 */

export const NOX_TOKENS = {
  colors: {
    // Backgrounds
    bgRoot: 'var(--nox-bg-root, #030712)',
    bgSurface: 'var(--nox-bg-surface, #070c18)',
    bgSurfaceElevated: 'var(--nox-bg-surface-elevated, #0d1527)',
    bgSurfaceHighlight: 'var(--nox-bg-surface-highlight, #121c33)',
    bgGlass: 'var(--nox-bg-glass, rgba(13, 21, 39, 0.72))',

    // Borders
    borderSubtle: 'var(--nox-border-subtle, rgba(148, 163, 184, 0.08))',
    borderDefault: 'var(--nox-border-default, rgba(148, 163, 184, 0.16))',
    borderStrong: 'var(--nox-border-strong, rgba(148, 163, 184, 0.28))',
    borderAccent: 'var(--nox-border-accent, rgba(6, 182, 212, 0.4))',

    // Text hierarchy
    textPrimary: 'var(--nox-text-primary, #f8fafc)',
    textSecondary: 'var(--nox-text-secondary, #cbd5e1)',
    textMuted: 'var(--nox-text-muted, #94a3b8)',
    textDisabled: 'var(--nox-text-disabled, #64748b)',

    // Accents & Semantics
    accent: 'var(--nox-accent, #06b6d4)', // Electric Cyan
    accentGlow: 'var(--nox-accent-glow, rgba(6, 182, 212, 0.25))',
    accentAurora: 'var(--nox-accent-aurora, #8b5cf6)', // Aurora Violet

    success: 'var(--nox-success, #10b981)',
    successBg: 'var(--nox-success-bg, rgba(16, 185, 129, 0.12))',
    successBorder: 'var(--nox-success-border, rgba(16, 185, 129, 0.3))',

    warning: 'var(--nox-warning, #f59e0b)',
    warningBg: 'var(--nox-warning-bg, rgba(245, 158, 11, 0.12))',
    warningBorder: 'var(--nox-warning-border, rgba(245, 158, 11, 0.3))',

    danger: 'var(--nox-danger, #f43f5e)',
    dangerBg: 'var(--nox-danger-bg, rgba(244, 63, 94, 0.12))',
    dangerBorder: 'var(--nox-danger-border, rgba(244, 63, 94, 0.35))',

    info: 'var(--nox-info, #38bdf8)',
    infoBg: 'var(--nox-info-bg, rgba(56, 189, 248, 0.12))',
    infoBorder: 'var(--nox-info-border, rgba(56, 189, 248, 0.3))',

    aiNox: 'var(--nox-ai-accent, #a855f7)',
    aiNoxBg: 'var(--nox-ai-bg, rgba(168, 85, 247, 0.12))',
    aiNoxBorder: 'var(--nox-ai-border, rgba(168, 85, 247, 0.35))',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
  },
  typography: {
    fontSans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
  },
  shadows: {
    card: '0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    glowCyan: '0 0 25px -5px rgba(6, 182, 212, 0.3)',
    glowDanger: '0 0 25px -5px rgba(244, 63, 94, 0.35)',
    glowAi: '0 0 25px -5px rgba(168, 85, 247, 0.3)',
  },
} as const

export type NoxStatusType =
  | 'CRITICO'
  | 'ALTO'
  | 'MEDIO'
  | 'BAIXO'
  | 'CONCLUIDO'
  | 'PENDENTE'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO'
  | 'ERRO'
  | 'ONLINE'
  | 'OFFLINE'
  | 'SYNC'
  | 'RECONNECTING'

export interface NoxStatusDefinition {
  label: string
  colorClass: string
  borderClass: string
  bgClass: string
  dotClass: string
  iconType: 'alert' | 'check' | 'clock' | 'activity' | 'wifi' | 'info'
}

export const NOX_STATUS_CONFIG: Record<NoxStatusType, NoxStatusDefinition> = {
  CRITICO: {
    label: 'CRÍTICO',
    colorClass: 'text-rose-400',
    borderClass: 'border-rose-800/80',
    bgClass: 'bg-rose-950/60',
    dotClass: 'bg-rose-500 animate-pulse',
    iconType: 'alert',
  },
  ALTO: {
    label: 'ALTO',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-800/80',
    bgClass: 'bg-amber-950/60',
    dotClass: 'bg-amber-500',
    iconType: 'alert',
  },
  MEDIO: {
    label: 'MÉDIO',
    colorClass: 'text-yellow-400',
    borderClass: 'border-yellow-800/80',
    bgClass: 'bg-yellow-950/50',
    dotClass: 'bg-yellow-400',
    iconType: 'clock',
  },
  BAIXO: {
    label: 'BAIXO',
    colorClass: 'text-slate-300',
    borderClass: 'border-slate-700/80',
    bgClass: 'bg-slate-900/60',
    dotClass: 'bg-slate-400',
    iconType: 'info',
  },
  CONCLUIDO: {
    label: 'CONCLUÍDO',
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-800/80',
    bgClass: 'bg-emerald-950/60',
    dotClass: 'bg-emerald-400',
    iconType: 'check',
  },
  PENDENTE: {
    label: 'PENDENTE',
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-800/60',
    bgClass: 'bg-amber-950/40',
    dotClass: 'bg-amber-400',
    iconType: 'clock',
  },
  EM_ANDAMENTO: {
    label: 'EM ANDAMENTO',
    colorClass: 'text-cyan-300',
    borderClass: 'border-cyan-800/80',
    bgClass: 'bg-cyan-950/50',
    dotClass: 'bg-cyan-400 animate-pulse',
    iconType: 'activity',
  },
  AGUARDANDO: {
    label: 'AGUARDANDO',
    colorClass: 'text-indigo-300',
    borderClass: 'border-indigo-800/70',
    bgClass: 'bg-indigo-950/50',
    dotClass: 'bg-indigo-400',
    iconType: 'clock',
  },
  ERRO: {
    label: 'ERRO',
    colorClass: 'text-rose-400',
    borderClass: 'border-rose-800/90',
    bgClass: 'bg-rose-950/70',
    dotClass: 'bg-rose-500',
    iconType: 'alert',
  },
  ONLINE: {
    label: 'ONLINE',
    colorClass: 'text-emerald-300',
    borderClass: 'border-emerald-800/80',
    bgClass: 'bg-emerald-950/60',
    dotClass: 'bg-emerald-400',
    iconType: 'wifi',
  },
  OFFLINE: {
    label: 'OFFLINE',
    colorClass: 'text-slate-400',
    borderClass: 'border-slate-800',
    bgClass: 'bg-slate-900/60',
    dotClass: 'bg-slate-500',
    iconType: 'wifi',
  },
  SYNC: {
    label: 'SINCRONIZANDO',
    colorClass: 'text-cyan-300',
    borderClass: 'border-cyan-800/80',
    bgClass: 'bg-cyan-950/60',
    dotClass: 'bg-cyan-400 animate-spin',
    iconType: 'activity',
  },
  RECONNECTING: {
    label: 'RECONECTANDO',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-800/80',
    bgClass: 'bg-amber-950/60',
    dotClass: 'bg-amber-400 animate-pulse',
    iconType: 'activity',
  },
}
