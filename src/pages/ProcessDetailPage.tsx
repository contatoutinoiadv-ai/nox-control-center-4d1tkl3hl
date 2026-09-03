import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  FileText,
  Activity,
  Layers,
  Building2,
  Calendar,
  Lock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  SlidersHorizontal,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { SIGILO_DESCRICOES, datajudService } from '@/services/datajudService'
import { Badge } from '@/components/ui/badge'

/**
 * Espelha o schema real da collection `movimentacoes_processo`
 */
interface ComplementoMovimento {
  codigo?: number
  nome?: string
  valor?: unknown
  descricao?: string
}

interface MovimentacaoProcesso {
  id: string
  numero_processo: string
  tribunal_alias: string
  datajud_id?: string
  codigo_movimento: number
  nome_movimento: string
  data_hora_movimento: string
  orgao_codigo_movimento?: number
  orgao_nome_movimento?: string
  complementos_json?: ComplementoMovimento[] | null
  nivel_sigilo_processo: number
  hash_dedup: string
  sigilo_descricao?: string
  created?: string
}

/**
 * Espelha o schema real da collection `sentinela_communications`
 */
interface SentinelaCommunicationRecord {
  id: string
  external_id?: string
  source?: string
  numero_processo: string
  tribunal?: string
  orgao_julgador?: string
  destinatario?: string
  tipo_comunicacao?: string
  data_disponibilizacao?: string
  data_publicacao?: string
  teor_resumido?: string
  teor_completo?: string
  status?: string
  triage_category?: string
  urgency_level?: string
  risk_score?: number
  assigned_to?: string
  created?: string
}

/**
 * Evento unificado da linha do tempo do processo.
 * Pode ser um movimento do DataJud ou uma publicação/comunicação do Sentinela.
 */
type TimelineEvent =
  | {
      id: string
      tipo: 'datajud'
      dataOrdenacao: string
      datajud: MovimentacaoProcesso
    }
  | {
      id: string
      tipo: 'sentinela'
      dataOrdenacao: string
      sentinela: SentinelaCommunicationRecord
    }

