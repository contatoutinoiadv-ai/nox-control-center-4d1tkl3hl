import React, { useState } from 'react'
import { ConversationSummary } from '@/types/atendimento'
import { NoxClient } from '@/types/nox'
import { ProcessoMonitorado } from '@/services/datajudService'
import { NoxButton } from '@/design-system'
import {
  User,
  FolderGit2,
  Sparkles,
  History,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { IntelligenceClientTab } from './IntelligenceClientTab'
import { IntelligenceProcessesTab } from './IntelligenceProcessesTab'
import { IntelligenceAiTab } from './IntelligenceAiTab'
import { IntelligenceHistoryTab, HistoryEventItem } from './IntelligenceHistoryTab'

export type IntelligenceTab = 'CLIENTE' | 'PROCESSOS' | 'INTELIGENCIA' | 'HISTORICO'

export interface IntelligencePanelProps {
  conversation: ConversationSummary | null
  client: NoxClient | null
  processes: ProcessoMonitorado[]
  processCount: number
  activeTab?: IntelligenceTab
  onTabChange?: (tab: IntelligenceTab) => void
  onCloseDrawer?: () => void
  onNavigateToClient: (clientId: string) => void
  onCreateTask: () => void
  onScheduleAppointment: () => void
  onOpenLinkClientModal: () => void
  onOpenLinkProcessModal: () => void
  onOpenTransferModal: () => void
  onRequestDocument: () => void
  onApplySuggestedResponse: (response: string) => void
  onSelectRelatedProcess: (processNumber: string) => void
  onNavigateToProcessDetail?: (processNumber: string) => void
  customHistoryEvents?: HistoryEventItem[]
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  conversation,
  client,
  processes,
  processCount,
  activeTab: controlledActiveTab,
  onTabChange,
  onCloseDrawer,
  onNavigateToClient,
  onCreateTask,
  onScheduleAppointment,
  onOpenLinkClientModal,
  onOpenLinkProcessModal,
  onOpenTransferModal,
  onRequestDocument,
  onApplySuggestedResponse,
  onSelectRelatedProcess,
  onNavigateToProcessDetail,
  customHistoryEvents = [],
}) => {
  const [internalTab, setInternalTab] = useState<IntelligenceTab>('INTELIGENCIA')
  const activeTab = controlledActiveTab || internalTab

  const handleTabClick = (tab: IntelligenceTab) => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalTab(tab)
    }
  }

  if (!conversation) {
    return (
      <aside className="h-full flex flex-col bg-[#050811] border-l border-slate-800">
        <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase">
              Inteligência NOX
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs font-mono">
          <Sparkles className="w-8 h-8 text-slate-700 mb-2" />
          <span>Selecione uma conversa para visualizar os dados de inteligência e cliente.</span>
        </div>
      </aside>
    )
  }

  return (
    <aside className="h-full flex flex-col bg-[#050811] border-l border-slate-800 overflow-hidden">
      {/* Header do Painel */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#070c18]/90 backdrop-blur">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase truncate">
            Inteligência NOX
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 hidden sm:inline-block">
            V2
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onCloseDrawer && (
            <button
              onClick={onCloseDrawer}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navegação por 4 Tabs Operacionais */}
      <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/60 shrink-0 text-[11px] font-mono">
        <button
          onClick={() => handleTabClick('CLIENTE')}
          className={`py-2.5 px-2 text-center border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
            activeTab === 'CLIENTE'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>CLIENTE</span>
        </button>

        <button
          onClick={() => handleTabClick('PROCESSOS')}
          className={`py-2.5 px-2 text-center border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
            activeTab === 'PROCESSOS'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>PROCESSOS</span>
        </button>

        <button
          onClick={() => handleTabClick('INTELIGENCIA')}
          className={`py-2.5 px-2 text-center border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
            activeTab === 'INTELIGENCIA'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>INTELIGÊNCIA</span>
        </button>

        <button
          onClick={() => handleTabClick('HISTORICO')}
          className={`py-2.5 px-2 text-center border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
            activeTab === 'HISTORICO'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>HISTÓRICO</span>
        </button>
      </div>

      {/* Conteúdo Dinâmico da Tab com Scroll Vertical Independente */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'CLIENTE' && (
          <IntelligenceClientTab
            client={client}
            conversation={conversation}
            processCount={processCount}
            onNavigateToClient={onNavigateToClient}
            onCreateTask={onCreateTask}
            onScheduleAppointment={onScheduleAppointment}
            onOpenLinkClientModal={onOpenLinkClientModal}
          />
        )}

        {activeTab === 'PROCESSOS' && (
          <IntelligenceProcessesTab
            processes={processes}
            linkedProcessNumber={conversation.linkedProcessNumber}
            onSelectRelatedProcess={onSelectRelatedProcess}
            onOpenLinkModal={onOpenLinkProcessModal}
            onNavigateToProcessDetail={onNavigateToProcessDetail}
          />
        )}

        {activeTab === 'INTELIGENCIA' && (
          <IntelligenceAiTab
            conversation={conversation}
            onCreateTask={onCreateTask}
            onScheduleAppointment={onScheduleAppointment}
            onOpenLinkProcessModal={onOpenLinkProcessModal}
            onOpenTransferModal={onOpenTransferModal}
            onRequestDocument={onRequestDocument}
            onApplySuggestedResponse={onApplySuggestedResponse}
          />
        )}

        {activeTab === 'HISTORICO' && (
          <IntelligenceHistoryTab conversation={conversation} customEvents={customHistoryEvents} />
        )}
      </div>

      {/* Footer Fixo: Rastreabilidade NOX */}
      <div className="p-2.5 border-t border-slate-800 bg-[#070c18] text-[10px] font-mono text-slate-500 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1 text-cyan-400">
          <ShieldCheck className="w-3 h-3" />
          CUSTÓDIA ATIVA
        </span>
        <span>Sessão: {conversation.assignedTo || 'Não atribuído'}</span>
      </div>
    </aside>
  )
}
