import React, { useState, useEffect, useMemo } from 'react'
import {
  Radio,
  Activity,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  UploadCloud,
  ArrowUpRight,
  Clock,
  TrendingUp,
  ChevronRight,
  Layers,
  FileSpreadsheet,
} from 'lucide-react'
import { MiniRadar } from '@/components/MiniRadar'
import { dataStore } from '@/services/dataStore'
import { NoxRecord, AuditLogEntry, NoxSystemStats } from '@/types/nox'
import { useNavigate } from 'react-router-dom'
import {
  NoxPageHeader,
  NoxMetricCard,
  NoxCard,
  NoxButton,
  NoxStatusBadge,
  NoxEmptyState,
  NoxMono,
} from '@/design-system'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'

export const Index: React.FC = () => {
  const [records, setRecords] = useState<NoxRecord[]>(dataStore.getRecords())
  const [stats, setStats] = useState<NoxSystemStats>(dataStore.getStats())
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(dataStore.getAuditLogs())
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setRecords(dataStore.getRecords())
      setStats(dataStore.getStats())
      setAuditLogs(dataStore.getAuditLogs())
    })
    return unsub
  }, [])

  // Top urgent records for "Exige atenção agora"
  const urgentQueue = useMemo(() => {
    return records
      .filter((r) => r.status === 'novo' || r.status === 'em_revisao' || r.status === 'quarentena')
      .sort((a, b) => {
        const sevScore = { critico: 4, alto: 3, medio: 2, informativo: 1 }
        return sevScore[b.severity] - sevScore[a.severity]
      })
      .slice(0, 5)
  }, [records])

  // Tribunal Distribution data for chart
  const tribunalData = useMemo(() => {
    const counts: Record<string, number> = {}
    records.forEach((r) => {
      counts[r.tribunal] = (counts[r.tribunal] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, total: count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
  }, [records])

  // Operational activity over 7 days (deterministic synthetic curve)
  const activityData = [
    { day: '26/Ago', throughput: 18, alertas: 3, quarentena: 0 },
    { day: '27/Ago', throughput: 24, alertas: 5, quarentena: 1 },
    { day: '28/Ago', throughput: 31, alertas: 7, quarentena: 0 },
    { day: '29/Ago', throughput: 28, alertas: 6, quarentena: 2 },
    { day: '30/Ago', throughput: 35, alertas: 11, quarentena: 1 },
    { day: '31/Ago', throughput: 39, alertas: 9, quarentena: 0 },
    { day: '01/Set', throughput: 42, alertas: 14, quarentena: 4 },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / Hero Greeting padronizado com NoxPageHeader */}
      <NoxPageHeader
        title="Central NOX"
        description="Painel de inteligência operacional e triagem de dados ingeridos do Sentinela NOX com rigor temporal e rastreabilidade."
        icon={Activity}
        badge={
          <div className="flex items-center gap-2">
            <NoxStatusBadge status="ONLINE" customLabel="LIVE OPERATION" size="sm" />
            {dataStore.isUsingRealImportedData() ? (
              <NoxStatusBadge
                status="RESOLVIDO"
                customLabel={`DADOS IMPORTADOS REAIS (${records.length})`}
                size="sm"
                showDot
              />
            ) : (
              <NoxStatusBadge
                status="RASCUNHO"
                customLabel={`SEM DADOS (${records.length})`}
                size="sm"
              />
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <NoxButton
              variant="primary"
              size="sm"
              icon={UploadCloud}
              onClick={() => navigate('/importacoes')}
            >
              Importar CSV
            </NoxButton>
            <NoxButton
              variant="secondary"
              size="sm"
              icon={CheckCircle2}
              onClick={() => navigate('/revisao')}
            >
              Fila de Revisão ({stats.inReviewRecords + stats.newRecords})
            </NoxButton>
            <NoxButton
              variant="ghost"
              size="sm"
              icon={FileSpreadsheet}
              onClick={() => navigate('/exportacoes')}
            >
              Exportar
            </NoxButton>
          </div>
        }
      />

      {/* Asymmetric Dominant Hero Section: Radar Spotlight + High-Impact NoxMetricCards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Dominant Left: Radar & Severity Breakdown */}
        <NoxCard variant="glass" className="lg:col-span-7 p-5 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Radar NOX em Tempo Real</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribuição angular por recência e severidade dos alertas ativos.
              </p>
            </div>
            <NoxButton
              variant="ghost"
              size="sm"
              icon={ArrowUpRight}
              onClick={() => navigate('/radar')}
            >
              Expandir Radar
            </NoxButton>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
            <MiniRadar records={records} className="shrink-0" />

            <div className="w-full sm:w-56 space-y-2.5">
              <div className="text-[11px] font-mono text-slate-400 uppercase font-semibold border-b border-slate-800 pb-1">
                Classificação de Alertas
              </div>

              <div
                onClick={() => navigate('/radar?sev=critico')}
                className="cursor-pointer flex items-center justify-between p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 hover:border-rose-500/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-xs text-rose-200 font-medium">Críticos</span>
                </div>
                <NoxMono className="text-sm font-bold text-rose-400">
                  {stats.criticalAlerts}
                </NoxMono>
              </div>

              <div
                onClick={() => navigate('/radar?sev=alto')}
                className="cursor-pointer flex items-center justify-between p-2 rounded-lg bg-amber-950/30 border border-amber-900/40 hover:border-amber-500/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs text-amber-200 font-medium">Altos</span>
                </div>
                <NoxMono className="text-sm font-bold text-amber-400">{stats.highAlerts}</NoxMono>
              </div>

              <div
                onClick={() => navigate('/radar?sev=medio')}
                className="cursor-pointer flex items-center justify-between p-2 rounded-lg bg-yellow-950/30 border border-yellow-900/40 hover:border-yellow-500/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                  <span className="text-xs text-yellow-200 font-medium">Médios</span>
                </div>
                <NoxMono className="text-sm font-bold text-yellow-400">
                  {stats.mediumAlerts}
                </NoxMono>
              </div>

              <div
                onClick={() => navigate('/radar?sev=informativo')}
                className="cursor-pointer flex items-center justify-between p-2 rounded-lg bg-cyan-950/30 border border-cyan-900/40 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                  <span className="text-xs text-cyan-200 font-medium">Informativos</span>
                </div>
                <NoxMono className="text-sm font-bold text-cyan-400">{stats.infoAlerts}</NoxMono>
              </div>
            </div>
          </div>
        </NoxCard>

        {/* Right 5 Cols: Standardized NoxMetricCards */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
          <NoxMetricCard
            label="Total Monitorado"
            value={stats.totalMonitored}
            icon={Layers}
            statusVariant="cyan"
            variation={{
              value: '+42',
              direction: 'up',
              text: 'lote atual',
            }}
            onClick={() => navigate('/processos')}
          />

          <NoxMetricCard
            label="Quarentena / Falhas"
            value={stats.quarantinedRecords}
            icon={AlertTriangle}
            statusVariant="warning"
            variation={{
              value: 'Atenção',
              direction: 'down',
              text: 'validação',
            }}
            onClick={() => navigate('/importacoes')}
          />

          <NoxMetricCard
            label="Em Revisão Ativa"
            value={stats.inReviewRecords}
            icon={Clock}
            statusVariant="default"
            variation={{
              value: `${stats.inReviewRecords + stats.newRecords}`,
              direction: 'neutral',
              text: 'fila pendente',
            }}
            onClick={() => navigate('/revisao')}
          />

          <NoxMetricCard
            label="Processados / Resolvidos"
            value={stats.resolvedRecords + records.filter((r) => r.status === 'processado').length}
            icon={CheckCircle2}
            statusVariant="success"
            variation={{
              value: '100%',
              direction: 'up',
              text: 'sem pendências',
            }}
            onClick={() => navigate('/processos?status=resolvido')}
          />
        </div>
      </div>

      {/* Middle Section: Urgent Action Queue & Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Urgent Queue: "Exige atenção agora" (7 cols) */}
        <NoxCard variant="glass" className="lg:col-span-7 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                  Exige Atenção Agora
                </h2>
              </div>
              <NoxStatusBadge status="PENDENTE" customLabel="Top 5 Prioridades" size="sm" />
            </div>

            <div className="space-y-2.5">
              {urgentQueue.length === 0 ? (
                <NoxEmptyState
                  icon={ShieldAlert}
                  title="Nenhum alerta crítico ativo no momento"
                  description="Todos os registros do Sentinela NOX estão regularizados ou aguardando novo lote de ingestão."
                  actionLabel="Importar novo lote CSV"
                  onAction={() => navigate('/importacoes')}
                />
              ) : (
                urgentQueue.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => navigate(`/processos?selected=${rec.id}`)}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer group flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <NoxMono className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200">
                          {rec.recordCode}
                        </NoxMono>
                        <NoxMono className="text-xs text-slate-400">{rec.numeroProcesso}</NoxMono>
                        <NoxStatusBadge status="RASCUNHO" customLabel={rec.tribunal} size="sm" />
                        <NoxStatusBadge
                          status={
                            rec.severity === 'critico'
                              ? 'BLOQUEADO'
                              : rec.severity === 'alto'
                                ? 'PENDENTE'
                                : 'RASCUNHO'
                          }
                          customLabel={rec.severity}
                          size="sm"
                        />
                      </div>

                      <p className="text-xs font-medium text-slate-200 mt-1 line-clamp-1 group-hover:text-white">
                        {rec.alertTitle}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{rec.partes}</p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Resp: {rec.responsible.split(' ')[1] || rec.responsible}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Filtrado por criticidade operacional</span>
            <NoxButton
              variant="ghost"
              size="sm"
              onClick={() => navigate('/revisao')}
              className="text-xs text-cyan-400 p-0 h-auto font-mono hover:text-cyan-300"
            >
              Ver fila de trabalho completa →
            </NoxButton>
          </div>
        </NoxCard>

        {/* Operational Health / Throughput Chart (5 cols) */}
        <NoxCard variant="glass" className="lg:col-span-5 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
                  Atividade nos Últimos Dias
                </h2>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">Throughput Sentinela</span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activityData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090d16',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    labelStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="throughput"
                    name="Registros Ingeridos"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#cyanGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="alertas"
                    name="Alertas Críticos/Altos"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#amberGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Ingestão Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Alertas Disparados</span>
            </div>
          </div>
        </NoxCard>
      </div>

      {/* Bottom Section: Tribunal Distribution + Recent Audit Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tribunal Distribution */}
        <NoxCard variant="glass" className="lg:col-span-5 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
              Distribuição por Tribunal
            </h2>
            <span className="text-[10px] font-mono text-slate-400">Dados do Lote</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tribunalData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                />
                <Bar dataKey="total" name="Processos" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NoxCard>

        {/* Activity Feed */}
        <NoxCard variant="glass" className="lg:col-span-7 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono">
              Feed de Atividades Recentes
            </h2>
            <NoxButton
              variant="ghost"
              size="sm"
              onClick={() => navigate('/auditoria')}
              className="text-xs text-cyan-400 p-0 h-auto font-mono hover:text-cyan-300"
            >
              Ver auditoria completa →
            </NoxButton>
          </div>

          <div className="space-y-2.5">
            {auditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      log.category === 'importacao'
                        ? 'bg-cyan-400'
                        : log.category === 'revisao'
                          ? 'bg-amber-400'
                          : log.category === 'exportacao'
                            ? 'bg-emerald-400'
                            : 'bg-purple-400'
                    }`}
                  />
                  <div className="truncate">
                    <span className="font-mono text-slate-200 font-semibold mr-2">
                      {log.action}
                    </span>
                    <span className="text-slate-400 text-[11px]">por {log.actor}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </NoxCard>
      </div>
    </div>
  )
}

export default Index
