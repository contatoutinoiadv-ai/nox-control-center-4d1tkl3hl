import React, { useState } from 'react'
import {
  ShieldAlert,
  Clock,
  Calendar,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Bot,
  User,
  History,
  FileCheck,
} from 'lucide-react'
import { CustodyChain, CustodyTimelineStep, CommunicationStatus } from '@/types/sentinela'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CustodyChainTimelineProps {
  custody: CustodyChain
  compact?: boolean
  onExportAudit?: () => void
}

const STAGE_LABELS: Record<CommunicationStatus, { label: string; color: string; desc: string }> = {
  CAPTURADA: {
    label: '1. Capturada',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    desc: 'Captura íntegra com hash SHA-256',
  },
  VALIDADA: {
    label: '2. Validada',
    color: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    desc: 'Sanitização e proteção anti-injection',
  },
  VINCULADA_AO_PROCESSO: {
    label: '3. Vinculada ao Processo',
    color: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    desc: 'Associação CNJ confirmada',
  },
  ANALISADA: {
    label: '4. Analisada',
    color: 'bg-purple-950 text-purple-300 border-purple-800',
    desc: 'Classificação preliminar por IA',
  },
  REVISAO_HUMANA: {
    label: '5. Revisão Humana',
    color: 'bg-amber-950 text-amber-300 border-amber-800',
    desc: 'Homologação por advogado sênior',
  },
  PRAZO_TAREFA_AGENDA: {
    label: '6. Prazo/Tarefa/Agenda',
    color: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    desc: 'Artefatos gerados sincronizadamente',
  },
  CONCLUIDA: {
    label: '7. Concluída',
    color: 'bg-teal-950 text-teal-300 border-teal-800',
    desc: 'Trilha integralmente cumprida',
  },
}

export const CustodyChainTimeline: React.FC<CustodyChainTimelineProps> = ({
  custody,
  compact = false,
  onExportAudit,
}) => {
  const [expandedDetails, setExpandedDetails] = useState<boolean>(!compact)
  const [selectedStep, setSelectedStep] = useState<CustodyTimelineStep | null>(
    custody.timeline[0] || null,
  )

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(custody, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute(
      'download',
      `cadeia_custodia_${custody.communicationId}_${Date.now()}.json`,
    )
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast.success('Certidão de Cadeia de Custódia exportada com sucesso (JSON Auditável).')
  }

  return (
    <div className="rounded-xl bg-slate-900/90 border border-slate-800/80 p-4 sm:p-5 space-y-4 nox-glass-card">
      {/* Header with Title and Hash */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
              Cadeia de Custódia Operacional
              <Badge
                variant="outline"
                className="text-[10px] font-mono text-cyan-400 border-cyan-800/60 bg-cyan-950/40"
              >
                HASH SHA-256
              </Badge>
            </h4>
            <p className="text-[11px] font-mono text-slate-400 truncate max-w-xs sm:max-w-md">
              {custody.snapshot.hashSha256}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="h-7 text-[11px] bg-slate-950/60 border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            Certidão de Custódia
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedDetails(!expandedDetails)}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200"
          >
            {expandedDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Snapshot Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Fonte de Entrada</div>
          <div className="font-semibold text-slate-200 mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            {custody.snapshot.source} ({custody.snapshot.externalId})
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Anti-Prompt Injection
          </div>
          <div className="font-semibold text-emerald-400 mt-0.5 flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-emerald-400" />
            {custody.snapshot.promptInjectionCheck.clean ? 'Limpo (0% Risco)' : 'Alerta'}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Confiança do Classificador
          </div>
          <div className="font-semibold text-cyan-300 font-mono mt-0.5">
            {Math.round(custody.confidence * 100)}% ({custody.suggestedClassification})
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Revisão Humana</div>
          <div className="font-semibold mt-0.5 flex items-center gap-1.5">
            {custody.reviewedBy ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3" /> {custody.reviewedBy}
              </span>
            ) : custody.humanReviewRequired ? (
              <span className="text-amber-400 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> Obrigatória
              </span>
            ) : (
              <span className="text-slate-400">Automático</span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Timeline Stages Flow */}
      {expandedDetails && (
        <div className="space-y-4 pt-2">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-cyan-400" />
            Trilha Imutável de Decisão e Execução ({custody.timeline.length} passos registrados)
          </div>

          {/* Interactive Steps List */}
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-purple-500 before:to-emerald-500">
            {custody.timeline.map((step, idx) => {
              const meta = STAGE_LABELS[step.stage] || {
                label: step.stage,
                color: 'bg-slate-800 text-slate-300',
                desc: '',
              }
              const isSelected = selectedStep?.id === step.id

              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStep(step)}
                  className={`relative p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-950 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  {/* Step Dot */}
                  <span
                    className={`absolute -left-[29px] top-3.5 w-3 h-3 rounded-full border-2 ${
                      isSelected
                        ? 'bg-cyan-400 border-cyan-200 ring-4 ring-cyan-500/20'
                        : 'bg-slate-900 border-cyan-500'
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono px-2 py-0.5 ${meta.color}`}
                      >
                        {meta.label}
                      </Badge>
                      <span className="font-semibold text-slate-200">{step.actionSummary}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(step.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Actor details */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      {step.actorRole === 'SISTEMA_IA' ? (
                        <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className="text-slate-300 font-medium">{step.actor}</span>
                      <span className="text-slate-500 font-mono">({step.actorRole})</span>
                    </div>

                    {step.legalBasis && (
                      <span className="text-purple-300 font-mono text-[10px] bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/50">
                        {step.legalBasis}
                      </span>
                    )}
                  </div>

                  {step.justification && (
                    <div className="mt-2 p-2 rounded bg-slate-900/80 border border-slate-800 text-xs text-slate-300 italic">
                      &quot;{step.justification}&quot;
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Generated Artifacts Summary */}
          {(custody.generatedArtifacts.deadlineId ||
            custody.generatedArtifacts.taskId ||
            custody.generatedArtifacts.agendaId) && (
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono">
                <FileCheck className="w-4 h-4" />
                Artefatos Sincronizados Gerados:
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                {custody.generatedArtifacts.deadlineId && (
                  <Badge
                    variant="outline"
                    className="border-emerald-800 text-emerald-300 bg-emerald-950/40"
                  >
                    Prazo #{custody.generatedArtifacts.deadlineId}
                  </Badge>
                )}
                {custody.generatedArtifacts.taskId && (
                  <Badge
                    variant="outline"
                    className="border-emerald-800 text-emerald-300 bg-emerald-950/40"
                  >
                    Tarefa #{custody.generatedArtifacts.taskId}
                  </Badge>
                )}
                {custody.generatedArtifacts.agendaId && (
                  <Badge
                    variant="outline"
                    className="border-emerald-800 text-emerald-300 bg-emerald-950/40"
                  >
                    Agenda #{custody.generatedArtifacts.agendaId}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
