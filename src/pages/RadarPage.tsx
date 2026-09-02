import React, { useState, useEffect, useMemo } from 'react'
import {
  Radio,
  List,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  Maximize2,
  ChevronRight,
  X,
  Clock,
  Sparkles,
  Search,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { dataStore } from '@/services/dataStore'
import { NoxRecord, SeverityLevel, AlertType } from '@/types/nox'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export const RadarPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [records, setRecords] = useState<NoxRecord[]>(dataStore.getRecords())
  const [viewMode, setViewMode] = useState<'radar' | 'list'>('radar')
  const [selectedRecord, setSelectedRecord] = useState<NoxRecord | null>(null)

  // Filters
  const initialSev = searchParams.get('sev') as SeverityLevel | null
  const [selectedSeverity, setSelectedSeverity] = useState<string>(initialSev || 'all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedTribunal, setSelectedTribunal] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredRecord, setHoveredRecord] = useState<NoxRecord | null>(null)
  const [isScanningActive, setIsScanningActive] = useState(true)

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setRecords(dataStore.getRecords())
    })
    return unsub
  }, [])

  useEffect(() => {
    if (initialSev) setSelectedSeverity(initialSev)
  }, [initialSev])

  // Tribunals list
  const tribunals = useMemo(() => {
    const set = new Set(records.map((r) => r.tribunal))
    return Array.from(set).sort()
  }, [records])

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedSeverity !== 'all' && r.severity !== selectedSeverity) return false
      if (selectedType !== 'all' && r.alertType !== selectedType) return false
      if (selectedTribunal !== 'all' && r.tribunal !== selectedTribunal) return false
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase()
        const matches =
          r.recordCode.toLowerCase().includes(q) ||
          r.numeroProcesso.toLowerCase().includes(q) ||
          r.partes.toLowerCase().includes(q) ||
          r.alertTitle.toLowerCase().includes(q) ||
          r.responsible.toLowerCase().includes(q)
        if (!matches) return false
      }
      return true
    })
  }, [records, selectedSeverity, selectedType, selectedTribunal, searchQuery])

  // Coordinate mapping for SVG radar:
  // Center: (250, 250), Radius: 210
  // Rings:
  // Inner Ring (Critical/Coral): r = 55
  // Middle-High Ring (High/Amber): r = 105
  // Middle-Low Ring (Medium/Yellow): r = 155
  // Outer Ring (Info/Cyan): r = 205
  const radarPoints = useMemo(() => {
    const cx = 250
    const cy = 250

    return filteredRecords.map((r, i) => {
      let baseRadius = 200 // info
      let ringLabel = 'Informativo'
      if (r.severity === 'critico') {
        baseRadius = 50
        ringLabel = 'Crítico'
      } else if (r.severity === 'alto') {
        baseRadius = 100
        ringLabel = 'Alto'
      } else if (r.severity === 'medio') {
        baseRadius = 150
        ringLabel = 'Médio'
      }

      // Angle calculated deterministically from record code and tribunal
      const codeHash = r.recordCode.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), i * 29)
      const angleDeg = codeHash % 360
      const angleRad = (angleDeg * Math.PI) / 180

      // Small deterministic jitter so points on same ring don't overlap completely
      const jitter = ((i * 13) % 18) - 9
      const finalRadius = Math.max(30, baseRadius + jitter)

      const x = cx + finalRadius * Math.cos(angleRad)
      const y = cy + finalRadius * Math.sin(angleRad)

      return {
        record: r,
        x,
        y,
        ringLabel,
        color:
          r.severity === 'critico'
            ? '#ef4444'
            : r.severity === 'alto'
              ? '#f59e0b'
              : r.severity === 'medio'
                ? '#eab308'
                : '#06b6d4',
        shape:
          r.alertType === 'qualidade_dado'
            ? 'square'
            : r.alertType === 'importacao'
              ? 'diamond'
              : 'circle',
      }
    })
  }, [filteredRecords])

  const handleUpdateStatus = (status: NoxRecord['status']) => {
    if (!selectedRecord) return
    dataStore.updateRecordStatus(selectedRecord.id, status, 'Operador NOX')
    setSelectedRecord((prev) => (prev ? { ...prev, status } : null))
    toast.success(`Status atualizado para "${status}" com sucesso.`)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Radio className="w-6 h-6 text-cyan-400 animate-pulse" />
              Radar de Alertas NOX
            </h1>
            <Badge className="bg-cyan-950 text-cyan-400 border-cyan-800 font-mono text-xs">
              Assinatura NOX
            </Badge>
            {dataStore.isUsingRealImportedData() ? (
              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 font-mono text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                BASE IMPORTADA REAL ({records.length})
              </Badge>
            ) : (
              <Badge className="bg-amber-950/70 text-amber-300 border-amber-800 font-mono text-xs">
                DATASET SINTÉTICO (DEMO)
              </Badge>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Visualização topográfica angular onde a severidade determina a proximidade do núcleo
            central e a recência modula o ângulo.
          </p>
        </div>

        {/* View Switcher & Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <Button
              size="sm"
              variant={viewMode === 'radar' ? 'default' : 'ghost'}
              onClick={() => setViewMode('radar')}
              className={`h-7 px-3 text-xs font-mono ${
                viewMode === 'radar'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 mr-1" />
              Radar
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className={`h-7 px-3 text-xs font-mono ${
                viewMode === 'list'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5 mr-1" />
              Lista ({filteredRecords.length})
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsScanningActive(!isScanningActive)}
            className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300 font-mono"
            title="Alternar animação da varredura"
          >
            {isScanningActive ? 'Varredura ON' : 'Varredura OFF'}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="nox-glass-card rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar no radar..."
              className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          {/* Severity filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas Severidades</option>
            <option value="critico">Crítico (Núcleo)</option>
            <option value="alto">Alto (Anel 2)</option>
            <option value="medio">Médio (Anel 3)</option>
            <option value="informativo">Informativo (Periferia)</option>
          </select>

          {/* Alert type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Tipos de Alerta</option>
            <option value="operacional">Operacional (Processual)</option>
            <option value="qualidade_dado">Qualidade de Dados</option>
            <option value="importacao">Importação / Parser</option>
            <option value="futuro_lex_tempus">LEX TEMPUS (Preditivo)</option>
          </select>

          {/* Tribunal filter */}
          <select
            value={selectedTribunal}
            onChange={(e) => setSelectedTribunal(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Tribunais</option>
            {tribunals.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>Exibindo:</span>
          <span className="text-cyan-400 font-bold">{filteredRecords.length}</span>
          <span>de {records.length}</span>
        </div>
      </div>

      {/* Main Radar & Sidebar Details Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Visual Radar Container (7 or 12 cols depending on drawer) */}
        <div
          className={`${selectedRecord ? 'lg:col-span-7' : 'lg:col-span-12'} nox-glass-card rounded-2xl p-6 relative flex flex-col items-center justify-center min-h-[550px] transition-all`}
        >
          {viewMode === 'radar' ? (
            <div className="relative flex flex-col items-center">
              {/* SVG Radar */}
              <div className="relative">
                <svg
                  width="500"
                  height="500"
                  viewBox="0 0 500 500"
                  className="max-w-full h-auto select-none overflow-visible"
                >
                  <defs>
                    <radialGradient id="radarBackdrop" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#082f49" stopOpacity="0.4" />
                      <stop offset="60%" stopColor="#030712" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#030712" stopOpacity="1" />
                    </radialGradient>
                    <linearGradient id="mainSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                      <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Backdrop */}
                  <circle cx="250" cy="250" r="230" fill="url(#radarBackdrop)" />

                  {/* Outer Frame */}
                  <circle cx="250" cy="250" r="230" fill="none" stroke="#1e293b" strokeWidth="2" />
                  <circle
                    cx="250"
                    cy="250"
                    r="238"
                    fill="none"
                    stroke="#0e7490"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                    strokeDasharray="4 8"
                  />

                  {/* Range Rings with Clear Severity Meaning */}
                  {/* Outer: Info (r=200) */}
                  <circle
                    cx="250"
                    cy="250"
                    r="200"
                    fill="none"
                    stroke="#06b6d4"
                    strokeOpacity="0.25"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="255"
                    y="60"
                    fill="#06b6d4"
                    opacity="0.6"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ANEL 4: INFORMATIVO
                  </text>

                  {/* Mid-Low: Medium (r=150) */}
                  <circle
                    cx="250"
                    cy="250"
                    r="150"
                    fill="none"
                    stroke="#eab308"
                    strokeOpacity="0.3"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="255"
                    y="110"
                    fill="#eab308"
                    opacity="0.6"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ANEL 3: MÉDIO
                  </text>

                  {/* Mid-High: High (r=100) */}
                  <circle
                    cx="250"
                    cy="250"
                    r="100"
                    fill="none"
                    stroke="#f59e0b"
                    strokeOpacity="0.45"
                    strokeWidth="1.5"
                  />
                  <text
                    x="255"
                    y="160"
                    fill="#f59e0b"
                    opacity="0.7"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    ANEL 2: ALTO
                  </text>

                  {/* Inner: Critical (r=50) */}
                  <circle
                    cx="250"
                    cy="250"
                    r="50"
                    fill="none"
                    stroke="#ef4444"
                    strokeOpacity="0.6"
                    strokeWidth="2"
                  />
                  <text
                    x="255"
                    y="210"
                    fill="#ef4444"
                    opacity="0.8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    NÚCLEO: CRÍTICO
                  </text>

                  {/* Crosshairs & Degrees */}
                  <line x1="250" y1="20" x2="250" y2="480" stroke="#1e293b" strokeWidth="1" />
                  <line x1="20" y1="250" x2="480" y2="250" stroke="#1e293b" strokeWidth="1" />
                  <line
                    x1="87"
                    y1="87"
                    x2="413"
                    y2="413"
                    stroke="#1e293b"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                  <line
                    x1="87"
                    y1="413"
                    x2="413"
                    y2="87"
                    stroke="#1e293b"
                    strokeOpacity="0.5"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />

                  {/* Sweeping Ray Animation */}
                  {isScanningActive && (
                    <g className="animate-radar-sweep origin-center">
                      <path
                        d="M 250 250 L 250 20 A 230 230 0 0 1 450 140 Z"
                        fill="url(#mainSweepGrad)"
                      />
                      <line
                        x1="250"
                        y1="250"
                        x2="250"
                        y2="20"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        strokeOpacity="0.8"
                      />
                    </g>
                  )}

                  {/* Points on Radar */}
                  {radarPoints.map((pt) => {
                    const isSelected = selectedRecord?.id === pt.record.id
                    const isHovered = hoveredRecord?.id === pt.record.id

                    return (
                      <g
                        key={pt.record.id}
                        onClick={() => setSelectedRecord(pt.record)}
                        onMouseEnter={() => setHoveredRecord(pt.record)}
                        onMouseLeave={() => setHoveredRecord(null)}
                        className="cursor-pointer transition-transform group"
                        tabIndex={0}
                        role="button"
                        aria-label={`Alerta ${pt.record.recordCode} - Severidade ${pt.record.severity} - ${pt.record.alertTitle}`}
                      >
                        {/* Pulse for critical items */}
                        {pt.record.severity === 'critico' && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="14"
                            fill={pt.color}
                            opacity="0.2"
                            className="animate-ping"
                          />
                        )}

                        {/* Selected Indicator */}
                        {isSelected && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r="12"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeDasharray="2 2"
                            className="animate-spin"
                          />
                        )}

                        {/* Point Shape by Alert Type */}
                        {pt.shape === 'square' ? (
                          <rect
                            x={pt.x - 5}
                            y={pt.y - 5}
                            width="10"
                            height="10"
                            fill={pt.color}
                            stroke="#030712"
                            strokeWidth="2"
                            className="group-hover:scale-150 transition-transform"
                          />
                        ) : pt.shape === 'diamond' ? (
                          <polygon
                            points={`${pt.x},${pt.y - 6} ${pt.x + 6},${pt.y} ${pt.x},${pt.y + 6} ${pt.x - 6},${pt.y}`}
                            fill={pt.color}
                            stroke="#030712"
                            strokeWidth="2"
                            className="group-hover:scale-150 transition-transform"
                          />
                        ) : (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={pt.record.severity === 'critico' ? 6 : 5}
                            fill={pt.color}
                            stroke="#030712"
                            strokeWidth="2"
                            className="group-hover:scale-150 transition-transform"
                          />
                        )}
                      </g>
                    )
                  })}

                  {/* Core Indicator */}
                  <circle cx="250" cy="250" r="5" fill="#06b6d4" />
                  <circle
                    cx="250"
                    cy="250"
                    r="8"
                    fill="none"
                    stroke="#06b6d4"
                    strokeOpacity="0.5"
                  />
                </svg>

                {/* Floating Hover Tooltip */}
                {hoveredRecord && (
                  <div className="absolute top-4 left-4 max-w-xs nox-glass p-3 rounded-lg text-xs pointer-events-none z-20 shadow-2xl border border-cyan-500/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-cyan-300">
                        {hoveredRecord.recordCode}
                      </span>
                      <Badge className="text-[9px] px-1 py-0">{hoveredRecord.tribunal}</Badge>
                    </div>
                    <div className="font-medium text-slate-100 mt-1 line-clamp-1">
                      {hoveredRecord.alertTitle}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {hoveredRecord.partes}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800 text-[10px] font-mono">
                      <span
                        className={`uppercase font-bold ${
                          hoveredRecord.severity === 'critico'
                            ? 'text-rose-400'
                            : hoveredRecord.severity === 'alto'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                        }`}
                      >
                        {hoveredRecord.severity}
                      </span>
                      <span className="text-slate-400">Clique para inspecionar</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Legend and Logic Explanation */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-slate-500 uppercase font-semibold">
                    Severidade (Distância):
                  </span>
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span>Crítico (0-50km)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>Alto (50-100km)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-yellow-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    <span>Médio (100-150km)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                    <span>Info (150-200km)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <span>Formas:</span>
                  <span className="text-slate-300">● Operacional</span>
                  <span className="text-slate-300">■ Qualidade Dado</span>
                  <span className="text-slate-300">◆ Importação</span>
                </div>
              </div>
            </div>
          ) : (
            /* Equivalent Accessible Table / List View */
            <div className="w-full space-y-2 overflow-x-auto">
              <div className="text-xs font-mono text-slate-400 mb-2">
                Lista equivalente de alta acessibilidade para leitores de tela e visualização
                direta.
              </div>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                {filteredRecords.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="p-3.5 hover:bg-slate-900/80 transition-colors cursor-pointer flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          r.severity === 'critico'
                            ? 'bg-rose-500 animate-pulse'
                            : r.severity === 'alto'
                              ? 'bg-amber-500'
                              : r.severity === 'medio'
                                ? 'bg-yellow-500'
                                : 'bg-cyan-500'
                        }`}
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-300">{r.recordCode}</span>
                          <span className="font-mono text-slate-400">{r.numeroProcesso}</span>
                          <Badge className="text-[10px] px-1 py-0">{r.tribunal}</Badge>
                          <Badge className="text-[10px] font-mono uppercase px-1 py-0 bg-slate-800 text-slate-300">
                            {r.alertType.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-slate-200 font-medium mt-1 truncate">{r.alertTitle}</p>
                        <p className="text-[11px] text-slate-400 truncate">{r.partes}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        className={`text-[10px] uppercase font-mono ${
                          r.status === 'quarentena'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : r.status === 'em_revisao'
                              ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                              : r.status === 'novo'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.status}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected Record Detail Panel (Side-drawer when a point or row is clicked) */}
        {selectedRecord && (
          <div className="lg:col-span-5 nox-glass-card rounded-2xl p-5 space-y-4 border border-cyan-500/30 flex flex-col justify-between animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Badge className="bg-cyan-950 text-cyan-300 border-cyan-700 font-mono text-xs">
                    {selectedRecord.recordCode}
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">
                    {selectedRecord.tribunal}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRecord(null)}
                  className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <div className="text-[11px] font-mono uppercase text-slate-400">
                  Título do Alerta
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedRecord.alertTitle}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                  {selectedRecord.alertDescription}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Processo CNJ</div>
                  <div className="font-mono text-slate-200 mt-0.5 text-xs truncate">
                    {selectedRecord.numeroProcesso}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Severidade</div>
                  <div className="font-mono text-xs uppercase font-bold text-rose-400 mt-0.5">
                    {selectedRecord.severity}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">
                    Órgão Julgador
                  </div>
                  <div className="text-slate-200 mt-0.5 text-xs truncate">
                    {selectedRecord.orgaoJulgador}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Responsável</div>
                  <div className="text-slate-200 mt-0.5 text-xs truncate">
                    {selectedRecord.responsible}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono uppercase text-slate-400 mb-1">Partes</div>
                <div className="text-xs text-slate-300 bg-slate-900/40 p-2 rounded border border-slate-800 font-mono">
                  {selectedRecord.partes}
                </div>
              </div>

              {/* Status Operational Controls */}
              <div className="pt-2">
                <div className="text-[11px] font-mono uppercase text-slate-400 mb-2">
                  Alterar Status Operacional:
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus('em_revisao')}
                    className={`h-8 text-xs font-mono ${selectedRecord.status === 'em_revisao' ? 'bg-cyan-950 text-cyan-300 border-cyan-500' : 'bg-slate-900 text-slate-300'}`}
                  >
                    Em Revisão
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus('processado')}
                    className={`h-8 text-xs font-mono ${selectedRecord.status === 'processado' ? 'bg-blue-950 text-blue-300 border-blue-500' : 'bg-slate-900 text-slate-300'}`}
                  >
                    Processar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus('resolvido')}
                    className={`h-8 text-xs font-mono ${selectedRecord.status === 'resolvido' ? 'bg-emerald-950 text-emerald-300 border-emerald-500' : 'bg-slate-900 text-slate-300'}`}
                  >
                    Resolver
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/processos?selected=${selectedRecord.id}`)}
                className="text-xs text-cyan-400 hover:text-cyan-300 p-0 font-mono"
              >
                Abrir ficha completa do processo <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/revisao?id=${selectedRecord.id}`)}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs h-8"
              >
                Revisar Registro
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RadarPage
