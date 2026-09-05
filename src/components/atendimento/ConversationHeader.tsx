import React, { useState } from 'react'
import { ConversationSummary, ConversationStatus, ConversationPriority } from '@/types/atendimento'
import { ConversationStatusBadge } from './ConversationStatusBadge'
import { ConversationPriorityBadge } from './ConversationPriorityBadge'
import { NoxButton } from '@/design-system'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  Bot,
  Calendar,
  CheckSquare,
  Link as LinkIcon,
  MoreVertical,
  Phone,
  User,
  Shield,
  FileText,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'

export interface ConversationHeaderProps {
  conversation: ConversationSummary
  onBackMobile?: () => void
  onUpdateStatus: (status: ConversationStatus) => void
  onUpdatePriority: (priority: ConversationPriority) => void
  onTriggerAiTriage: () => void
  onSuggestResponse: () => void
  onOpenTransferModal?: () => void
  className?: string
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  conversation,
  onBackMobile,
  onUpdateStatus,
  onUpdatePriority,
  onTriggerAiTriage,
  onSuggestResponse,
  onOpenTransferModal,
  className,
}) => {
  const { participant, status, priority, responsible, linkedProcessNumber } = conversation
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false)
  const [moreActionsOpen, setMoreActionsOpen] = useState(false)

  const ALL_STATUSES: ConversationStatus[] = [
    'NOVA',
    'EM_TRIAGEM',
    'EM_ATENDIMENTO',
    'AGUARDANDO_CLIENTE',
    'AGUARDANDO_ESCRITORIO',
    'AGUARDANDO_DOCUMENTO',
    'CONCLUIDA',
    'ARQUIVADA',
  ]

  const ALL_PRIORITIES: ConversationPriority[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA']

  const handleActionPlaceholder = (actionName: string) => {
    toast.info(`${actionName} selecionado`, {
      description: 'Estrutura operacional registrada. Integração completa prevista no Lote 2.',
    })
    setMoreActionsOpen(false)
  }

  return (
    <div
      className={cn(
        'border-b border-slate-800/80 bg-[#070c18] px-4 py-3 select-none flex flex-col gap-2.5',
        className,
      )}
    >
      {/* Linha Superior: Dados do Participante + Ações Rápidas */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* Botão de Voltar para Mobile */}
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800/60"
              title="Voltar para a fila"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 rounded-full bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center font-mono font-bold text-xs text-cyan-300 shrink-0">
            {participant.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-100 truncate">{participant.name}</h1>
              <span
                className={cn(
                  'text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold shrink-0',
                  conversation.isClientLead === 'CLIENTE'
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                    : 'bg-purple-950/70 text-purple-300 border-purple-700/60',
                )}
              >
                {conversation.isClientLead}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono mt-0.5">
              <span className="flex items-center gap-1 text-slate-300">
                <Phone className="w-3 h-3 text-cyan-400" />
                {participant.phone}
              </span>
              <span>&bull;</span>
              <span className="truncate">
                Resp: <span className="text-slate-200">{responsible}</span>
              </span>
              {linkedProcessNumber && (
                <>
                  <span>&bull;</span>
                  <span
                    className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-1 truncate"
                    title={`Processo vinculado: ${linkedProcessNumber}`}
                    onClick={() => handleActionPlaceholder('Abrir Processo')}
                  >
                    <FileText className="w-3 h-3" />
                    {linkedProcessNumber}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status e Prioridade com Dropdowns de Troca Rápida */}
        <div className="flex items-center gap-2 relative">
          {/* Dropdown de Status */}
          <div className="relative">
            <button
              onClick={() => {
                setStatusMenuOpen(!statusMenuOpen)
                setPriorityMenuOpen(false)
                setMoreActionsOpen(false)
              }}
              className="flex items-center gap-1 focus:outline-none"
              title="Clique para alterar status"
            >
              <ConversationStatusBadge status={status} size="md" />
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {statusMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#09101f] border border-slate-700 rounded-lg shadow-xl shadow-black z-50 py-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold border-b border-slate-800">
                  Alterar Estado
                </div>
                {ALL_STATUSES.map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      onUpdateStatus(st)
                      setStatusMenuOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800/80 flex items-center justify-between',
                      st === status ? 'text-cyan-400 font-semibold' : 'text-slate-300',
                    )}
                  >
                    <ConversationStatusBadge status={st} size="sm" />
                    {st === status && <span className="text-[10px] font-mono">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown de Prioridade */}
          <div className="relative">
            <button
              onClick={() => {
                setPriorityMenuOpen(!priorityMenuOpen)
                setStatusMenuOpen(false)
                setMoreActionsOpen(false)
              }}
              className="flex items-center gap-1 focus:outline-none"
              title="Clique para alterar prioridade"
            >
              <ConversationPriorityBadge priority={priority} size="md" />
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {priorityMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#09101f] border border-slate-700 rounded-lg shadow-xl shadow-black z-50 py-1">
                <div className="px-3 py-1 text-[10px] font-mono uppercase text-slate-400 font-semibold border-b border-slate-800">
                  Definir Prioridade
                </div>
                {ALL_PRIORITIES.map((pr) => (
                  <button
                    key={pr}
                    onClick={() => {
                      onUpdatePriority(pr)
                      setPriorityMenuOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-slate-800/80 flex items-center justify-between',
                      pr === priority ? 'text-cyan-400 font-semibold' : 'text-slate-300',
                    )}
                  >
                    <ConversationPriorityBadge priority={pr} size="sm" />
                    {pr === priority && <span className="text-[10px] font-mono">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linha Inferior: Barra de Ações Rápidas Padronizadas */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/50 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Ações com IA NOX */}
          <NoxButton
            variant="secondary"
            size="sm"
            icon={Bot}
            onClick={onTriggerAiTriage}
            className="text-purple-300 border-purple-800/60 bg-purple-950/40 hover:bg-purple-900/50 text-[11px] h-7"
          >
            Triar com IA
          </NoxButton>

          <NoxButton
            variant="secondary"
            size="sm"
            icon={Sparkles}
            onClick={onSuggestResponse}
            className="text-cyan-300 border-cyan-800/60 bg-cyan-950/40 hover:bg-cyan-900/50 text-[11px] h-7"
          >
            Sugerir Resposta
          </NoxButton>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Ações Operacionais */}
          <NoxButton
            variant="ghost"
            size="sm"
            icon={CheckSquare}
            onClick={() => handleActionPlaceholder('Criar Tarefa Operacional')}
            className="text-slate-300 text-[11px] h-7 px-2"
          >
            Criar Tarefa
          </NoxButton>

          <NoxButton
            variant="ghost"
            size="sm"
            icon={Calendar}
            onClick={() => handleActionPlaceholder('Agendar Compromisso')}
            className="text-slate-300 text-[11px] h-7 px-2"
          >
            Agendar
          </NoxButton>

          <NoxButton
            variant="ghost"
            size="sm"
            icon={LinkIcon}
            onClick={() => handleActionPlaceholder('Vincular Processo CNJ')}
            className="text-slate-300 text-[11px] h-7 px-2"
          >
            Vincular Processo
          </NoxButton>
        </div>

        {/* Menu "Mais Ações" */}
        <div className="relative">
          <button
            onClick={() => {
              setMoreActionsOpen(!moreActionsOpen)
              setStatusMenuOpen(false)
              setPriorityMenuOpen(false)
            }}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Mais ações operacionais"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {moreActionsOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-[#09101f] border border-slate-700 rounded-lg shadow-xl shadow-black z-50 py-1 text-xs">
              <button
                onClick={() => {
                  setMoreActionsOpen(false)
                  if (onOpenTransferModal) {
                    onOpenTransferModal()
                  } else {
                    handleActionPlaceholder('Transferir Atendimento')
                  }
                }}
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 flex items-center gap-2"
              >
                <User className="w-3.5 h-3.5" />
                <span>Transferir Atendimento</span>
              </button>
              <button
                onClick={() => handleActionPlaceholder('Gerar Protocolo Seguro')}
                className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 flex items-center gap-2"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Gerar Protocolo Seguro</span>
              </button>
              <div className="my-1 border-t border-slate-800" />
              <button
                onClick={() => {
                  onUpdateStatus('ARQUIVADA')
                  setMoreActionsOpen(false)
                }}
                className="w-full text-left px-3 py-1.5 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400"
              >
                Arquivar Atendimento
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
