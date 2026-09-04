import React, { useEffect, useRef } from 'react'
import { ConversationMessage } from '@/types/atendimento'
import { MessageBubble } from './MessageBubble'
import { NoxEmptyState } from '@/design-system'
import { MessageSquareDashed, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MessageTimelineProps {
  messages: ConversationMessage[]
  isLoading?: boolean
  className?: string
}

export const MessageTimeline: React.FC<MessageTimelineProps> = ({
  messages,
  isLoading = false,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Rolagem suave para o fim da timeline ao receber nova mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Agrupamento visual por data
  const formatDateHeader = (iso: string) => {
    try {
      const d = new Date(iso)
      const now = new Date()
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()

      if (isToday) return 'Hoje'
      return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      })
    } catch {
      return ''
    }
  }

  return (
    <div
      ref={scrollRef}
      className={cn('flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#040711] relative', className)}
    >
      {/* Banner de Proteção contra Execução e Injeção */}
      <div className="flex justify-center select-none mb-3">
        <div className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3 text-cyan-500" />
          <span>Custódia NOX: Todo conteúdo externo é tratado como texto puro</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-slate-500 font-mono text-xs">
          Carregando histórico do atendimento...
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <NoxEmptyState
            icon={MessageSquareDashed}
            title="Nenhuma mensagem nesta conversa"
            description="Inicie a conversa enviando uma mensagem ao cliente ou registrando uma nota interna de triagem."
          />
        </div>
      ) : (
        messages.map((msg, index) => {
          // Verifica se deve exibir separador de data
          const prevMsg = messages[index - 1]
          const showDateHeader =
            !prevMsg ||
            new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString()

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && (
                <div className="flex justify-center my-3 select-none">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400">
                    {formatDateHeader(msg.createdAt)}
                  </span>
                </div>
              )}
              <MessageBubble message={msg} />
            </React.Fragment>
          )
        })
      )}
    </div>
  )
}