/** Normaliza o JSON de complementos, que pode chegar como string ou array. */
function parseComplementos(raw: MovimentacaoProcesso['complementos_json']): ComplementoMovimento[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** Texto do complemento em ordem de prioridade: valor, descrição, nome. */
function textoComplemento(comp: ComplementoMovimento): string {
  const partes: string[] = []
  const rotulo = comp.nome || comp.descricao || ''
  const valor =
    comp.valor !== undefined && comp.valor !== null && String(comp.valor).trim() !== ''
      ? String(comp.valor)
      : ''
  if (rotulo) partes.push(rotulo)
  if (valor && valor !== rotulo) partes.push(valor)
  return partes.join(': ')
}

/** Formata data de forma amigável com fallback seguro. */
function formatarDataIso(iso?: string): string {
  if (!iso) return 'Data não informada'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Página de detalhe de um processo.
 * Exibe a linha do tempo cronológica unificada (DataJud + Sentinela),
 * mais antiga primeiro, permitindo visualizar tanto os atos técnicos processuais
 * quanto o teor real das publicações/decisões.
 */
export default function ProcessDetailPage() {
  const { numeroProcesso } = useParams<{ numeroProcesso: string }>()
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoProcesso[]>([])
  const [comunicacoes, setComunicacoes] = useState<SentinelaCommunicationRecord[]>([])
  const [carregando, setCarregando] = useState(true)
  const [sincronizandoPublicacoes, setSincronizandoPublicacoes] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'datajud' | 'sentinela'>('todos')
  const [expandedTeors, setExpandedTeors] = useState<Record<string, boolean>>({})

  // Reseta sempre para 'todos' ao trocar de processo ou montar
  useEffect(() => {
    setFiltroTipo('todos')
  }, [numeroProcesso])

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        setCarregando(true)
        setErro(null)

        const procNum = numeroProcesso?.trim() ?? ''
        const procLimpo = datajudService.limparNumeroProcesso(procNum)
        const procFormatado = datajudService.formatarNumeroProcesso(procNum)

        const variantes = Array.from(new Set([procNum, procFormatado, procLimpo].filter(Boolean)))

        let filterExpr = ''
        if (variantes.length === 1) {
          filterExpr = pb.filter('numero_processo = {:v0}', { v0: variantes[0] })
        } else if (variantes.length === 2) {
          filterExpr = pb.filter('numero_processo = {:v0} || numero_processo = {:v1}', {
            v0: variantes[0],
            v1: variantes[1],
          })
        } else {
          filterExpr = pb.filter(
            'numero_processo = {:v0} || numero_processo = {:v1} || numero_processo = {:v2}',
            {
              v0: variantes[0],
              v1: variantes[1],
              v2: variantes[2],
            },
          )
        }

        // 1. Busca paralela das duas coleções no PocketBase com filtro tolerante
        const [resMovs, resComms] = await Promise.allSettled([
          pb.collection('movimentacoes_processo').getFullList<MovimentacaoProcesso>({
            filter: filterExpr,
            sort: 'data_hora_movimento',
          }),
          pb.collection('sentinela_communications').getFullList<SentinelaCommunicationRecord>({
            filter: filterExpr,
            sort: 'data_disponibilizacao',
          }),
        ])

        if (!ativo) return

        let loadedMovs: MovimentacaoProcesso[] = []
        let loadedComms: SentinelaCommunicationRecord[] = []
        let falhaTotal = true

        if (resMovs.status === 'fulfilled') {
          loadedMovs = resMovs.value
          falhaTotal = false
        } else {
          console.warn(
            '[ProcessDetailPage] Falha ao carregar movimentacoes_processo:',
            resMovs.reason,
          )
        }

        if (resComms.status === 'fulfilled') {
          loadedComms = resComms.value
          falhaTotal = false
        } else {
          console.warn(
            '[ProcessDetailPage] Falha ao carregar sentinela_communications:',
            resComms.reason,
          )
        }

        if (falhaTotal) {
          setErro('Não foi possível carregar as informações do processo.')
        } else {
          // Se não encontrou publicações no PocketBase, tenta puxar do dataStore/DJEN em segundo plano
          if (loadedComms.length === 0 && procNum) {
            try {
              const vinculadas = await datajudService.puxarPublicacoesProcesso(procNum)
              if (vinculadas > 0 && ativo) {
                const recarregadas = await pb
                  .collection('sentinela_communications')
                  .getFullList<SentinelaCommunicationRecord>({
                    filter: filterExpr,
                    sort: 'data_disponibilizacao',
                  })
                loadedComms = recarregadas
              }
            } catch (puxarErr) {
              console.warn(
                '[ProcessDetailPage] Aviso ao puxar publicações em background:',
                puxarErr,
              )
            }
          }

          setMovimentacoes(loadedMovs)
          setComunicacoes(loadedComms)
        }
      } catch (e) {
        if (ativo) {
          console.error('[ProcessDetailPage] Erro inesperado ao carregar:', e)
          setErro('Erro ao processar dados do processo.')
        }
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [numeroProcesso])

  // 2. Unificação e ordenação cronológica: do mais antigo para o mais recente (oldest first)
  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const listaDatajud: TimelineEvent[] = movimentacoes.map((m) => ({
      id: `dj_${m.id}`,
      tipo: 'datajud',
      dataOrdenacao: m.data_hora_movimento || m.created || '',
      datajud: m,
    }))

    const listaSentinela: TimelineEvent[] = comunicacoes.map((c) => ({
      id: `sent_${c.id}`,
      tipo: 'sentinela',
      // Prioridade: data_disponibilizacao > data_publicacao > created
      dataOrdenacao: c.data_disponibilizacao || c.data_publicacao || c.created || '',
      sentinela: c,
    }))

    const unificados = [...listaDatajud, ...listaSentinela]

    // Ordenação cronológica estrita (ascendente: oldest first)
    unificados.sort((a, b) => {
      const timeA = a.dataOrdenacao ? new Date(a.dataOrdenacao).getTime() : 0
      const timeB = b.dataOrdenacao ? new Date(b.dataOrdenacao).getTime() : 0
      return timeA - timeB
    })

    return unificados
  }, [movimentacoes, comunicacoes])

  // Filtragem conforme toggle
  const filteredEvents = useMemo(() => {
    if (filtroTipo === 'datajud') return timelineEvents.filter((ev) => ev.tipo === 'datajud')
    if (filtroTipo === 'sentinela') return timelineEvents.filter((ev) => ev.tipo === 'sentinela')
    return timelineEvents
  }, [timelineEvents, filtroTipo])

  const handlePuxarPublicacoes = async () => {
    if (!numeroProcesso || sincronizandoPublicacoes) return
    setSincronizandoPublicacoes(true)
    try {
      await datajudService.puxarPublicacoesProcesso(numeroProcesso)
      const procLimpo = datajudService.limparNumeroProcesso(numeroProcesso)
      const procFormatado = datajudService.formatarNumeroProcesso(numeroProcesso)
      const variantes = Array.from(
        new Set([numeroProcesso, procFormatado, procLimpo].filter(Boolean)),
      )

      let filterExpr = ''
      if (variantes.length === 1) {
        filterExpr = pb.filter('numero_processo = {:v0}', { v0: variantes[0] })
      } else if (variantes.length === 2) {
        filterExpr = pb.filter('numero_processo = {:v0} || numero_processo = {:v1}', {
          v0: variantes[0],
          v1: variantes[1],
        })
      } else {
        filterExpr = pb.filter(
          'numero_processo = {:v0} || numero_processo = {:v1} || numero_processo = {:v2}',
          {
            v0: variantes[0],
            v1: variantes[1],
            v2: variantes[2],
          },
        )
      }

      const recs = await pb
        .collection('sentinela_communications')
        .getFullList<SentinelaCommunicationRecord>({
          filter: filterExpr,
          sort: 'data_disponibilizacao',
        })
      setComunicacoes(recs)
    } catch (err) {
      console.error('[ProcessDetailPage] Erro ao sincronizar publicações sob demanda:', err)
    } finally {
      setSincronizandoPublicacoes(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedTeors((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Dados auxiliares para o cabeçalho
  const tribunalDestaque =
    movimentacoes[0]?.tribunal_alias?.toUpperCase() ||
    comunicacoes[0]?.tribunal?.toUpperCase() ||
    'TJ'
  const orgaoDestaque =
    movimentacoes[0]?.orgao_nome_movimento || comunicacoes[0]?.orgao_julgador || 'Órgão judicial'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Navegação e Cabeçalho */}
      <header className="mb-6">
        <Link
          to="/processos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
        >
          ← Voltar para a lista de processos
        </Link>

        <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px] uppercase font-mono px-2 py-0.5">
                {tribunalDestaque}
              </Badge>
              <span className="text-xs text-slate-400 font-mono">• {orgaoDestaque}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-100 font-mono">
              Processo {numeroProcesso}
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Linha do tempo cronológica unificada: atos e movimentações do tribunal (DataJud) e o
              teor completo das publicações do diário oficial (Sentinela).
            </p>
          </div>

          {/* Resumo de contagem e botão de pull manual */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 font-mono text-xs flex-wrap">
            <span className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-cyan-300">
              <span className="font-bold">{movimentacoes.length}</span> DataJud
            </span>
            <span className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-amber-300">
              <span className="font-bold">{comunicacoes.length}</span> Publicações
            </span>
            <button
              type="button"
              onClick={handlePuxarPublicacoes}
              disabled={sincronizandoPublicacoes}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition-colors disabled:opacity-50"
              title="Buscar e sincronizar publicações do diário oficial para este processo"
            >
              <RefreshCw
                className={`w-3 h-3 ${sincronizandoPublicacoes ? 'animate-spin text-cyan-400' : ''}`}
              />
              <span>{sincronizandoPublicacoes ? 'Puxando...' : 'Puxar Publicações'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros Rápidos */}
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-slate-400 mr-1">Filtrar fluxo:</span>
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filtroTipo === 'todos'
                  ? 'bg-slate-800 text-white font-bold ring-1 ring-slate-700'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos ({timelineEvents.length})
            </button>
            <button
              onClick={() => setFiltroTipo('datajud')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                filtroTipo === 'datajud'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold ring-1 ring-cyan-700'
                  : 'bg-slate-900/60 text-slate-400 hover:text-cyan-300'
              }`}
            >
              <Activity className="w-3 h-3 text-cyan-400" />
              DataJud ({movimentacoes.length})
            </button>
            <button
              onClick={() => setFiltroTipo('sentinela')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                filtroTipo === 'sentinela'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800 font-bold ring-1 ring-amber-700'
                  : 'bg-slate-900/60 text-slate-400 hover:text-amber-300'
              }`}
            >
              <FileText className="w-3 h-3 text-amber-400" />
              Publicações ({comunicacoes.length})
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Ordenado da mais antiga para a mais recente (cronológico)
          </span>
        </div>
      </header>

      {/* Conteúdo da Linha do Tempo */}
      <section aria-label="Linha do tempo de movimentações e comunicações">
        {carregando ? (
          <div className="py-16 text-center text-slate-400 space-y-2" role="status">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-sm font-mono">Carregando movimentações e publicações…</p>
          </div>
        ) : erro ? (
          <div
            className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-4 text-sm text-rose-300"
            role="alert"
          >
            {erro}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center space-y-4">
            {filtroTipo === 'sentinela' && movimentacoes.length > 0 ? (
              <div className="space-y-3">
                <div className="inline-flex p-3 rounded-full bg-amber-950/40 border border-amber-800/60 text-amber-300">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Nenhuma publicação encontrada para este processo
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                    O filtro "Publicações" está ativo, mas o processo possui{' '}
                    <span className="text-cyan-300 font-bold font-mono">
                      {movimentacoes.length}
                    </span>{' '}
                    movimentações registradas no DataJud.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFiltroTipo('todos')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver todos os eventos ({timelineEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipo('datajud')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-800 bg-cyan-950/60 text-cyan-300 text-xs font-medium hover:bg-cyan-900/60 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Ver apenas DataJud ({movimentacoes.length})
                  </button>
                  <button
                    type="button"
                    onClick={handlePuxarPublicacoes}
                    disabled={sincronizandoPublicacoes}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${sincronizandoPublicacoes ? 'animate-spin' : ''}`}
                    />
                    {sincronizandoPublicacoes
                      ? 'Buscando publicações...'
                      : 'Buscar publicações no DJEN'}
                  </button>
                </div>
              </div>
            ) : filtroTipo === 'datajud' && comunicacoes.length > 0 ? (
              <div className="space-y-3">
                <div className="inline-flex p-3 rounded-full bg-cyan-950/40 border border-cyan-800/60 text-cyan-300">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Nenhuma movimentação DataJud encontrada para este processo
                  </h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                    O filtro "DataJud" está ativo, mas o processo possui{' '}
                    <span className="text-amber-300 font-bold font-mono">
                      {comunicacoes.length}
                    </span>{' '}
                    publicações registradas no Sentinela.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFiltroTipo('todos')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver todos os eventos ({timelineEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipo('sentinela')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-800 bg-amber-950/60 text-amber-300 text-xs font-medium hover:bg-amber-900/60 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Ver apenas Publicações ({comunicacoes.length})
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-slate-400 text-xs">
                <SlidersHorizontal className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300 font-medium">
                  Nenhum evento encontrado para este processo com o filtro selecionado.
                </p>
                <p className="text-slate-500">
                  Tente o filtro "Todos" ou consulte os dados do tribunal na Central de Prazos.
                </p>
                {filtroTipo !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => setFiltroTipo('todos')}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    Ver todos os eventos ({timelineEvents.length})
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-slate-800 pl-6 ml-2">
            {filteredEvents.map((ev) => {
              if (ev.tipo === 'datajud') {
                const mov = ev.datajud
                const sigiloso = (mov.nivel_sigilo_processo ?? 0) > 0
                const complementos = sigiloso ? [] : parseComplementos(mov.complementos_json)

                return (
                  <li key={ev.id} className="relative group">
                    {/* Marcador na linha (Cyan para DataJud) */}
                    <span
                      className="absolute -left-[1.95rem] top-2 h-3.5 w-3.5 rounded-full bg-cyan-500 ring-4 ring-slate-950 shadow-sm shadow-cyan-500/50"
                      aria-hidden="true"
                    />

                    <article className="rounded-xl border border-slate-800/90 bg-slate-900 p-4 shadow-sm hover:border-cyan-500/30 transition-colors">
                      {/* Metadados do Movimento */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                          <Activity className="w-2.5 h-2.5" /> DataJud
                        </span>
                        {mov.tribunal_alias && (
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-300">
                            {mov.tribunal_alias}
                          </span>
                        )}
                        <time
                          dateTime={mov.data_hora_movimento}
                          className="text-xs font-mono text-slate-400 flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatarDataIso(mov.data_hora_movimento)}
                        </time>
                        {sigiloso && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 border border-amber-800 px-2 py-0.5 text-[10px] font-mono uppercase text-amber-300">
                            <Lock className="w-2.5 h-2.5" />
                            {mov.sigilo_descricao ||
                              SIGILO_DESCRICOES[mov.nivel_sigilo_processo] ||
                              'Sigilo'}
                          </span>
                        )}
                      </div>

                      {/* Nome do Movimento (SEM duplicação: apenas o título) */}
                      <h2
                        className={`mt-2.5 text-base font-semibold ${
                          sigiloso ? 'text-amber-200 italic' : 'text-slate-100'
                        }`}
                      >
                        {sigiloso ? 'Movimento protegido por sigilo' : mov.nome_movimento}
                      </h2>

                      {/* Órgão julgador */}
                      {mov.orgao_nome_movimento && (
                        <p className="mt-1 text-xs font-mono text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          Órgão: {mov.orgao_nome_movimento}
                        </p>
                      )}

                      {/* Complementos JSON do DataJud */}
                      {complementos.length > 0 && (
                        <div className="mt-3 rounded-lg border border-slate-800/90 bg-slate-950/50 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-400" />
                            Complementos do movimento
                          </p>
                          <ul className="mt-1.5 space-y-1">
                            {complementos.map((comp, idx) => {
                              const texto = textoComplemento(comp)
                              if (!texto) return null
                              return (
                                <li key={idx} className="text-xs font-mono text-slate-300 pl-1">
                                  • {texto}
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                    </article>
                  </li>
                )
              }

              // Evento Sentinela (Publicação / Comunicação / Decisão)
              const comm = ev.sentinela
              const dataExibicao =
                comm.data_disponibilizacao || comm.data_publicacao || comm.created || ''
              const tipoBadge = comm.tipo_comunicacao || 'Publicação'
              const teorCompleto = comm.teor_completo || comm.teor_resumido || ''
              const isLongTeor = teorCompleto.length > 600
              const isExpanded = expandedTeors[ev.id] ?? false

              return (
                <li key={ev.id} className="relative group">
                  {/* Marcador na linha (Amber/Indigo para Sentinela) */}
                  <span
                    className="absolute -left-[1.95rem] top-2 h-3.5 w-3.5 rounded-full bg-amber-500 ring-4 ring-slate-950 shadow-sm shadow-amber-500/50"
                    aria-hidden="true"
                  />

                  <article className="rounded-xl border border-amber-500/20 bg-slate-900 p-4 shadow-sm hover:border-amber-500/40 transition-colors">
                    {/* Metadados da Comunicação */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                        <FileText className="w-2.5 h-2.5" /> Publicação (Sentinela)
                      </span>
                      <span className="rounded bg-indigo-950/80 border border-indigo-800/50 px-2 py-0.5 text-[10px] font-mono uppercase text-indigo-300">
                        {tipoBadge}
                      </span>
                      {comm.tribunal && (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono uppercase text-slate-300">
                          {comm.tribunal}
                        </span>
                      )}
                      <time
                        dateTime={dataExibicao}
                        className="text-xs font-mono text-slate-400 flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatarDataIso(dataExibicao)}
                      </time>
                      {comm.urgency_level && comm.urgency_level !== 'baixa' && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                            comm.urgency_level === 'critica' || comm.urgency_level === 'alta'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          Urgência: {comm.urgency_level}
                        </span>
                      )}
                    </div>

                    {/* Título / Cabeçalho da Publicação */}
                    <div className="mt-2.5 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-amber-100 flex items-center gap-1.5">
                          <span>Comunicação Oficial: {tipoBadge}</span>
                        </h2>
                        {comm.destinatario && (
                          <p className="mt-0.5 text-xs text-slate-300 font-mono">
                            Destinatário:{' '}
                            <span className="text-white font-medium">{comm.destinatario}</span>
                          </p>
                        )}
                        {comm.orgao_julgador && (
                          <p className="text-xs font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            {comm.orgao_julgador}
                          </p>
                        )}
                      </div>

                      {comm.external_id && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
                          ID: {comm.external_id}
                        </span>
                      )}
                    </div>

                    {/* Teor Completo da Publicação (A informação real) */}
                    <div className="mt-3 rounded-lg border border-amber-900/30 bg-slate-950/70 p-3.5">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/70">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-amber-400" />
                          Teor da Decisão / Publicação
                        </span>
                        {comm.source && (
                          <span className="text-[10px] font-mono text-slate-500">
                            Fonte: {comm.source}
                          </span>
                        )}
                      </div>

                      {teorCompleto ? (
                        <div>
                          <div
                            className={`text-sm leading-relaxed text-slate-200 whitespace-pre-line font-normal ${
                              isLongTeor && !isExpanded ? 'max-h-56 overflow-hidden relative' : ''
                            }`}
                          >
                            {teorCompleto}

                            {isLongTeor && !isExpanded && (
                              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                            )}
                          </div>

                          {isLongTeor && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(ev.id)}
                              className="mt-2.5 inline-flex items-center gap-1 text-xs font-mono font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5" /> Ver menos
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" /> Ver teor completo (
                                  {teorCompleto.length} caracteres)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs italic text-slate-500">
                          Teor não disponível na captura.
                        </p>
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
