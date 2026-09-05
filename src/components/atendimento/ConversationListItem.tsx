import React from 'react'
import { ConversationSummary } from '@/types/atendimento'
import { ConversationStatusBadge } from './ConversationStatusBadge'
import { ConversationPriorityBadge } from './ConversationPriorityBadge'
import { cn } from '@/lib/utils'
import { Clock, Paperclip, Mic, User } from 'lucide-react'

export interface ConversationListItemProps {
  conversation: ConversationSummary
  isSelected: boolean
  onSelect: (conv: ConversationSummary) => void
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isSelected,
  onSelect,
}) => {
  const { participant, lastMessage, unreadCount, status, priority, responsible } = conversation

  // Iniciais do participante
  const initials = participant.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

  // Formatação amigável de horário
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()

      if (isToday) {
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    } catch {
      return ''
    }
  }

  // Ícone de tipo de última mensagem
  const renderMessageIcon = () => {
    if (lastMessage.type === 'AUDIO') {
      return <Mic className="w-3 h-3 text-cyan-400 shrink-0 inline mr-1" />
    }
    if (lastMessage.type === 'DOCUMENT' || lastMessage.type === 'IMAGE') {
      return <Paperclip className="w-3 h-3 text-cyan-400 shrink-0 inline mr-1" />
    }
    return null
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(conversation)
        }
      }}
      className={cn(
        'group p-3 border-b border-slate-800/80 transition-all cursor-pointer relative text-left select-none',
        isSelected
          ? 'bg-[#0d1629] border-l-2 border-l-cyan-400'
          : 'hover:bg-[#070e1c] focus:bg-[#070e1c] focus:outline-none focus:ring-1 focus:ring-cyan-500/30',
        unreadCount > 0 && !isSelected && 'bg-[#061022]/60',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar com status cliente/lead */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-xs border shadow-sm',
              participant.isClient
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                : 'bg-purple-950/80 text-purple-300 border-purple-700/60',
            )}
            title={participant.isClient ? 'Cliente cadastrado' : 'Lead (novo contato)'}
          >
            {initials || <User className="w-4 h-4" />}
          </div>
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan-400 text-slate-950 font-bold text-[10px] flex items-center justify-center font-mono shadow-md animate-pulse"
              aria-label={`${unreadCount} mensagens não lidas`}
            >
              {unreadCount}
            </span>
          )}
        </div>

        {/* Informações centrais */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                {participant.name}
              </span>
              <span
                className={cn(
                  'text-[9px] font-mono px-1 py-0 rounded border font-semibold shrink-0',
                  conversation.isClientLead === 'CLIENTE'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : 'bg-purple-950/60 text-purple-300 border-purple-800/60',
                )}
              >
                {conversation.isClientLead}
              </span>
            </div>

            <span className="text-[10px] font-mono text-slate-500 shrink-0 flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {formatTime(lastMessage.createdAt)}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 mb-1 truncate">
            {participant.phone}
          </div>

          {/* Prévia da última mensagem (texto puro: sem injeção) */}
          <p className="text-xs text-slate-400 truncate leading-relaxed">
            {renderMessageIcon()}
            {lastMessage.direction === 'OUTGOING' && (
              <span className="text-slate-500 font-medium">Você: </span>
            )}
            {lastMessage.content}
          </p>

          {/* Rodapé do card com badges de status e prioridade */}
          <div className="flex items-center justify-between gap-1 mt-2 pt-1 border-t border-slate-800/40">
            <div className="flex items-center gap-1 flex-wrap">
              <ConversationStatusBadge status={status} size="sm" showIcon={false} />
              <ConversationPriorityBadge priority={priority} size="sm" showIcon={false} />
            </div>

            <div
              className="text-[10px] font-mono text-slate-400 truncate max-w-[110px]"
              title={`Responsável: ${responsible}`}
            >
              {responsible.split(' ')[0]}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
