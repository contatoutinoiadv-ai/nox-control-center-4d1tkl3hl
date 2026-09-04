import React from 'react'
import { ConversationPriority } from '@/types/atendimento'
import { cn } from '@/lib/utils'
import { Flame, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export interface ConversationPriorityBadgeProps {
  priority: ConversationPriority
  size?: 'sm' | 'md'
  className?: string
  showIcon?: boolean
}

const PRIORITY_CONFIG: Record<
  ConversationPriority,
  {
    label: string
    bg: string
    text: string
    border: string
    icon: React.FC<{ className?: string }>
    dot: string
  }
> = {
  CRITICA: {
    label: 'CRÍTICA',
    bg: 'bg-rose-950/90',
    text: 'text-rose-300',
    border: 'border-rose-600',
    icon: Flame,
    dot: 'bg-rose-500 animate-ping',
  },
  ALTA: {
    label: 'ALTA',
    bg: 'bg-amber-950/80',
    text: 'text-amber-300',
    border: 'border-amber-600/70',
    icon: AlertCircle,
    dot: 'bg-amber-500',
  },
  MEDIA: {
    label: 'MÉDIA',
    bg: 'bg-slate-800/80',
    text: 'text-cyan-300',
    border: 'border-slate-700',
    icon: ArrowUpRight,
    dot: 'bg-cyan-400',
  },
  BAIXA: {
    label: 'BAIXA',
    bg: 'bg-slate-900/60',
    text: 'text-slate-400',
    border: 'border-slate-800',
    icon: ArrowDownRight,
    dot: 'bg-slate-500',
  },
}

export const ConversationPriorityBadge: React.FC<ConversationPriorityBadgeProps> = ({
  priority,
  size = 'md',
  className,
  showIcon = true,
}) => {
  const conf = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MEDIA
  const Icon = conf.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-bold tracking-wider uppercase border rounded-md select-none shrink-0 shadow-sm',
        conf.bg,
        conf.text,
        conf.border,
        size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
        className,
      )}
      title={`Prioridade operacional: ${conf.label}`}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', conf.dot)} aria-hidden="true" />
      {showIcon && <Icon className={size === 'sm' ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'} />}
      <span>{conf.label}</span>
    </span>
  )
}
