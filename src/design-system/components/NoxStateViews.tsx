import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, FileQuestion, RefreshCw, LucideIcon } from 'lucide-react'
import { NoxButton } from './NoxButton'

export interface NoxStateViewProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'empty' | 'error' | 'loading'
  className?: string
}

export const NoxEmptyState: React.FC<NoxStateViewProps> = ({
  icon: Icon = FileQuestion,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-800 bg-[#060a14]/60',
        className,
      )}
    >
      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <div className="mt-4">
          <NoxButton variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </NoxButton>
        </div>
      )}
    </div>
  )
}

export const NoxErrorState: React.FC<NoxStateViewProps> = ({
  icon: Icon = AlertCircle,
  title,
  description,
  actionLabel = 'Tentar novamente',
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-rose-900/40 bg-rose-950/20',
        className,
      )}
    >
      <div className="w-10 h-10 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 mb-3 shadow-md shadow-rose-950">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-rose-200">{title}</h3>
      {description && (
        <p className="text-xs text-rose-300/80 max-w-sm mt-1 leading-relaxed font-sans">
          {description}
        </p>
      )}
      {onAction && (
        <div className="mt-4">
          <NoxButton variant="danger" size="sm" icon={RefreshCw} onClick={onAction}>
            {actionLabel}
          </NoxButton>
        </div>
      )}
    </div>
  )
}
