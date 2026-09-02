import React, { useState } from 'react'
import {
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Users,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react'
import { dataStore } from '@/services/dataStore'
import { DeadlineCalculatorView } from '@/components/DeadlineCalculatorView'
import { AgendaView } from '@/components/AgendaView'
import { TasksView } from '@/components/TasksView'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export const CentralPrazosPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'prazos' | 'agenda' | 'tarefas' | 'calculadora'>(
    'prazos',
  )
  const [tasks] = useState(dataStore.getTasks())
  const [agenda] = useState(dataStore.getAgendaEvents())
  const [communications] = useState(dataStore.getCommunications())
  const [searchQuery, setSearchQuery] = useState('')

  // Filter deadlines
  const deadlinesList = communications
    .filter((c) => c.deadlineCalculated)
    .map((c) => ({
      commId: c.id,
      processo: c.numeroProcesso,
      tribunal: c.tribunal,
      memorial: c.deadlineCalculated!,
      responsavel: c.assignedTo || dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira',
      urgencia: c.urgencyLevel,
    }))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
              MOTOR DE VERDADE TEMPORAL
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <Clock className="w-6 h-6 text-cyan-400" />
            Central de Prazos, Agenda & Tarefas
          </h1>
          <p className="text-xs text-slate-400">
            Painel unificado com vencimentos fatais, prazos internos de garantia, compromissos e
            distribuição por advogado.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('prazos')}
            className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-all ${
              activeTab === 'prazos'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Prazos Fatais
          </button>
          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-all ${
              activeTab === 'agenda'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Agenda
          </button>
          <button
            onClick={() => setActiveTab('tarefas')}
            className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-all ${
              activeTab === 'tarefas'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tarefas
          </button>
          <button
            onClick={() => setActiveTab('calculadora')}
            className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-all ${
              activeTab === 'calculadora'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Calculadora & Simulador
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Vencendo Hoje</div>
          <div className="text-xl font-black text-rose-400 font-mono mt-1">
            {
              deadlinesList.filter(
                (d) => d.memorial.finalDeadlineDate === new Date().toISOString().split('T')[0],
              ).length
            }{' '}
            prazos
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Monitoramento diário</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Próximos 7 Dias</div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">
            {deadlinesList.length} prazos
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Calculados com CPC/CLT</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Tarefas Ativas</div>
          <div className="text-xl font-black text-cyan-400 font-mono mt-1">
            {tasks.length} ativas
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Sincronizadas</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Audiências & Reuniões
          </div>
          <div className="text-xl font-black text-purple-400 font-mono mt-1">
            {agenda.length} eventos
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Agenda sincronizada</div>
        </div>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'prazos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Filtrar por processo ou tribunal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border-slate-800 pl-8 h-8 text-xs text-slate-200"
              />
            </div>
            <div className="text-xs font-mono text-slate-400">
              Prazos protegidos com{' '}
              <span className="text-emerald-400">Memorial Explicável Auditável</span>
            </div>
          </div>

          <div className="space-y-3">
            {deadlinesList.length === 0 ? (
              <div className="p-10 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs space-y-2">
                <div className="font-bold text-slate-300">Nenhum prazo judicial ativo</div>
                <p className="text-slate-500">
                  Importe um arquivo CSV ou homologue publicações na Triagem para calcular memoriais
                  temporais.
                </p>
              </div>
            ) : (
              deadlinesList
                .filter(
                  (d) =>
                    !searchQuery ||
                    d.processo.includes(searchQuery) ||
                    d.tribunal.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((d, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3 nox-glass-card"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                            {d.tribunal}
                          </Badge>
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {d.processo}
                          </span>
                          <span className="text-xs text-slate-400">• {d.responsavel}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100">
                          {d.memorial.legalRuleName}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          {d.memorial.legalRuleArticle}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center min-w-[110px]">
                          <div className="text-[9px] font-mono uppercase text-slate-400">
                            Prazo Interno
                          </div>
                          <div className="text-xs font-bold text-amber-400 font-mono">
                            {d.memorial.internalDeadlineDate}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-center min-w-[120px]">
                          <div className="text-[9px] font-mono uppercase text-rose-300 font-semibold">
                            Vencimento Fatal
                          </div>
                          <div className="text-sm font-black text-rose-400 font-mono">
                            {d.memorial.finalDeadlineDate}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400">
                      <div>
                        Contagem:{' '}
                        <span className="text-slate-300">
                          {d.memorial.daysCount} dias {d.memorial.daysType}
                        </span>{' '}
                        (Início: {d.memorial.firstDayCounted})
                      </div>
                      <div className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Feriados & Suspensões Checados (100%)
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
      {activeTab === 'agenda' && <AgendaView />}
      {activeTab === 'tarefas' && <TasksView />}
      {activeTab === 'calculadora' && <DeadlineCalculatorView />}
    </div>
  )
}

export default CentralPrazosPage
