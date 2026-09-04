import React from 'react'
import { ConversationStatus } from '@/types/atendimento'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  Search,
  MessageSquare,
  Clock,
  UserCheck,
  FileText,
  CheckCircle2,
  Archive,
} from 'lucide-react'

export interface ConversationStatusBadgeProps {
  status: ConversationStatus
  size?: 'sm' | 'md'
  className?: string
  showIcon?: boolean
}

const STATUS_CONFIG: Record<
  ConversationStatus,
  {
    label: string
    bg: string
    text: string
    border: string
    icon: React.FC<{ className?: string }>
  }
> = {
  NOVA: {
    label: 'NOVA',
    bg: 'bg-cyan-950/70',
    text: 'text-cyan-300',
    border: 'border-cyan-500/40',
    icon: Sparkles,
  },
  EM_TRIAGEM: {
    label: 'EM TRIAGEM',
    bg: 'bg-purple-950/70',
    text: 'text-purple-300',
    border: 'border-purple-500/40',
    icon: Search,
  },
  EM_ATENDIMENTO: {
    label: 'EM ATENDIMENTO',
    bg: 'bg-blue-950/70',
    text: 'text-blue-300',
    border: 'border-blue-500/40',
    icon: MessageSquare,
  },
  AGUARDANDO_CLIENTE: {
    label: 'AGUARDANDO CLIENTE',
    bg: 'bg-amber-950/70',
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    icon: Clock,
  },
  AGUARDANDO_ESCRITORIO: {
    label: 'AGUARDANDO ESCRITÓRIO',
    bg: 'bg-rose-950/70',
    text: 'text-rose-300',
    border: 'border-rose-500/40',
    icon: UserCheck,
  },
  AGUARDANDO_DOCUMENTO: {
    label: 'AGUARDANDO DOCUMENTO',
    bg: 'bg-indigo-950/70',
    text: 'text-indigo-300',
    border: 'border-indigo-500/40',
    icon: FileText,
  },
  CONCLUIDA: {
    label: 'CONCLUÍDA',
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-300',
    border: 'border-emerald-500/40',
    icon: CheckCircle2,
  },
  ARQUIVADA: {
    label: 'ARQUIVADA',
    bg: 'bg-slate-900/80',
    text: 'text-slate-400',
    border: 'border-slate-800',
    icon: Archive,
  },
}

export const ConversationStatusBadge: React.FC<ConversationStatusBadgeProps> = ({
  status,
  size = 'md',
  className,
  showIcon = true,
}) => {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.NOVA
  const Icon = conf.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono font-semibold tracking-wider uppercase border rounded select-none shrink-0',
        conf.bg,
        conf.text,
        conf.border,
        size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
        className,
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'} />}
      <span>{conf.label}</span>
    </span>
  )
}
