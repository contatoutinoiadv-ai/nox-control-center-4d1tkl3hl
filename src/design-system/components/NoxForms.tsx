import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, Search, AlertCircle } from 'lucide-react'

export interface NoxInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: LucideIcon
  rightElement?: React.ReactNode
}

export const NoxInput = React.forwardRef<HTMLInputElement, NoxInputProps>(
  ({ label, error, hint, icon: Icon, rightElement, className, disabled, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[11px] font-mono uppercase font-semibold text-slate-300 flex items-center gap-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-9 bg-[#080e1b] border border-slate-700/80 rounded-lg text-xs font-sans text-slate-100 placeholder:text-slate-500 transition-all',
              'focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50',
              'disabled:opacity-50 disabled:bg-slate-900/40 disabled:cursor-not-allowed',
              Icon ? 'pl-9' : 'pl-3',
              rightElement ? 'pr-9' : 'pr-3',
              error && 'border-rose-500 focus:border-rose-400 focus:ring-rose-500/50',
              className,
            )}
            {...props}
          />
          {rightElement && <div className="absolute right-3 flex items-center">{rightElement}</div>}
        </div>
        {error && (
          <p className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {!error && hint && <p className="text-[10px] text-slate-500 font-mono">{hint}</p>}
      </div>
    )
  },
)

NoxInput.displayName = 'NoxInput'

export interface NoxSearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

export const NoxSearchInput = React.forwardRef<HTMLInputElement, NoxSearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <NoxInput
        ref={ref}
        type="search"
        icon={Search}
        placeholder="Pesquisar..."
        className={cn('bg-[#0b1222] border-slate-700/60', className)}
        {...props}
      />
    )
  },
)

NoxSearchInput.displayName = 'NoxSearchInput'

export interface NoxTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const NoxTextarea = React.forwardRef<HTMLTextAreaElement, NoxTextareaProps>(
  ({ label, error, hint, className, disabled, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[11px] font-mono uppercase font-semibold text-slate-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-full min-h-[80px] p-3 bg-[#080e1b] border border-slate-700/80 rounded-lg text-xs font-sans text-slate-100 placeholder:text-slate-500 transition-all',
            'focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50',
            'disabled:opacity-50 disabled:bg-slate-900/40 disabled:cursor-not-allowed',
            error && 'border-rose-500 focus:border-rose-400 focus:ring-rose-500/50',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {!error && hint && <p className="text-[10px] text-slate-500 font-mono">{hint}</p>}
      </div>
    )
  },
)

NoxTextarea.displayName = 'NoxTextarea'
