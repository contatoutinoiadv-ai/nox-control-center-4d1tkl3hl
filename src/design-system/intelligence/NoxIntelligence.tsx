import React from 'react'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  FileText,
  Activity,
} from 'lucide-react'
import { NoxCard } from '../components/NoxCards'

export interface NoxIntelligenceProps {
  title: string
  description?: string
  confidence?: 'alta' | 'media' | 'baixa'
  sourceModel?: string
  actionLabel?: string
  onAction?: () => void
  children?: React.ReactNode
  className?: string
}

/**
 * Assinatura Visual Oficial da IA NOX
 * Permite distinguir determinismo de inferência de IA sem carnaval visual.
 */
export const NoxAiSignature: React.FC<{
  sourceModel?: string
  confidence?: 'alta' | 'media' | 'baixa'
  className?: string
}> = ({ sourceModel = 'IA NOX', confidence, className }) => {
  const confidenceLabels = {
    alta: 'Alta Confiança',
    media: 'Confiança Média',
    baixa: 'Baixa Confiança (Revisar)',
  }

  const confidenceColors = {
    alta: 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40',
    media: 'text-amber-400 border-amber-800/80 bg-amber-950/40',
    baixa: 'text-rose-400 border-rose-800/80 bg-rose-950/40',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-950/40 text-[10px] font-mono text-purple-300 select-none shadow-sm',
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
        <span className="font-bold tracking-wider">{sourceModel}</span>
      </div>
      {confidence && (
        <>
          <span className="text-purple-600">&bull;</span>
          <span
            className={cn(
              'px-1.5 py-0 rounded text-[9px] font-semibold border',
              confidenceColors[confidence],
            )}
          >
            {confidenceLabels[confidence]}
          </span>
        </>
      )}
    </div>
  )
}

/**
 * NoxInsight: Destaque analítico gerado por IA com tom neutro e tecnológico
 */
export const NoxInsight: React.FC<NoxIntelligenceProps> = ({
  title,
  description,
  confidence,
  sourceModel,
  actionLabel,
  onAction,
  children,
  className,
}) => {
  return (
    <NoxCard
      variant="surface"
      className={cn(
        'border-l-2 border-l-purple-500 bg-gradient-to-r from-purple-950/15 via-[#080d1a] to-[#080d1a] space-y-2.5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <h4 className="text-xs font-bold text-slate-100 font-mono tracking-tight uppercase">
            {title}
          </h4>
        </div>
        <NoxAiSignature confidence={confidence} sourceModel={sourceModel} />
      </div>

      {description && (
        <p className="text-xs text-slate-300 leading-relaxed font-sans">{description}</p>
      )}

      {children}

      {actionLabel && onAction && (
        <div className="pt-1 flex justify-end">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-purple-300 hover:text-purple-200 transition-colors"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </NoxCard>
  )
}

/**
 * NoxRecommendation: Sugestão de ação ou conduta processual recomendada
 */
export const NoxRecommendation: React.FC<NoxIntelligenceProps> = ({
  title,
  description,
  confidence,
  sourceModel,
  actionLabel,
  onAction,
  children,
  className,
}) => {
  return (
    <NoxCard
      variant="surface"
      className={cn(
        'border-l-2 border-l-cyan-400 bg-gradient-to-r from-cyan-950/20 via-[#080d1a] to-[#080d1a] space-y-2.5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0" />
          <h4 className="text-xs font-bold text-cyan-300 font-mono tracking-tight uppercase">
            {title}
          </h4>
        </div>
        <NoxAiSignature confidence={confidence} sourceModel={sourceModel} />
      </div>

      {description && (
        <p className="text-xs text-slate-300 leading-relaxed font-sans">{description}</p>
      )}

      {children}

      {actionLabel && onAction && (
        <div className="pt-1 flex justify-end">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </NoxCard>
  )
}

/**
 * NoxRisk: Apontamento de risco processual, probatório ou temporal
 */
export const NoxRisk: React.FC<
  NoxIntelligenceProps & { severity?: 'critico' | 'alto' | 'moderado' | 'baixo' }
> = ({
  title,
  description,
  severity = 'alto',
  confidence,
  sourceModel,
  actionLabel,
  onAction,
  children,
  className,
}) => {
  const severityColors = {
    critico: 'border-l-rose-500 from-rose-950/30 text-rose-300',
    alto: 'border-l-amber-500 from-amber-950/30 text-amber-300',
    moderado: 'border-l-yellow-500 from-yellow-950/20 text-yellow-300',
    baixo: 'border-l-slate-500 from-slate-900/30 text-slate-300',
  }

  return (
    <NoxCard
      variant="surface"
      className={cn(
        'border-l-2 bg-gradient-to-r via-[#080d1a] to-[#080d1a] space-y-2.5',
        severityColors[severity],
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <h4 className="text-xs font-bold font-mono tracking-tight uppercase text-slate-100">
            {title}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 font-bold">
            RISCO {severity.toUpperCase()}
          </span>
          <NoxAiSignature confidence={confidence} sourceModel={sourceModel} />
        </div>
      </div>

      {description && (
        <p className="text-xs text-slate-300 leading-relaxed font-sans">{description}</p>
      )}

      {children}

      {actionLabel && onAction && (
        <div className="pt-1 flex justify-end">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-rose-300 hover:text-rose-200 transition-colors"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </NoxCard>
  )
}
