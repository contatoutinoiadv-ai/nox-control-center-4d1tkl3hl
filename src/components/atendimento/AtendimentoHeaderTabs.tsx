import React from 'react'
import { MessageSquare, Users, Calendar, CheckSquare, BarChart2 } from 'lucide-react'

export type AtendimentoModuleTab =
  | 'ATENDIMENTO'
  | 'MENSAGENS_INTERNAS'
  | 'AGENDAMENTOS'
  | 'TAREFAS'
  | 'RELATORIOS'

export interface AtendimentoHeaderTabsProps {
  activeTab: AtendimentoModuleTab
  onTabChange: (tab: AtendimentoModuleTab) => void
}

export const AtendimentoHeaderTabs: React.FC<AtendimentoHeaderTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="flex items-center gap-1 border-b border-slate-800 bg-[#050811] px-4 pt-1 shrink-0 overflow-x-auto">
      <button
        onClick={() => onTabChange('ATENDIMENTO')}
        className={`px-3 py-2 text-xs font-mono flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'ATENDIMENTO'
            ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
            : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
        <span>CENTRAL WHATSAPP / CLIENTES</span>
      </button>

      <button
        onClick={() => onTabChange('MENSAGENS_INTERNAS')}
        className={`px-3 py-2 text-xs font-mono flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'MENSAGENS_INTERNAS'
            ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
            : 'border-transparent text-slate-500 hover:text-slate-300'
        }`}
      >
        <Users className="w-3.5 h-3.5" />
        <span>MENSAGENS INTERNAS</span>
        <span className="text-[9px] font-mono px-1 py-0 rounded bg-slate-800 text-slate-400">
          EM BREVE
        </span>
      </button>

      <button
        onClick={() => onTabChange('AGENDAMENTOS')}
        className={`px-3 py-2 text-xs font-mono flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'AGENDAMENTOS'
            ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
            : 'border-transparent text-slate-500 hover:text-slate-300'
        }`}
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>AGENDAMENTOS VINCULADOS</span>
      </button>

      <button
        onClick={() => onTabChange('TAREFAS')}
        className={`px-3 py-2 text-xs font-mono flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'TAREFAS'
            ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
            : 'border-transparent text-slate-500 hover:text-slate-300'
        }`}
      >
        <CheckSquare className="w-3.5 h-3.5" />
        <span>TAREFAS GERADAS</span>
      </button>

      <button
        onClick={() => onTabChange('RELATORIOS')}
        className={`px-3 py-2 text-xs font-mono flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
          activeTab === 'RELATORIOS'
            ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
            : 'border-transparent text-slate-500 hover:text-slate-300'
        }`}
      >
        <BarChart2 className="w-3.5 h-3.5" />
        <span>RELATÓRIOS & SLA</span>
        <span className="text-[9px] font-mono px-1 py-0 rounded bg-slate-800 text-slate-400">
          FASE 6
        </span>
      </button>
    </div>
  )
}
