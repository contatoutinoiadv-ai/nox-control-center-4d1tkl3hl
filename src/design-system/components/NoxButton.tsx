import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, Loader2 } from 'lucide-react'

export interface NoxButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon' | 'command'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
  children?: React.ReactNode
}

export const NoxButton: React.FC<NoxButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  children,
  className,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-950/50 border border-cyan-400/40 active:scale-[0.98]',
    secondary:
      'bg-[#0d1527] hover:bg-[#121d33] text-slate-200 border border-slate-700/80 hover:border-slate-600 active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent',
    danger:
      'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 shadow-md shadow-rose-950/40 active:scale-[0.98]',
    icon: 'bg-[#0d1527] hover:bg-[#121d33] text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 p-0',
    command:
      'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border border-slate-700/80 hover:border-cyan-500/50 shadow-inner',
  }

  const sizeStyles = {
    sm: variant === 'icon' ? 'w-7 h-7' : 'h-7 px-2.5 text-xs gap-1.5',
    md: variant === 'icon' ? 'w-8 h-8' : 'h-8 px-3 text-xs gap-2',
    lg: variant === 'icon' ? 'w-10 h-10' : 'h-10 px-4 text-sm gap-2.5',
  }

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-mono font-medium rounded-lg transition-all select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      {children && <span className="truncate">{children}</span>}
      {!loading && Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5 shrink-0" />}
    </button>
  )
}
