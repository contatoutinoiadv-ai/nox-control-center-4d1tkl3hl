import React from 'react'
import { CalendarDays, ChevronsLeft, ChevronsRight, RefreshCw, Scale } from 'lucide-react'
import { SentinelaCommunication } from '@/types/sentinela'
import { useCursorGlow } from './visualKit'

/* ============================================================
   Camada de apresentação da lista de publicações da Consulta
   Pública (apenas esta página, sem alterar /sentinela)
   ============================================================ */

const formatarDataBr = (iso?: string): string => {
  if (!iso) return 'não informada'
  const match = String(iso).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  return String(iso)
}

export const publicationTypeTone = (comm: SentinelaCommunication) => {
  const tipo = String(comm.tipoComunicacao || 'INTIMACAO')
  const isCit = tipo.includes('CIT')
  const isUrg = comm.urgencyLevel === 'alta' || comm.urgencyLevel === 'critica'
  if (isUrg) return { key: 'urgente', color: '#E11D48', label: 'Prazo crítico' }
  if (isCit) return { key: 'citacao', color: '#22D3EE', label: 'Citação' }
  return { key: 'intimacao', color: '#F5B301', label: 'Intimação' }
}

export const PublicationCard: React.FC<{
  comm: SentinelaCommunication
  index: number
  expanded: boolean
  reducedMotion: boolean
  onToggle: () => void
}> = ({ comm, index, expanded, reducedMotion, onToggle }) => {
  const tone = publicationTypeTone(comm)
  const tipo = String(comm.tipoComunicacao || 'INTIMACAO')
  const teor = comm.teorCompleto || comm.teorResumido || 'Teor não informado.'
  const teorVisivel = expanded || teor.length <= 320
  const glowRef = useCursorGlow<HTMLElement>()

  return (
    <article
      ref={glowRef}
      className="nox-pub-card nox-cascade-item p-4 pl-5 space-y-3"
      style={{
        animationDelay: reducedMotion ? undefined : `${Math.min(index * 40, 800)}ms`,
      }}
    >
      <span className="nox-metric-glow" aria-hidden />
      <span
        className="nox-pub-stripe"
        style={{ background: tone.color, boxShadow: `0 0 8px ${tone.color}66` }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="nox-chip"
            style={{
              borderColor: `${tone.color}55`,
              color: tone.color,
              background: `${tone.color}12`,
            }}
          >
            {tone.label}
          </span>
          <span
            className="nox-chip"
            style={{
              borderColor: 'rgba(34,211,238,0.35)',
              color: '#67E8F9',
              background: 'rgba(34,211,238,0.06)',
            }}
          >
            <Scale className="w-3 h-3" />
            {comm.tribunal || 'DJEN'} · {comm.orgaoJulgador || 'Órgão Julgador'}
          </span>
          {comm.urgencyLevel === 'alta' || comm.urgencyLevel === 'critica' ? (
            <span
              className="nox-chip"
              style={{
                borderColor: 'rgba(225,29,72,0.55)',
                color: '#FDA4AF',
                background: 'rgba(225,29,72,0.08)',
              }}
            >
              {String(comm.urgencyLevel || '').toUpperCase()}
            </span>
          ) : null}
          <span className="text-xs font-mono font-bold text-slate-100">
            {comm.numeroProcesso || 'Processo sem número'}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed bg-[#04060C]/80 p-2.5 rounded-lg border border-slate-800/70 whitespace-pre-line">
        {teorVisivel ? teor : `${teor.slice(0, 320)}...`}
      </p>

      {teor.length > 320 && (
        <button
          onClick={onToggle}
          className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          {expanded ? 'Recolher teor' : 'Ver teor completo'}
        </button>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/50">
        <span>
          Destinatário:{' '}
          <span className="text-slate-200">{comm.destinatario || 'não informado'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 text-[#F5B301]" />
          Disponibilizado em:{' '}
          <span className="text-[#F5B301]">{formatarDataBr(comm.dataDisponibilizacao)}</span>
        </span>
      </div>
    </article>
  )
}

export const PaginationFooter: React.FC<{
  first: number
  last: number
  total: number
  totalApi: number | null
  paginaLocal: number
  totalPaginas: number
  canLoadMore: boolean
  isLoadingMore: boolean
  proximaPagina: number
  onPrev: () => void
  onNext: () => void
  onLoadMore: () => void
}> = ({
  first,
  last,
  total,
  totalApi,
  paginaLocal,
  totalPaginas,
  canLoadMore,
  isLoadingMore,
  proximaPagina,
  onPrev,
  onNext,
  onLoadMore,
}) => (
  <div className="nox-glass relative rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs font-mono">
    <span className="nox-corner nox-corner-tl" />
    <span className="nox-corner nox-corner-tr" />
    <span className="nox-corner nox-corner-bl" />
    <span className="nox-corner nox-corner-br" />
    <div className="text-slate-400 flex items-center gap-2 flex-wrap">
      <span>
        Exibindo <span className="text-slate-200">{first}</span> a{' '}
        <span className="text-slate-200">{last}</span> de{' '}
        <span className="text-[#F5B301] font-bold">{total}</span>
      </span>
      {totalApi !== null && (
        <span className="text-slate-500">
          · Total na base: <span className="text-cyan-300">{totalApi}</span>
        </span>
      )}
    </div>
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      {canLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cyan-800/70 text-cyan-300 hover:bg-cyan-950/50 transition-colors disabled:opacity-40 text-[11px]"
        >
          {isLoadingMore ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full border border-cyan-300 border-t-transparent animate-spin" />
              Carregando
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3" />
              Carregar mais ({total}/{totalApi})
            </>
          )}
        </button>
      )}
      <button
        onClick={onPrev}
        disabled={paginaLocal <= 1}
        aria-label="Página anterior"
        className="p-1.5 rounded-md border border-slate-700/70 text-slate-300 hover:border-amber-500/60 disabled:opacity-30 transition-colors"
      >
        <ChevronsLeft className="w-3.5 h-3.5" />
      </button>
      <span className="px-1 text-slate-400 text-[11px]">
        {paginaLocal}/{totalPaginas}
      </span>
      <button
        onClick={onNext}
        disabled={paginaLocal >= totalPaginas}
        aria-label="Próxima página"
        className="p-1.5 rounded-md border border-slate-700/70 text-slate-300 hover:border-amber-500/60 disabled:opacity-30 transition-colors"
      >
        <ChevronsRight className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
)

export default { PublicationCard, PaginationFooter }
