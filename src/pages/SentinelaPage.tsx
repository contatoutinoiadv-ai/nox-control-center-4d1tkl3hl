import React, { useState } from 'react'
import {
  Activity,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  TrendingUp,
  Brain,
  Zap,
  Users,
  Search,
  ChevronRight,
  Sparkles,
  LifeBuoy,
  HelpCircle,
  Eye,
  Bell,
  Scale,
  Calendar,
  CheckSquare,
} from 'lucide-react'
import {
  SentinelaCommunication,
  DailyBriefingData,
  RecoveredTimeMetric,
  OperationalTwinCapacity,
  GapItem,
  DecisionMemoryItem,
  IncidentCrisisRoom,
} from '@/types/sentinela'
import { dataStore } from '@/services/dataStore'
import { CustodyChainTimeline } from '@/components/CustodyChainTimeline'
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

export const SentinelaHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    | 'pulso'
    | 'comunicacoes'
    | 'triagem'
    | 'sala_situacao'
    | 'prazos'
    | 'processos'
    | 'automacoes'
    | 'saude'
  >('pulso')

  const [communications, setCommunications] = useState<SentinelaCommunication[]>(
    dataStore.getCommunications(),
  )
  const [briefing, setBriefing] = useState<DailyBriefingData>(dataStore.getDailyBriefing())
  const [recoveredTime, setRecoveredTime] = useState<RecoveredTimeMetric>(
    dataStore.getRecoveredTimeMetric(),
  )
  const [twin, setTwin] = useState<OperationalTwinCapacity[]>(dataStore.getOperationalTwin())
  const [gaps, setGaps] = useState<GapItem[]>(dataStore.getGaps())
  const [memory, setMemory] = useState<DecisionMemoryItem[]>(dataStore.getDecisionMemory())
  const [incidents, setIncidents] = useState<IncidentCrisisRoom[]>(dataStore.getIncidents())
  const [automations, setAutomations] = useState(dataStore.getAutomations())
  const [apiHealth, setApiHealth] = useState(dataStore.getApiHealth())

  // Selected Item for Detail Modal
  const [selectedComm, setSelectedComm] = useState<SentinelaCommunication | null>(null)
  const [selectedCommModalOpen, setSelectedCommModalOpen] = useState(false)
  const [searchComm, setSearchComm] = useState('')
  const [triageFilter, setTriageFilter] = useState<string>('TODOS')

  const handleOpenComm = (comm: SentinelaCommunication) => {
    setSelectedComm(comm)
    setSelectedCommModalOpen(true)
  }

  const handleAdvanceStatus = (commId: string, nextStatus: SentinelaCommunication['status']) => {
    dataStore.advanceCommunicationStatus(
      commId,
      nextStatus,
      'Operador NOX',
      'Validação realizada no Sentinela NOX',
    )
    setCommunications(dataStore.getCommunications())
    toast.success(`Comunicação avançada para o estágio "${nextStatus}".`)
    if (selectedComm?.id === commId) {
      setSelectedComm(dataStore.getCommunicationById(commId) || null)
    }
  }

  const handleApproveDeadline = (commId: string, memorial: any) => {
    dataStore.approveCommunicationDeadline(commId, memorial, 'Dra. Mariana Rios')
    setCommunications(dataStore.getCommunications())
    setRecoveredTime(dataStore.getRecoveredTimeMetric())
    toast.success('Prazo homologado e tarefas geradas na Agenda!')
    setSelectedCommModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Sentinela Master Header with Sub-Navigation */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1329] via-[#0e1738] to-[#160d2b] border border-cyan-500/30 p-5 md:p-6 shadow-2xl shadow-cyan-950/40 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-[10px] font-mono tracking-wider uppercase px-2 py-0.5">
                Sentinela NOX v2.0
              </Badge>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Operação Inteligente & Cadeia de Custódia
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-200">
              Sentinela NOX — Centro Operacional Integrado
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Captura segura do DJEN/PJe, triagem com anti-prompt injection, cálculo explicável de
              prazos, agenda e orquestração de tarefas.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Tempo Recuperado</div>
              <div className="text-base font-black text-emerald-400 font-mono">
                +{recoveredTime.totalMinutesSaved} min
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  ({recoveredTime.manualBaselineHours}h economizadas)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Areas Sub-Navigation Tabs */}
        <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/80 pt-4">
          {[
            { id: 'pulso', label: 'Pulso', icon: Activity, badge: null },
            {
              id: 'comunicacoes',
              label: 'Comunicações',
              icon: Radio,
              badge: communications.length,
            },
            {
              id: 'triagem',
              label: 'Triagem',
              icon: Flame,
              badge:
                communications.filter(
                  (c) => c.status === 'REVISAO_HUMANA' || c.triageCategory === 'ambigua',
                ).length || null,
              badgeVariant: 'warning',
            },
            {
              id: 'sala_situacao',
              label: 'Sala de Situação',
              icon: LifeBuoy,
              badge: incidents.length || null,
              badgeVariant: 'destructive',
            },
            { id: 'prazos', label: 'Prazos & Memorial', icon: Clock, badge: null },
            { id: 'processos', label: 'Dossiê Vivo', icon: Brain, badge: null },
            {
              id: 'automacoes',
              label: 'Automações',
              icon: Zap,
              badge: automations.filter((a) => a.active).length,
            },
            { id: 'saude', label: 'Saúde & Gêmeo', icon: ShieldCheck, badge: '100% OK' },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-slate-950 text-cyan-300'
                        : tab.badgeVariant === 'warning'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : tab.badgeVariant === 'destructive'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* SUB-VIEW 1: PULSO (Real-Time Operations & Daily Briefing) */}
      {activeSubTab === 'pulso' && (
        <div className="space-y-6">
          {/* Daily Executive Briefing */}
          <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 space-y-4 nox-glass-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Briefing Diário Sentinela NOX —{' '}
                  {new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                </h3>
              </div>
              <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
                CAPTURA ESTÁVEL (0 INCIDENTES ATIVOS)
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Urgent Deadlines Today */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-rose-400 flex items-center justify-between">
                  <span>Prazos Fatais Hoje ({briefing.urgentDeadlinesToday.length})</span>
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                </div>
                {briefing.urgentDeadlinesToday.map((d) => (
                  <div
                    key={d.id}
                    className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-xs text-slate-200"
                  >
                    <div className="font-bold text-rose-300">{d.title}</div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between mt-1">
                      <span>{d.process}</span>
                      <span className="text-rose-400 font-bold">{d.hoursLeft}h restantes</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Today's Commitments */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-cyan-400 flex items-center justify-between">
                  <span>Compromissos & Audiências Hoje</span>
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                {briefing.upcomingCommitments.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{c.title}</span>
                      <span className="text-cyan-400 font-mono text-[11px]">{c.time}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{c.responsible}</div>
                  </div>
                ))}
              </div>

              {/* Explainable AI Recommendations */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-purple-400 flex items-center justify-between">
                  <span>Recomendações Operacionais Explicáveis</span>
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                </div>
                {briefing.explainableRecommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-purple-950/20 border border-purple-900/40 text-xs text-slate-200"
                  >
                    <div className="font-bold text-purple-300">{rec.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{rec.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recovered Time Metric & Automation ROI */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Métrica de Tempo Recuperado (Baseada em Ações Auditadas Reais)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Comparativo entre tempo manual de referência vs tempo do fluxo automatizado NOX.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recoveredTime.breakdown.map((b, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-300">{b.category}</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                    {b.totalHours} horas salvas
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {b.count} eventos × {b.minutesPerUnitSaved} min economizados cada
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Gaps Detector */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Detector de Lacunas Operacionais ({gaps.length} pendências estruturais)
              </h4>
            </div>

            <div className="divide-y divide-slate-800 text-xs">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono border-amber-800 text-amber-300 bg-amber-950/40"
                      >
                        {gap.category}
                      </Badge>
                      <span className="font-semibold text-slate-200">{gap.targetTitle}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{gap.description}</p>
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono shrink-0">
                    Ação: {gap.recommendedFix}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: COMUNICACOES (DJEN / PJe Ingestion & Triage Flow) */}
      {activeSubTab === 'comunicacoes' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Buscar por processo, tribunal, destinatário..."
                value={searchComm}
                onChange={(e) => setSearchComm(e.target.value)}
                className="bg-slate-950 border-slate-800 pl-8 h-8 text-xs text-slate-200"
              />
            </div>
            <div className="text-xs font-mono text-slate-400">
              Conexão: <span className="text-emerald-400">comunicaapi.pje.jus.br (Ativa)</span>
            </div>
          </div>

          {/* Communications Stream */}
          <div className="space-y-3">
            {communications
              .filter(
                (c) =>
                  !searchComm ||
                  c.numeroProcesso.includes(searchComm) ||
                  c.tribunal.toLowerCase().includes(searchComm.toLowerCase()) ||
                  c.teorResumido.toLowerCase().includes(searchComm.toLowerCase()),
              )
              .map((comm) => (
                <div
                  key={comm.id}
                  onClick={() => handleOpenComm(comm)}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer space-y-3 nox-glass-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                        {comm.source} • {comm.tribunal}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          comm.urgencyLevel === 'critica' || comm.urgencyLevel === 'alta'
                            ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {comm.urgencyLevel.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {comm.numeroProcesso}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono text-emerald-400 border-emerald-800 bg-emerald-950/30"
                      >
                        STATUS: {comm.status}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2">{comm.teorResumido}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
                    <div>
                      Destinatário: <span className="text-slate-300">{comm.destinatario}</span>
                    </div>
                    <div className="text-cyan-400 font-semibold flex items-center gap-1">
                      Ver Cadeia de Custódia & Memorial <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: TRIAGEM (Items with Human Review Required & Ambiguities) */}
      {activeSubTab === 'triagem' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-2 text-amber-300">
              <Flame className="w-4 h-4 text-amber-400" />
              Mesa de Triagem Crítica & Resolução de Ambiguidades
            </div>
            <p className="text-amber-300/80">
              Publicações que exigem decisão humana obrigatória por divergência de marco, ausência
              de prazo expresso ou risco elevado.
            </p>
          </div>

          <div className="space-y-3">
            {communications
              .filter(
                (c) =>
                  c.status === 'REVISAO_HUMANA' ||
                  c.triageCategory === 'ambigua' ||
                  c.urgencyLevel === 'critica',
              )
              .map((comm) => (
                <div
                  key={comm.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-3 nox-glass-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-mono">
                        TRIAGEM PENDENTE
                      </Badge>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {comm.numeroProcesso}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenComm(comm)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-7"
                    >
                      Avaliar & Homologar
                    </Button>
                  </div>
                  <p className="text-xs text-slate-300">{comm.teorResumido}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: SALA DE SITUACAO (Incidents & Crisis Management) */}
      {activeSubTab === 'sala_situacao' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-rose-400" />
              Salas de Crise & Incidentes de Conectividade de Tribunais
            </h3>
          </div>

          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-rose-800/60 space-y-4 nox-glass-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono uppercase">
                    {inc.incidentType}
                  </Badge>
                  <h4 className="text-sm font-bold text-slate-100 mt-1">{inc.title}</h4>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-mono text-amber-400 border-amber-800"
                >
                  STATUS: {inc.status}
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Plano de Contingência Operacional:
                </div>
                <p>{inc.contingencyPlan}</p>
              </div>

              {/* Incident Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Atualizações da Sala de Crise:
                </div>
                {inc.timelineUpdates.map((u, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                      {new Date(u.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <span>
                      <strong>{u.author}:</strong> {u.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-VIEW 5: PRAZOS & MEMORIAL (Central de Prazos + Simulador) */}
      {activeSubTab === 'prazos' && (
        <div className="space-y-6">
          <DeadlineCalculatorView
            onApproveDeadline={(mem) => {
              toast.success('Prazo calculado com sucesso!')
            }}
          />
        </div>
      )}

      {/* SUB-VIEW 6: PROCESSOS & DOSSIE VIVO */}
      {activeSubTab === 'processos' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
            <h4 className="font-bold text-slate-100 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              Dossiê Vivo & Memória de Decisões Estratégicas
            </h4>
            <p className="text-slate-400">
              Registro histórico e semântico de como o escritório resolveu situações similares
              anteriores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memory.map((mem) => (
              <div
                key={mem.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 nox-glass-card"
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono text-purple-300 border-purple-800"
                  >
                    CASO ANÁLOGO ({mem.appliedDate})
                  </Badge>
                  <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-mono">
                    {mem.outcome}
                  </Badge>
                </div>

                <div className="text-xs font-bold text-slate-200">{mem.similarityContext}</div>
                <p className="text-xs text-slate-400">{mem.situationSummary}</p>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-0.5">
                    Decisão Adotada:
                  </span>
                  {mem.decisionTaken}
                </div>

                <div className="text-[10px] font-mono text-slate-500">
                  Registrado por: <span className="text-slate-400">{mem.decisionAuthor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 7: AUTOMACOES */}
      {activeSubTab === 'automacoes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Regras & Gatilhos do Workflow Orchestrator
              </h3>
              <p className="text-xs text-slate-400">
                Padrão QUANDO [evento] SE [condição] ENTÃO [ação] com aprovação humana configurável.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {automations.map((auto) => (
              <div
                key={auto.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 nox-glass-card"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200">{auto.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{auto.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={auto.active ? 'default' : 'outline'}
                    onClick={() => {
                      dataStore.toggleAutomation(auto.id)
                      setAutomations(dataStore.getAutomations())
                      toast.info(`Regra "${auto.name}" ${auto.active ? 'desativada' : 'ativada'}.`)
                    }}
                    className={
                      auto.active
                        ? 'bg-emerald-600 text-white font-bold text-xs h-7'
                        : 'text-slate-400 text-xs h-7'
                    }
                  >
                    {auto.active ? 'Ativa' : 'Pausada'}
                  </Button>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-cyan-400 font-bold">SE:</span> {auto.conditionFormula}
                  </div>
                  <div>
                    <span className="text-purple-400 font-bold">ENTÃO:</span> {auto.actionFormula}
                  </div>
                </div>

                {auto.simulationResultPreview && (
                  <div className="text-[11px] text-amber-300/80 font-mono">
                    Simulação: {auto.simulationResultPreview}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 8: SAUDE & GEMEO OPERACIONAL */}
      {activeSubTab === 'saude' && (
        <div className="space-y-6">
          {/* Gêmeo Operacional do Escritório */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 nox-glass-card">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Gêmeo Operacional do Escritório (Carga de Trabalho & Risco de Sobrecarga)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {twin.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-slate-200">{p.personName}</div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono ${
                        p.riskOfOverload
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-slate-900 text-slate-300'
                      }`}
                    >
                      {p.capacityPercentage}% CARGA
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400">{p.role}</div>

                  <div className="text-[11px] font-mono text-slate-300 space-y-0.5 pt-1 border-t border-slate-800">
                    <div>Tarefas Ativas: {p.activeTasksCount}</div>
                    <div>Prazos (7 dias): {p.deadlinesNext7Days}</div>
                    <div>Compromissos: {p.agendaCommitmentsCount}</div>
                  </div>

                  {p.suggestedAction && (
                    <div className="text-[10px] text-amber-300/90 bg-amber-950/30 p-1.5 rounded border border-amber-900/40">
                      {p.suggestedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Health of APIs & Sync Pipelines */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Saúde das Conexões & Gateways de Tribunais
            </h3>

            <div className="divide-y divide-slate-800 text-xs font-mono">
              {apiHealth.map((api, idx) => (
                <div
                  key={idx}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-200">{api.serviceName}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-md">
                      {api.endpoint}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400 text-[11px]">{api.latencyMs}ms</span>
                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      {api.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog for Communication with Custody Chain & Memorial */}
      <Dialog open={selectedCommModalOpen} onOpenChange={setSelectedCommModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedComm && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                  Comunicação #{selectedComm.id} ({selectedComm.tribunal})
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-mono">
                  {selectedComm.numeroProcesso} • {selectedComm.orgaoJulgador}
                </DialogDescription>
              </DialogHeader>

              {/* Custody Chain Component */}
              <CustodyChainTimeline custody={selectedComm.custody} />

              {/* Deadline Engine Integration */}
              <div className="pt-2">
                <DeadlineCalculatorView
                  initialMemorial={selectedComm.deadlineCalculated}
                  onApproveDeadline={(mem) => handleApproveDeadline(selectedComm.id, mem)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SentinelaHub
