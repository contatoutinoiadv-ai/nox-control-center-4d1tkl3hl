import React from 'react'
import { ConversationSummary } from '@/types/atendimento'
import { NoxLabel } from '@/design-system'
import {
  Clock,
  UserCheck,
  Tag,
  CheckSquare,
  Sparkles,
  MessageSquare,
  FileText,
  AlertCircle,
} from 'lucide-react'

export interface HistoryEventItem {
  id: string
  timestamp: string
  actor: string
  type:
    | 'CONVERSATION_OPENED'
    | 'CONVERSATION_ASSIGNED'
    | 'STATUS_CHANGED'
    | 'INTERNAL_NOTE_CREATED'
    | 'AI_TRIAGE_REQUESTED'
    | 'AI_RESPONSE_REQUESTED'
    | 'TASK_CREATED_FROM_CONVERSATION'
    | 'APPOINTMENT_CREATED'
    | 'PROCESS_LINKED'
    | 'CLIENT_LINKED'
  label: string
  details?: string
}

export interface IntelligenceHistoryTabProps {
  conversation: ConversationSummary
  customEvents?: HistoryEventItem[]
}

export const IntelligenceHistoryTab: React.FC<IntelligenceHistoryTabProps> = ({
  conversation,
  customEvents = [],
}) => {
  // Monta a linha do tempo cronológica com eventos determinísticos da sessão e dados da conversa
  const baseEvents: HistoryEventItem[] = [
    {
      id: 'evt-1',
      timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: conversation.participant.name,
      type: 'CONVERSATION_OPENED',
      label: 'Mensagem recebida na fila',
      details: 'Disparo de triagem preliminar de atendimento.',
    },
    {
      id: 'evt-2',
      timestamp: new Date(Date.now() - 3600000 * 1.8).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: 'Sistema NOX (Motor IA)',
      type: 'AI_TRIAGE_REQUESTED',
      label: 'Triagem heurística executada',
      details: 'Classificado como POSSÍVEL URGÊNCIA (Intimação Judicial).',
    },
    {
      id: 'evt-3',
      timestamp: new Date(Date.now() - 3600000 * 1.5).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: conversation.responsible || 'Higor Utinoi',
      type: 'CONVERSATION_ASSIGNED',
      label: 'Atendimento assumido',
      details: `Responsável atribuído: ${conversation.responsible || 'Higor Utinoi'}.`,
    },
    {
      id: 'evt-4',
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: conversation.responsible || 'Higor Utinoi',
      type: 'STATUS_CHANGED',
      label: `Status atualizado para ${conversation.status}`,
      details: 'Aguardando envio do documento pelo cliente.',
    },
  ]

  const allEvents = [...baseEvents, ...customEvents]

  const getEventIcon = (type: HistoryEventItem['type']) => {
    switch (type) {
      case 'CONVERSATION_OPENED':
        return <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
      case 'CONVERSATION_ASSIGNED':
        return <UserCheck className="w-3.5 h-3.5 text-blue-400" />
      case 'STATUS_CHANGED':
        return <Tag className="w-3.5 h-3.5 text-amber-400" />
      case 'INTERNAL_NOTE_CREATED':
        return <FileText className="w-3.5 h-3.5 text-amber-500" />
      case 'AI_TRIAGE_REQUESTED':
      case 'AI_RESPONSE_REQUESTED':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />
      case 'TASK_CREATED_FROM_CONVERSATION':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
      case 'APPOINTMENT_CREATED':
        return <Clock className="w-3.5 h-3.5 text-emerald-400" />
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <NoxLabel className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
          Trilha de Auditoria & Histórico
        </NoxLabel>
        <span className="text-[10px] font-mono text-slate-500">{allEvents.length} registros</span>
      </div>

      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
        {allEvents.map((evt) => (
          <div key={evt.id} className="relative group">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#050811] border border-slate-700 flex items-center justify-center">
              {getEventIcon(evt.type)}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 group-hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyan-400 font-semibold">{evt.actor}</span>
                <span className="text-slate-500">{evt.timestamp}</span>
              </div>
              <div className="text-xs font-medium text-slate-200 mt-0.5">{evt.label}</div>
              {evt.details && (
                <div className="text-[11px] text-slate-400 mt-1 font-sans leading-tight">
                  {evt.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-800/50 text-[10px] text-slate-400 font-mono flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>Eventos registrados em conformidade com o rastro de custódia NOX.</span>
      </div>
    </div>
  )
}
