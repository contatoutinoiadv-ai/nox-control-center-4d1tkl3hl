import React from 'react'
import { MessageSquare, Clock, AlertTriangle, UserCheck } from 'lucide-react'

export interface AtendimentoMetricsProps {
  totalOpen: number
  unreadCount: number
  urgentCount: number
  waitingClientCount: number
  isMockDemo?: boolean
}

export const AtendimentoMetrics: React.FC<AtendimentoMetricsProps> = ({
  totalOpen,
  unreadCount,
  urgentCount,
  waitingClientCount,
  isMockDemo = true,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 py-2 bg-[#050811] border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
          <MessageSquare className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Abertos
          </div>
          <div className="text-sm font-bold font-mono text-slate-100 flex items-center gap-1.5">
            <span>{totalOpen}</span>
            {isMockDemo && (
              <span className="text-[9px] font-mono px-1 py-0 rounded bg-slate-800 text-slate-400">
                DEMO
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="p-1.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-400">
          <Clock className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Não Lidos
          </div>
          <div className="text-sm font-bold font-mono text-amber-300 flex items-center gap-1.5">
            <span>{unreadCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="p-1.5 rounded bg-red-950/60 border border-red-800/60 text-red-400">
          <AlertTriangle className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Urgentes
          </div>
          <div className="text-sm font-bold font-mono text-red-400 flex items-center gap-1.5">
            <span>{urgentCount}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
        <div className="p-1.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-400">
          <UserCheck className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Aguardando Cliente
          </div>
          <div className="text-sm font-bold font-mono text-blue-300 flex items-center gap-1.5">
            <span>{waitingClientCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
