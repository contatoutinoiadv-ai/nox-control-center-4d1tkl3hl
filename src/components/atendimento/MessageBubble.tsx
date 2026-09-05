import React from 'react'
import { ConversationMessage } from '@/types/atendimento'
import { AudioMessage } from './AudioMessage'
import { DocumentMessage } from './DocumentMessage'
import { cn } from '@/lib/utils'
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Lock,
  Sparkles,
  User,
  ShieldAlert,
} from 'lucide-react'

export interface MessageBubbleProps {
  message: ConversationMessage
  className?: string
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, className }) => {
  const isIncoming = message.direction === 'INCOMING'
  const isInternal = message.isInternalNote || message.type === 'INTERNAL_NOTE'
  const isSystem = message.type === 'SYSTEM'

  // Formatação de data/hora
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Ícone de status de entrega (para mensagens enviadas)
  const renderDeliveryStatus = () => {
    if (isIncoming || isInternal) return null

    const wrapIcon = (icon: React.ReactNode, title: string) => (
      <span title={title} className="inline-flex items-center">
        {icon}
      </span>
    )

    switch (message.deliveryStatus) {
      case 'PENDING':
        return wrapIcon(<Clock className="w-3 h-3 text-slate-500" />, 'Aguardando envio...')
      case 'SENT':
        return wrapIcon(<Check className="w-3 h-3 text-slate-400" />, 'Enviada (MOCK/DEMO)')
      case 'DELIVERED':
        return wrapIcon(<CheckCheck className="w-3 h-3 text-slate-400" />, 'Entregue (MOCK/DEMO)')
      case 'READ':
        return wrapIcon(<CheckCheck className="w-3 h-3 text-cyan-400" />, 'Lida (MOCK/DEMO)')
      case 'FAILED':
        return wrapIcon(<AlertCircle className="w-3 h-3 text-rose-400" />, 'Falha no envio')
      default:
        return null
    }
  }

  // Caso 1: Mensagem de Sistema / Evento do Fluxo
  if (isSystem) {
    return (
      <div className={cn('flex justify-center my-3 select-none', className)}>
        <div className="bg-[#0b1222]/80 border border-slate-800 text-slate-400 text-[11px] font-mono px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
          <span>{message.content}</span>
          <span className="text-slate-500 text-[10px]">&bull; {formatTime(message.createdAt)}</span>
        </div>
      </div>
    )
  }

  // Caso 2: NOTA INTERNA: PROTEÇÃO CRÍTICA (Fundo âmbar escuro + badge textual indelével)
  if (isInternal) {
    return (
      <div className={cn('flex justify-center my-3 w-full px-2', className)}>
        <div className="w-full max-w-xl rounded-xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/40 via-[#1a1206] to-amber-950/20 p-3.5 shadow-lg shadow-black/60 relative overflow-hidden">
          {/* Faixa / Selo Obrigatório de Nota Interna */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-600/30">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded bg-amber-500/20 text-amber-300">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-amber-300">
                NOTA INTERNA: NÃO SERÁ ENVIADA AO CLIENTE
              </span>
            </div>
            <div className="text-[10px] font-mono text-amber-400/80">
              Registrado por: {message.senderName}
            </div>
          </div>

          {/* Conteúdo textual puro da nota */}
          <div className="text-xs font-sans text-amber-100/90 whitespace-pre-wrap leading-relaxed select-text">
            {message.content}
          </div>

          {/* Menções e timestamp */}
          <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-amber-600/20 text-[10px] font-mono text-amber-400/70">
            <div>
              {message.mentions && message.mentions.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-700/50 text-amber-200">
                  <span>Menciona:</span>
                  <strong>@{message.mentions.join(', @')}</strong>
                </span>
              )}
            </div>
            <span>{formatTime(message.createdAt)}</span>
          </div>
        </div>
      </div>
    )
  }

  // Caso 3: Mensagem de Chat (Recebida vs Enviada)
  return (
    <div
      className={cn('flex w-full my-1.5', isIncoming ? 'justify-start' : 'justify-end', className)}
    >
      <div
        className={cn(
          'max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-md relative group select-text',
          isIncoming
            ? 'bg-[#0a1122] border border-slate-700/70 text-slate-100 rounded-tl-sm'
            : 'bg-[#0c2438] border border-cyan-800/60 text-slate-100 rounded-tr-sm',
        )}
      >
        {/* Cabeçalho da Bolha com Nome do Remetente */}
        <div className="flex items-center justify-between gap-2 mb-1 select-none">
          <span
            className={cn(
              'text-[10px] font-mono font-bold truncate',
              isIncoming ? 'text-slate-400' : 'text-cyan-300',
            )}
          >
            {isIncoming ? message.senderName : 'Você (Advogado)'}
          </span>
          {message.isMockDemo && (
            <span
              className="text-[8px] font-mono px-1 py-0 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60"
              title="Dado demonstrativo isolado: nenhum envio real pelo WhatsApp nesta fase"
            >
              MOCK/DEMO
            </span>
          )}
        </div>

        {/* Renderização conforme tipo de mídia */}
        {message.type === 'AUDIO' && message.attachment ? (
          <AudioMessage attachment={message.attachment} isIncoming={isIncoming} />
        ) : (message.type === 'DOCUMENT' || message.type === 'IMAGE') && message.attachment ? (
          <DocumentMessage attachment={message.attachment} isIncoming={isIncoming} />
        ) : (
          /* Texto puro: sem dangerouslySetInnerHTML, blindado contra injeções */
          <div className="text-xs font-sans whitespace-pre-wrap leading-relaxed text-slate-100 select-text">
            {message.content}
          </div>
        )}

        {/* Rodapé com Horário e Status de Entrega */}
        <div className="flex items-center justify-end gap-1.5 mt-1 select-none text-[10px] font-mono text-slate-400">
          <span>{formatTime(message.createdAt)}</span>
          {renderDeliveryStatus()}
        </div>
      </div>
    </div>
  )
}
