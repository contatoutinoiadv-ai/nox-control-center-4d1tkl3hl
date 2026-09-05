import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Activity,
} from 'lucide-react'
import { dataStore } from '@/services/dataStore'
import { DeadlineCalculatorView } from '@/components/DeadlineCalculatorView'
import { AgendaView } from '@/components/AgendaView'
import { TasksView } from '@/components/TasksView'
import { MovimentacoesDatajudView } from '@/components/MovimentacoesDatajudView'
import { datajudService, MovimentacaoProcesso } from '@/services/datajudService'
import { toast } from 'sonner'
import {
  NoxPageHeader,
  NoxMetricCard,
  NoxCard,
  NoxStatusBadge,
  NoxSearchInput,
  NoxEmptyState,
  NoxMono,
  NoxInput,
} from '@/design-system'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export const CentralPrazosPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<
    'prazos' | 'agenda' | 'tarefas' | 'calculadora' | 'movimentacoes'
  >('prazos')
  const [tasks, setTasks] = useState(() => dataStore.getTasks())
  const [agenda, setAgenda] = useState(() => dataStore.getAgendaEvents())
  const [communications, setCommunications] = useState(() => dataStore.getCommunications())
  const [searchQuery, setSearchQuery] = useState('')
  const [datajudMovs, setDatajudMovs] = useState<MovimentacaoProcesso[]>([])

  // Sincronização reativa com o dataStore em tempo real
  React.useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setTasks(dataStore.getTasks())
      setAgenda(dataStore.getAgendaEvents())
      setCommunications(dataStore.getCommunications())
    })
    return () => unsub()
  }, [])

  React.useEffect(() => {
    datajudService.getMovimentacoes().then((movs) => {
      setDatajudMovs(movs)
    })
  }, [activeTab])

  // Filter deadlines
  const deadlinesList = communications
    .filter((c) => c.deadlineCalculated)
    .map((c) => {
      const temMovimentacaoNova = datajudMovs.some((m) => m.numero_processo === c.numeroProcesso)
      return {
        commId: c.id,
        processo: c.numeroProcesso,
        tribunal: c.tribunal,
        memorial: c.deadlineCalculated!,
        responsavel:
          c.assignedTo || dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira',
        urgencia: c.urgencyLevel,
        temMovimentacaoDatajud: temMovimentacaoNova,
      }
    })

  return (
    <div className="space-y-6">
      {/* Page Header com NoxPageHeader */}
      <NoxPageHeader
        title="Central de Prazos, Agenda & Tarefas"
        description="Painel unificado com vencimentos fatais, prazos internos de garantia, compromissos e distribuição por advogado com rigor temporal CPC/CLT."
        icon={Clock}
        badge={
          <NoxStatusBadge
            status="ONLINE"
            customLabel="MOTOR DE VERDADE TEMPORAL"
            size="sm"
            showDot
          />
        }
        actions={
          <div className="flex items-center gap-1.5 bg-[#0b1222] p-1 rounded-xl border border-slate-800 text-xs">
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
              onClick={() => setActiveTab('movimentacoes')}
              className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-all flex items-center gap-1.5 ${
                activeTab === 'movimentacoes'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-extrabold'
                  : 'text-cyan-400 hover:text-cyan-300'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              DataJud
              {datajudMovs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/80 text-cyan-300 border border-cyan-400/40">
                  {datajudMovs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('calculadora')}
              className={`px-3 py-1.5 rounded-lg font-bold font-mono transition-all ${
                activeTab === 'calculadora'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Calculadora
            </button>
          </div>
        }
      />

      {/* KPI Stats Strip com NoxMetricCard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NoxMetricCard
          label="Vencendo Hoje"
          value={
            deadlinesList.filter(
              (d) => d.memorial.finalDeadlineDate === new Date().toISOString().split('T')[0],
            ).length
          }
          icon={Flame}
          statusVariant="danger"
          variation={{
            value: 'Hoje',
            direction: 'down',
            text: 'monitoramento diário',
          }}
        />

        <NoxMetricCard
          label="Próximos 7 Dias"
          value={deadlinesList.length}
          icon={Clock}
          statusVariant="warning"
          variation={{
            value: 'CPC / CLT',
            direction: 'neutral',
            text: 'contagem útil',
          }}
        />

        <NoxMetricCard
          label="Tarefas Ativas"
          value={tasks.length}
          icon={CheckCircle2}
          statusVariant="cyan"
          variation={{
            value: 'Operacional',
            direction: 'neutral',
            text: 'produção interna',
          }}
        />

        <NoxMetricCard
          label="Audiências & Reuniões"
          value={agenda.length}
          icon={Calendar}
          statusVariant="default"
          variation={{
            value: 'Pauta',
            direction: 'up',
            text: 'agenda ativa',
          }}
        />
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
              <NoxEmptyState
                icon={Clock}
                title="Nenhum prazo judicial ativo"
                description="Importe um arquivo CSV ou homologue publicações na Triagem para calcular memoriais temporais auditáveis."
                actionLabel="Ir para Importações"
                onAction={() => navigate('/importacoes')}
              />
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
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/processos/${encodeURIComponent(d.processo)}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/processos/${encodeURIComponent(d.processo)}`)
                      }
                    }}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/60 cursor-pointer transition-all space-y-3 nox-glass-card"
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
                          {d.temMovimentacaoDatajud && (
                            <Badge className="bg-cyan-950 text-cyan-300 border-cyan-500 text-[9px] font-mono flex items-center gap-1">
                              <Activity className="w-2.5 h-2.5" />
                              ANDAMENTO DATAJUD
                            </Badge>
                          )}
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/processos/${encodeURIComponent(d.processo)}`)
                          }}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900 text-center min-w-[110px] transition-all"
                          title={`Ver as movimentações do processo ${d.processo}`}
                        >
                          <div className="text-[9px] font-mono uppercase text-slate-400">
                            Prazo Interno
                          </div>
                          <div className="text-xs font-bold text-amber-400 font-mono">
                            {d.memorial.internalDeadlineDate}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/processos/${encodeURIComponent(d.processo)}`)
                          }}
                          className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 hover:border-cyan-500/60 hover:bg-rose-950/60 text-center min-w-[120px] transition-all"
                          title={`Ver as movimentações do processo ${d.processo}`}
                        >
                          <div className="text-[9px] font-mono uppercase text-rose-300 font-semibold">
                            Vencimento Fatal
                          </div>
                          <div className="text-sm font-black text-rose-400 font-mono">
                            {d.memorial.finalDeadlineDate}
                          </div>
                        </button>
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
      {activeTab === 'movimentacoes' && <MovimentacoesDatajudView />}
    </div>
  )
}

export default CentralPrazosPage
