import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export interface NoxCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'surface' | 'elevated' | 'glass' | 'accent' | 'danger'
  interactive?: boolean
  className?: string
}

export const NoxCard: React.FC<NoxCardProps> = ({
  children,
  variant = 'surface',
  interactive = false,
  className,
  ...props
}) => {
  const variantStyles = {
    surface: 'bg-[#070c18] border border-slate-800/80',
    elevated: 'bg-[#0d1527] border border-slate-700/80 shadow-md shadow-black/40',
    glass: 'nox-glass-card',
    accent: 'bg-gradient-to-br from-[#081528] to-[#040814] border border-cyan-500/30',
    danger: 'bg-gradient-to-br from-rose-950/20 to-slate-950 border border-rose-900/40',
  }

  return (
    <div
      className={cn(
        'rounded-xl p-4 transition-all duration-200',
        variantStyles[variant],
        interactive &&
          'hover:border-cyan-500/50 hover:shadow-cyan-950/30 hover:shadow-lg cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface NoxMetricCardProps {
  label: string
  value: string | number
  unit?: string
  variation?: {
    value: string | number
    direction: 'up' | 'down' | 'neutral'
    text?: string
  }
  icon?: LucideIcon
  statusVariant?: 'default' | 'cyan' | 'danger' | 'warning' | 'success'
  className?: string
  onClick?: () => void
}

export const NoxMetricCard: React.FC<NoxMetricCardProps> = ({
  label,
  value,
  unit,
  variation,
  icon: Icon,
  statusVariant = 'default',
  className,
  onClick,
}) => {
  const statusColors = {
    default: 'text-slate-100',
    cyan: 'text-cyan-400',
    danger: 'text-rose-400',
    warning: 'text-amber-400',
    success: 'text-emerald-400',
  }

  const iconBg = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    cyan: 'bg-cyan-950 text-cyan-400 border-cyan-800',
    danger: 'bg-rose-950 text-rose-400 border-rose-800',
    warning: 'bg-amber-950 text-amber-400 border-amber-800',
    success: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  }

  return (
    <NoxCard
      variant="surface"
      interactive={!!onClick}
      onClick={onClick}
      className={cn('relative overflow-hidden flex flex-col justify-between', className)}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold truncate">
          {label}
        </span>
        {Icon && (
          <div
            className={cn(
              'w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 shadow-sm',
              iconBg[statusVariant],
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span
          className={cn(
            'text-2xl font-bold font-mono tracking-tight tabular-nums',
            statusColors[statusVariant],
          )}
        >
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-400">{unit}</span>}
      </div>

      {variation && (
        <div className="flex items-center gap-1 mt-2 text-[11px] font-mono">
          {variation.direction === 'up' && (
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          )}
          {variation.direction === 'down' && (
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
          )}
          {variation.direction === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
          <span
            className={cn(
              'font-semibold',
              variation.direction === 'up'
                ? 'text-emerald-400'
                : variation.direction === 'down'
                  ? 'text-rose-400'
                  : 'text-slate-400',
            )}
          >
            {variation.value}
          </span>
          {variation.text && (
            <span className="text-slate-500 truncate ml-0.5">{variation.text}</span>
          )}
        </div>
      )}
    </NoxCard>
  )
}
