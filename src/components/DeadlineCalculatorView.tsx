import React, { useState } from 'react'
import {
  Clock,
  Calendar,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  RotateCcw,
  Scale,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react'
import {
  DeadlineMemorial,
  RuleCalculationType,
  HolidayOrSuspension,
  PRAZO_NAO_DETERMINAVEL_AUTOMATICAMENTE,
} from '@/types/sentinela'
import { calculateLegalDeadline, LEGAL_RULES_PRESETS } from '@/services/deadlineEngine'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface DeadlineCalculatorViewProps {
  initialMemorial?: DeadlineMemorial
  onApproveDeadline?: (memorial: DeadlineMemorial) => void
  readOnly?: boolean
}

export const DeadlineCalculatorView: React.FC<DeadlineCalculatorViewProps> = ({
  initialMemorial,
  onApproveDeadline,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'memorial' | 'simulator'>('memorial')

  // Base state
  const [originText, setOriginText] = useState(
    initialMemorial?.originText ||
      'Ficam as partes intimadas para ciência da sentença e eventual interposição de Apelação no prazo legal de 15 (quinze) dias úteis.',
  )
  const [initialDate, setInitialDate] = useState(initialMemorial?.initialDateMarker || '2026-09-01')
  const [tribunal, setTribunal] = useState(initialMemorial?.tribunal || 'TJSP')
  const [comarca, setComarca] = useState(initialMemorial?.comarca || 'São Paulo')
  const [selectedPresetId, setSelectedPresetId] = useState(
    initialMemorial?.legalRuleName ? 'CPC_APELACAO_15D' : 'CPC_APELACAO_15D',
  )

  // Simulator state (isolated "what-if" scenario)
  const [simInitialDate, setSimInitialDate] = useState(initialDate)
  const [simDaysCount, setSimDaysCount] = useState<number>(15)
  const [simDaysType, setSimDaysType] = useState<RuleCalculationType>('uteis')
  const [simCustomSuspensionDate, setSimCustomSuspensionDate] = useState<string>('')
  const [simCustomSuspensionName, setSimCustomSuspensionName] = useState<string>('')
  const [simSuspensionsList, setSimSuspensionsList] = useState<HolidayOrSuspension[]>([])

  // Calculate official memorial
  const officialMemorial =
    initialMemorial ||
    calculateLegalDeadline({
      originText,
      rulePresetId: selectedPresetId,
      initialDate,
      tribunal,
      comarca,
    })

  // Calculate simulated scenario
  const simulatedMemorial = calculateLegalDeadline({
    originText,
    customDays: simDaysCount,
    customDaysType: simDaysType,
    initialDate: simInitialDate,
    tribunal,
    comarca,
    customSuspensions: simSuspensionsList,
  })

  const handleAddSimSuspension = () => {
    if (!simCustomSuspensionDate || !simCustomSuspensionName) {
      toast.error('Informe a data e o motivo da suspensão para o simulador.')
      return
    }
    setSimSuspensionsList([
      ...simSuspensionsList,
      {
        date: simCustomSuspensionDate,
        name: simCustomSuspensionName,
        type: 'SUSPENSAO_EXPEDIENTE',
        tribunal,
      },
    ])
    setSimCustomSuspensionDate('')
    setSimCustomSuspensionName('')
    toast.info('Suspensão hipotética adicionada ao simulador.')
  }

  const handleApprove = () => {
    if (onApproveDeadline) {
      onApproveDeadline(officialMemorial)
      toast.success('Cálculo de Prazo homologado e distribuído!', {
        description: `Vencimento fatal fixado para ${officialMemorial.finalDeadlineDate}.`,
      })
    }
  }

  return (
    <div className="space-y-5">
      {/* View Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'memorial' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('memorial')}
            className={
              activeTab === 'memorial' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300'
            }
          >
            <Scale className="w-4 h-4 mr-1.5" />
            Memorial Explicável Oficial
          </Button>
          <Button
            variant={activeTab === 'simulator' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('simulator')}
            className={
              activeTab === 'simulator'
                ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-900/40'
                : 'text-slate-300'
            }
          >
            <Sliders className="w-4 h-4 mr-1.5 text-purple-300" />
            Simulador Temporal (&quot;E Se?&quot;)
          </Button>
        </div>

        {!readOnly && onApproveDeadline && (
          <Button
            onClick={handleApprove}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 shadow-md shadow-emerald-950 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Homologar & Distribuir Prazo
          </Button>
        )}
      </div>

      {activeTab === 'memorial' ? (
        /* OFFICIAL MEMORIAL VIEW */
        <div className="space-y-5">
          {/* Top Summary Banner */}
          <div className="rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-5 nox-glass-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-cyan-500/40 text-cyan-300 bg-cyan-950/40 text-xs font-mono"
                  >
                    {officialMemorial.ruleVersion}
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">
                    Nível de Confiança:{' '}
                    <strong className="text-emerald-400">
                      {officialMemorial.confidenceLevel} (
                      {Math.round(officialMemorial.confidenceScore * 100)}%)
                    </strong>
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-100">
                  {officialMemorial.legalRuleName}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {officialMemorial.legalRuleArticle}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center min-w-[120px]">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Prazo Interno
                  </div>
                  <div className="text-sm font-bold text-amber-400 font-mono">
                    {officialMemorial.internalDeadlineDate}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">Garantia D-2</div>
                </div>

                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-center min-w-[140px] shadow-lg shadow-rose-950/40">
                  <div className="text-[10px] font-mono uppercase text-rose-300 font-semibold">
                    Vencimento Fatal
                  </div>
                  <div className="text-lg font-black text-rose-400 font-mono">
                    {officialMemorial.finalDeadlineDate}
                  </div>
                  <div className="text-[9px] text-rose-300/80 font-mono">
                    {officialMemorial.finalDeadlineTime || '23:59:59'}
                  </div>
                </div>
              </div>
            </div>

            {/* Origin Text Quote */}
            <div className="mt-4 p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Texto Original da Intimação / Publicação:
              </div>
              <blockquote className="italic text-slate-200 border-l-2 border-cyan-500 pl-2">
                &quot;{officialMemorial.originText}&quot;
              </blockquote>
            </div>
          </div>

          {/* Legal Rules Preset Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {LEGAL_RULES_PRESETS.slice(0, 4).map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedPresetId === preset.id
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/30 text-cyan-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold truncate">{preset.name}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">{preset.article}</div>
                <div className="text-[11px] font-mono mt-1 text-cyan-400 font-semibold">
                  {preset.daysCount} dias {preset.daysType}
                </div>
              </button>
            ))}
          </div>

          {/* Step-by-Step Memorial Table */}
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Passos Explicáveis da Contagem Temporal ({
                  officialMemorial.calculationSteps.length
                }{' '}
                etapas)
              </h4>
              <Badge variant="outline" className="text-[10px] font-mono text-slate-400">
                {officialMemorial.tribunal} / {officialMemorial.comarca}
              </Badge>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs">
              {officialMemorial.calculationSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`py-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded transition-colors ${
                    !step.isBusinessDay
                      ? 'bg-slate-950/40 text-slate-400'
                      : 'hover:bg-slate-950/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-mono text-[11px] text-slate-500">
                      #{step.stepNumber}
                    </span>
                    <div className="font-mono text-cyan-400 font-semibold">{step.date}</div>
                    <span className="text-slate-400 text-[11px]">({step.dayOfWeek})</span>
                    <span className="font-medium text-slate-200">{step.description}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {step.isBusinessDay ? (
                      <Badge className="bg-emerald-950/80 text-emerald-400 border-emerald-800 text-[10px] font-mono">
                        ÚTIL
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-950/80 text-amber-300 border-amber-800 text-[10px] font-mono">
                        SUSPENSO ({step.reasonIfNotBusinessDay || 'Fim de semana'})
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* SIMULATOR TEMPORAL VIEW */
        <div className="space-y-5 rounded-xl bg-purple-950/10 border border-purple-800/40 p-5 nox-glass-card">
          <div className="flex items-center justify-between border-b border-purple-800/40 pb-3">
            <div>
              <h3 className="text-sm font-bold text-purple-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Simulador de Hipóteses Temporais (Isolado do Cálculo Oficial)
              </h3>
              <p className="text-xs text-purple-300/70 mt-0.5">
                Simule variações de marco inicial, prazo em dias e suspensões repentinas sem alterar
                o dossiê do processo.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSimInitialDate(initialDate)
                setSimDaysCount(15)
                setSimDaysType('uteis')
                setSimSuspensionsList([])
                toast.info('Simulador resetado para valores padrão.')
              }}
              className="text-xs border-purple-800 text-purple-300 hover:bg-purple-950"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Resetar Cenário
            </Button>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 font-mono text-[11px]">
                Marco Inicial Hipotético
              </Label>
              <Input
                type="date"
                value={simInitialDate}
                onChange={(e) => setSimInitialDate(e.target.value)}
                className="bg-slate-950 border-purple-800/60 text-slate-100 h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 font-mono text-[11px]">Quantidade de Dias</Label>
              <Input
                type="number"
                value={simDaysCount}
                onChange={(e) => setSimDaysCount(Number(e.target.value))}
                min={1}
                max={90}
                className="bg-slate-950 border-purple-800/60 text-slate-100 h-9 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 font-mono text-[11px]">
                Contagem (Úteis vs Corridos)
              </Label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSimDaysType('uteis')}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-mono font-semibold border ${
                    simDaysType === 'uteis'
                      ? 'bg-purple-900/60 text-purple-200 border-purple-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Dias Úteis
                </button>
                <button
                  type="button"
                  onClick={() => setSimDaysType('corridos')}
                  className={`flex-1 py-1.5 px-2 rounded text-xs font-mono font-semibold border ${
                    simDaysType === 'corridos'
                      ? 'bg-purple-900/60 text-purple-200 border-purple-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Dias Corridos
                </button>
              </div>
            </div>
          </div>

          {/* Add custom suspension */}
          <div className="p-3 rounded-lg bg-slate-950/70 border border-purple-900/40 space-y-2">
            <div className="text-[11px] font-mono text-purple-300 font-semibold uppercase flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Adicionar Suspensão de Expediente / Feriado Local Hipotético:
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="date"
                value={simCustomSuspensionDate}
                onChange={(e) => setSimCustomSuspensionDate(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 h-8 sm:w-44 text-xs font-mono"
              />
              <Input
                type="text"
                placeholder="Ex: Falha no Sistema PJe / Feriado Municipal"
                value={simCustomSuspensionName}
                onChange={(e) => setSimCustomSuspensionName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 h-8 text-xs flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddSimSuspension}
                className="h-8 text-xs bg-purple-700 hover:bg-purple-600 text-white font-semibold"
              >
                + Inserir
              </Button>
            </div>
          </div>

          {/* Compare Result Comparison Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800">
              <div className="text-xs font-mono text-slate-400 uppercase">
                Cenário Oficial Atual
              </div>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
                {officialMemorial.finalDeadlineDate}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {officialMemorial.legalRuleName} ({officialMemorial.daysCount} dias{' '}
                {officialMemorial.daysType})
              </p>
            </div>

            <div className="p-4 rounded-lg bg-purple-950/40 border border-purple-700 shadow-lg shadow-purple-950/40">
              <div className="text-xs font-mono text-purple-300 uppercase font-semibold">
                Cenário Simulado
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono mt-1">
                {simulatedMemorial.finalDeadlineDate}
              </div>
              <p className="text-xs text-purple-400 mt-1">
                Diferença de{' '}
                <strong className="text-white">
                  {simulatedMemorial.finalDeadlineDate !== officialMemorial.finalDeadlineDate
                    ? 'Datas Divergentes (Atenção ao Risco)'
                    : 'Mesma Data Final'}
                </strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
