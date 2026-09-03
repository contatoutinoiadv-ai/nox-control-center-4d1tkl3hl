import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Plus,
  CheckCircle2,
  ExternalLink,
  Database,
  Building,
  Eye,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  datajudService,
  ProcessoMonitorado,
  MovimentacaoProcesso,
  ProcessoDatajudCache,
  AlertaMovimentacao,
  SIGILO_DESCRICOES,
} from '@/services/datajudService'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const PAGE_SIZE = 50

export const MovimentacoesDatajudView: React.FC = () => {
  const navigate = useNavigate()
  const [processos, setProcessos] = useState<ProcessoMonitorado[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoProcesso[]>([])
  const [alertas, setAlertas] = useState<AlertaMovimentacao[]>([])
  const [caches, setCaches] = useState<ProcessoDatajudCache[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [syncingSingle, setSyncingSingle] = useState<string | null>(null)
  const [syncingLote, setSyncingLote] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedProcesso, setSelectedProcesso] = useState<string | null>(null)
  const [filterSigilo, setFilterSigilo] = useState<string>('todos')
  const [page, setPage] = useState<number>(1)

  // Modal de Adicionar Processo
  const [openAddModal, setOpenAddModal] = useState(false)
  const [novoNumero, setNovoNumero] = useState('')
  const [novoCliente, setNovoCliente] = useState('')
  const [novoComPrazo, setNovoComPrazo] = useState(false)
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Consulta INDEPENDENTE ao PocketBase: histórico completo já gravado em
  // movimentacoes_processo, não o retorno da última chamada ao DataJud.
  const loadMovimentacoes = useCallback(async () => {
    try {
      const movs = await datajudService.getMovimentacoes()
      setMovimentacoes(movs)
    } catch (err) {
      console.error('Erro ao carregar movimentações gravadas do DataJud:', err)
    }
  }, [])

  // Carregar dados
  const loadData = async () => {
    setLoading(true)
    try {
      const [procs, movs, alerts, cchs] = await Promise.all([
        datajudService.getProcessosMonitorados(),
        datajudService.getMovimentacoes(),
        datajudService.getAlertasMovimentacao(),
        datajudService.getAllCaches(),
      ])
      setProcessos(procs)
      setMovimentacoes(movs)
      setAlertas(alerts)
      setCaches(cchs)
    } catch (err) {
      console.error('Erro ao carregar dados do DataJud:', err)
      toast.error('Erro ao carregar registros do DataJud.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Processos com tribunal não mapeado
  const naoMapeados = processos.filter(
    (p) =>
      p.ultimo_status_mapeamento &&
      p.ultimo_status_mapeamento.toLowerCase().includes('nao_mapeado'),
  )

  // Consulta manual individual
  const handleConsultarProcesso = async (numero: string) => {
    setSyncingSingle(numero)
    try {
      const res = await datajudService.consultarProcesso(numero)
      if (res.ok) {
        toast.success(`Consulta DataJud concluída para ${numero}`, {
          description: `${res.novos_movimentos_inseridos || 0} novas movimentações inseridas (${res.total_movimentos_api || 0} no tribunal).`,
        })
      } else {
        if (res.status === 'tribunal_nao_mapeado') {
          toast.warning(`Tribunal não mapeado (J.TR: ${res.jtr})`, {
            description:
              'Processo registrado na lista de pendências para mapeamento manual conforme Resolução CNJ 65/2008.',
          })
        } else {
          const mensagemErro = res.error || 'Não foi possível consultar o DataJud no momento.'
          toast.error(mensagemErro, {
            description: res.detalhes ? `Detalhes: ${res.detalhes}` : undefined,
          })
        }
      }
    } catch (err: any) {
      console.error(
        `[${new Date().toISOString()}] [MovimentacoesDatajudView] Erro inesperado ao consultar processo:`,
        err,
      )
      toast.error(`Erro na requisição: ${err?.message || 'Falha de comunicação.'}`)
    } finally {
      // Refaz a consulta completa ao banco, independente de a chamada ter
      // tido sucesso ou não. A lista sempre reflete o que está gravado.
      await loadData()
      if (numero === selectedProcesso) {
        setPage(1)
      }
      setSyncingSingle(null)
    }
  }

  // Sincronização em lote
  const handleSincronizarLote = async (apenasPrazos = false) => {
    setSyncingLote(true)
    try {
      const res = await datajudService.sincronizarLote(apenasPrazos)
      if (res.ok) {
        toast.success('Varredura em lote do DataJud concluída', {
          description: `${res.total_processos_analisados} processos analisados. ${res.novos_movimentos_totais} novas movimentações registradas.`,
        })
        if (res.nao_mapeados_count > 0) {
          toast.warning(`${res.nao_mapeados_count} processo(s) com tribunal não mapeado.`, {
            description: 'Verifique a lista de tribunais pendentes de mapeamento.',
          })
        }
      } else {
        const mensagemErro = res.error || 'Não foi possível sincronizar o lote no momento.'
        toast.error(mensagemErro)
      }
    } catch (err: any) {
      console.error(
        `[${new Date().toISOString()}] [MovimentacoesDatajudView] Erro inesperado no lote DataJud:`,
        err,
      )
      toast.error(`Erro ao executar lote: ${err?.message || 'Falha de comunicação.'}`)
    } finally {
      await loadData()
      setSyncingLote(false)
    }
  }

  // Cadastro de novo processo para monitoramento
  const handleCadastrarProcesso = async () => {
    if (!novoNumero.trim()) {
      toast.error('Informe o número do processo (formato CNJ).')
      return
    }

    setSubmittingAdd(true)
    try {
      const added = await datajudService.adicionarProcessoMonitorado(
        novoNumero.trim(),
        novoCliente.trim(),
        undefined,
        novoComPrazo,
      )
      if (added) {
        toast.success('Processo adicionado ao monitoramento DataJud com sucesso.')
        setNovoNumero('')
        setNovoCliente('')
        setNovoComPrazo(false)
        setOpenAddModal(false)
        await loadData()

        // Já dispara a primeira consulta para capturar o histórico
        handleConsultarProcesso(added.numero_processo)
      } else {
        toast.error('Não foi possível cadastrar o processo. Verifique se o número já existe.')
      }
    } catch (err: any) {
      toast.error(`Erro ao cadastrar: ${err.message}`)
    } finally {
      setSubmittingAdd(false)
    }
  }

  const handleMarcarAlertaLido = async (id: string) => {
    await datajudService.marcarAlertaComoLido(id)
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, lido: true } : a)))
  }

  // Seleção de processo: reinicia a navegação por página e refaz a consulta
  // completa, para que a linha do tempo venha sempre do banco.
  const handleSelectProcesso = async (numero: string | null) => {
    setSelectedProcesso(numero)
    setPage(1)
    await loadMovimentacoes()
  }

  // Filtragem de movimentações
  const filteredMovimentacoes = movimentacoes.filter((m) => {
    if (selectedProcesso && m.numero_processo !== selectedProcesso) return false
    if (filterSigilo === 'publico' && m.nivel_sigilo_processo !== 0) return false
    if (filterSigilo === 'sigiloso' && m.nivel_sigilo_processo === 0) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        m.numero_processo.toLowerCase().includes(q) ||
        m.nome_movimento.toLowerCase().includes(q) ||
        m.tribunal_alias.toLowerCase().includes(q) ||
        (m.orgao_nome_movimento && m.orgao_nome_movimento.toLowerCase().includes(q))
      )
    }
    return true
  })

  // Ordena do mais antigo para o mais recente (ordem cronológica ascendente)
  const movimentacoesOrdenadas = [...filteredMovimentacoes].sort((a, b) => {
    const da = new Date(a.data_hora_movimento).getTime() || 0
    const db = new Date(b.data_hora_movimento).getTime() || 0
    return da - db
  })

  const totalMovs = movimentacoesOrdenadas.length
  const totalPages = Math.max(1, Math.ceil(totalMovs / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const movsPaginadas = movimentacoesOrdenadas.slice(
    (safePage - 1) * PAGE_SIZE,
    (safePage - 1) * PAGE_SIZE + PAGE_SIZE,
  )

  // Contagem de alertas não lidos
  const alertasNaoLidos = alertas.filter((a) => !a.lido)

  return (
    <div className="space-y-6">
      {/* Alertas e Pendências de Tribunais Não Mapeados */}
      {naoMapeados.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/80 nox-glass-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-200">
                Processos com Tribunal Não Mapeado ({naoMapeados.length})
              </h3>
            </div>
            <Badge className="bg-amber-950 text-amber-300 border-amber-700 font-mono text-[10px]">
              Resolução CNJ 65/2008
            </Badge>
          </div>
          <p className="text-xs text-slate-300">
            Os processos abaixo utilizam pares de segmento e tribunal (J.TR) que ainda não foram
            adicionados à lista oficial confirmada do escritório. O lote não foi interrompido, mas
            requer adição manual do alias conforme a tabela oficial do CNJ.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {naoMapeados.map((p) => (
              <div
                key={p.id}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-amber-800/40 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <div className="font-bold text-slate-200">{p.numero_processo}</div>
                  <div className="text-[11px] text-amber-400/90">
                    {p.cliente || 'Sem cliente'} • Status: {p.ultimo_status_mapeamento}
                  </div>
                </div>
                <a
                  href="https://atos.cnj.jus.br/atos/detalhar/119"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                >
                  Tabela CNJ <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header com Ações e KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Processos Monitorados
          </div>
          <div className="text-xl font-black text-cyan-400 font-mono mt-1">
            {processos.length} ativos
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {processos.filter((p) => p.tem_prazo_aberto).length} diários /{' '}
            {processos.filter((p) => !p.tem_prazo_aberto).length} semanais
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            Total de Movimentações
          </div>
          <div className="text-xl font-black text-slate-100 font-mono mt-1">
            {movimentacoes.length} gravadas
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Hash Dedup SHA-256 ativo
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Alertas de Andamento</div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1">
            {alertasNaoLidos.length} não lidos
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            {alertas.length} no histórico
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card flex flex-col justify-between">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Status API DataJud</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm font-bold text-slate-200">BETA Oficial CNJ</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Autenticação via segredo</div>
        </div>
      </div>

      {/* Barra de Ações Operacionais */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setOpenAddModal(true)}
            className="bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 h-8 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Monitorar Novo Processo
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={syncingLote}
            onClick={() => handleSincronizarLote(false)}
            className="border-slate-700 bg-slate-950 text-slate-200 hover:text-cyan-300 h-8 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncingLote ? 'animate-spin' : ''}`} />
            Sincronizar Todos (Lote)
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={syncingLote}
            onClick={() => handleSincronizarLote(true)}
            className="border-amber-700/60 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 h-8 text-xs"
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            Sincronizar Diários (Com Prazos)
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <Input
              placeholder="Filtrar movimentação ou processo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="bg-slate-950 border-slate-800 pl-8 h-8 text-xs text-slate-200"
            />
          </div>

          <select
            value={filterSigilo}
            onChange={(e) => {
              setFilterSigilo(e.target.value)
              setPage(1)
            }}
            className="h-8 bg-slate-950 border border-slate-800 rounded-md px-2 text-xs font-mono text-slate-300 focus:outline-none"
          >
            <option value="todos">Todos os Sigilos</option>
            <option value="publico">Apenas Públicos (0)</option>
            <option value="sigiloso">Apenas Sigilosos (1-5)</option>
          </select>
        </div>
      </div>

      {/* Processos Monitorados - Lista Compacta com Ação Individual */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            Processos em Monitoramento Contínuo
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {processos.length} processos cadastrados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {processos.map((p) => {
            const cache = caches.find((c) => c.numero_processo === p.numero_processo)
            const countMovs = movimentacoes.filter(
              (m) => m.numero_processo === p.numero_processo,
            ).length
            const isSyncing = syncingSingle === p.numero_processo
            const isSelected = selectedProcesso === p.numero_processo

            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/processos/${encodeURIComponent(p.numero_processo)}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    navigate(`/processos/${encodeURIComponent(p.numero_processo)}`)
                  }
                }}
                title={`Abrir detalhe e linha do tempo do processo ${p.numero_processo}`}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Badge className="bg-slate-900 text-cyan-300 border-slate-700 text-[10px] font-mono uppercase">
                    {p.tribunal || 'ALIAS'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {p.tem_prazo_aberto && (
                      <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[9px] font-mono">
                        DIÁRIO (PRAZO)
                      </Badge>
                    )}
                    {cache?.nivel_sigilo !== undefined && cache.nivel_sigilo > 0 && (
                      <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[9px] font-mono">
                        {SIGILO_DESCRICOES[cache.nivel_sigilo] || 'Sigiloso'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="font-mono text-xs font-bold text-slate-100 truncate">
                  {p.numero_processo}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  Cliente: <span className="text-slate-300">{p.cliente || 'Não informado'}</span>
                </div>

                {cache && (
                  <div className="text-[11px] text-slate-400 font-mono mt-1 line-clamp-1">
                    {cache.classe_nome || 'Classe'} •{' '}
                    {cache.orgao_julgador_nome || cache.grau || ''}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-800/80 text-[11px] font-mono">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/processos/${encodeURIComponent(p.numero_processo)}`)
                    }}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                    title={`Abrir a linha do tempo completa de ${p.numero_processo}`}
                  >
                    <Eye className="w-3 h-3" /> {countMovs} movimentos
                  </button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isSyncing}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConsultarProcesso(p.numero_processo)
                    }}
                    className="h-6 px-2 text-[10px] text-cyan-300 hover:bg-slate-800"
                    title="Consultar DataJud e puxar publicações do diário oficial"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    Consultar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Alertas Recentes de Movimentação */}
      {alertasNaoLidos.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 nox-glass-card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Novas Movimentações Detectadas (Alertas Pendentes)
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {alertasNaoLidos.length} novos andamentos
            </span>
          </div>

          <div className="space-y-2">
            {alertasNaoLidos.map((alerta) => (
              <div
                key={alerta.id}
                className="p-3 rounded-lg bg-slate-950/80 border border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {alerta.numero_processo}
                    </span>
                    <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[9px]">
                      ANDAMENTO NOVO
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-200 mt-1">{alerta.descricao}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarcarAlertaLido(alerta.id)}
                  className="h-7 text-xs border-slate-700 text-slate-300 hover:text-emerald-300 shrink-0 self-end sm:self-center"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar como Lido
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linha do Tempo do Processo Selecionado (histórico completo do banco) */}
      {selectedProcesso && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                Linha do Tempo do Processo
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {selectedProcesso} • {totalMovs} movimentações gravadas, do mais antigo ao mais
                recente
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSelectProcesso(null)}
              className="h-7 text-xs border-slate-700 text-slate-300"
            >
              Remover Filtro de Processo
            </Button>
          </div>

          {movsPaginadas.length === 0 ? (
            <div className="p-10 text-center rounded-lg bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
              Nenhuma movimentação gravada ainda para este processo. Clique em "Consultar" acima
              para buscar o histórico no DataJud.
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Linha vertical da timeline */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-700/60"></div>
              {movsPaginadas.map((mov) => {
                const isSigiloso = mov.nivel_sigilo_processo > 0
                return (
                  <div key={mov.id} className="relative pb-4 last:pb-0">
                    {/* Marcador da linha do tempo */}
                    <span
                      className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                        isSigiloso ? 'bg-amber-400 border-amber-800' : 'bg-cyan-400 border-cyan-800'
                      }`}
                    ></span>

                    <div
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSigiloso
                          ? 'bg-amber-950/15 border-amber-900/50'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-slate-900 text-cyan-300 border-slate-700 text-[10px] font-mono">
                            {mov.tribunal_alias.toUpperCase()}
                          </Badge>
                          {isSigiloso ? (
                            <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] font-mono flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" />
                              {SIGILO_DESCRICOES[mov.nivel_sigilo_processo] || 'SIGILO'}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-[10px] font-mono flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> PÚBLICO
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs font-mono text-slate-300 flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(mov.data_hora_movimento).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="mt-2">
                        <h4
                          className={`text-sm font-semibold ${
                            isSigiloso ? 'text-amber-200 italic' : 'text-slate-100'
                          }`}
                        >
                          {mov.nome_movimento}
                        </h4>
                        {mov.orgao_nome_movimento && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Órgão: {mov.orgao_nome_movimento}
                          </p>
                        )}
                      </div>

                      {/* Complementos Tabelados se houver e não for sigiloso */}
                      {!isSigiloso &&
                        mov.complementos_json &&
                        Array.isArray(mov.complementos_json) &&
                        mov.complementos_json.length > 0 && (
                          <div className="mt-2.5 p-2 rounded bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono space-y-1">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              Complementos Tabelados (TPU)
                            </div>
                            {mov.complementos_json.map((comp: any, idx: number) => (
                              <div key={idx} className="text-slate-300">
                                • {comp.nome || comp.descricao || 'Item'}:{' '}
                                {comp.valor || comp.descricao}
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                        <div>
                          Código TPU:{' '}
                          <span className="text-slate-400 font-bold">{mov.codigo_movimento}</span>
                        </div>
                        <div className="truncate max-w-xs" title={mov.hash_dedup}>
                          Hash Dedup:{' '}
                          <span className="text-slate-400">
                            {mov.hash_dedup.substring(0, 16)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Paginação da linha do tempo */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
              <div>
                Página {safePage} de {totalPages} ({totalMovs} movimentações no total, {PAGE_SIZE}{' '}
                por página)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300"
                >
                  Primeira
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={safePage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300"
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline geral (sem processo selecionado): consulta independente ao banco */}
      {!selectedProcesso && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 nox-glass-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Linha do Tempo de Movimentações (DataJud / CNJ)
              </h3>
              <p className="text-xs text-slate-400">
                Histórico completo já gravado no banco, deduplicado via SHA-256. Selecione um
                processo acima para ver a linha do tempo dele.
              </p>
            </div>
          </div>

          {movsPaginadas.length === 0 ? (
            <div className="p-10 text-center rounded-lg bg-slate-950/40 border border-slate-800 text-slate-500 text-xs">
              {loading
                ? 'Carregando movimentações...'
                : 'Nenhuma movimentação gravada com os filtros selecionados. Clique em "Consultar" em um dos processos ou em "Sincronizar Todos".'}
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Linha vertical da timeline */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-700/60"></div>
              {movsPaginadas.map((mov) => {
                const isSigiloso = mov.nivel_sigilo_processo > 0
                return (
                  <div key={mov.id} className="relative pb-4 last:pb-0">
                    {/* Marcador da linha do tempo */}
                    <span
                      className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${
                        isSigiloso ? 'bg-amber-400 border-amber-800' : 'bg-cyan-400 border-cyan-800'
                      }`}
                    ></span>

                    <div
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSigiloso
                          ? 'bg-amber-950/15 border-amber-900/50'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-slate-900 text-cyan-300 border-slate-700 text-[10px] font-mono">
                            {mov.tribunal_alias.toUpperCase()}
                          </Badge>
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {mov.numero_processo}
                          </span>
                          {isSigiloso ? (
                            <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] font-mono flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" />
                              {SIGILO_DESCRICOES[mov.nivel_sigilo_processo] || 'SIGILO'}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-950 text-emerald-400 border-emerald-800 text-[10px] font-mono flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> PÚBLICO
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs font-mono text-slate-300 flex items-center gap-1 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(mov.data_hora_movimento).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      <div className="mt-2">
                        <h4
                          className={`text-sm font-semibold ${
                            isSigiloso ? 'text-amber-200 italic' : 'text-slate-100'
                          }`}
                        >
                          {mov.nome_movimento}
                        </h4>
                        {mov.orgao_nome_movimento && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Órgão: {mov.orgao_nome_movimento}
                          </p>
                        )}
                      </div>

                      {/* Complementos Tabelados se houver e não for sigiloso */}
                      {!isSigiloso &&
                        mov.complementos_json &&
                        Array.isArray(mov.complementos_json) &&
                        mov.complementos_json.length > 0 && (
                          <div className="mt-2.5 p-2 rounded bg-slate-900/60 border border-slate-800/80 text-[11px] font-mono space-y-1">
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              Complementos Tabelados (TPU)
                            </div>
                            {mov.complementos_json.map((comp: any, idx: number) => (
                              <div key={idx} className="text-slate-300">
                                • {comp.nome || comp.descricao || 'Item'}:{' '}
                                {comp.valor || comp.descricao}
                              </div>
                            ))}
                          </div>
                        )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                        <div>
                          Código TPU:{' '}
                          <span className="text-slate-400 font-bold">{mov.codigo_movimento}</span>
                        </div>
                        <div className="truncate max-w-xs" title={mov.hash_dedup}>
                          Hash Dedup:{' '}
                          <span className="text-slate-400">
                            {mov.hash_dedup.substring(0, 16)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Paginação da linha do tempo */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400">
              <div>
                Página {safePage} de {totalPages} ({totalMovs} movimentações no total, {PAGE_SIZE}{' '}
                por página)
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300"
                >
                  Primeira
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={safePage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300"
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal para Adicionar Processo */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="bg-slate-950 border border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-cyan-300 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" /> Monitorar Novo Processo (DataJud)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cadastre o número CNJ do processo. O alias do tribunal é resolvido automaticamente a
              partir da estrutura oficial J.TR (Resolução CNJ 65/2008).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="text-[11px] font-mono text-slate-300 uppercase font-bold block mb-1">
                Número Único CNJ * (20 dígitos)
              </label>
              <Input
                placeholder="Ex: 0801234-56.2026.8.12.0001"
                value={novoNumero}
                onChange={(e) => setNovoNumero(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Exemplos suportados: TJMS (8.12), TJSC (8.24), TJGO (8.09), TRT24 (5.24), STJ
                (3.00).
              </p>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-300 uppercase font-bold block mb-1">
                Nome do Cliente
              </label>
              <Input
                placeholder="Nome do cliente vinculado"
                value={novoCliente}
                onChange={(e) => setNovoCliente(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <input
                type="checkbox"
                id="novoComPrazo"
                checked={novoComPrazo}
                onChange={(e) => setNovoComPrazo(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500"
              />
              <label htmlFor="novoComPrazo" className="text-xs text-slate-300 cursor-pointer">
                Processo com prazo judicial em aberto (ativa varredura diária no agendador)
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenAddModal(false)}
              className="border-slate-800 text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={submittingAdd}
              onClick={handleCadastrarProcesso}
              className="bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 text-xs"
            >
              {submittingAdd ? 'Cadastrando...' : 'Salvar & Iniciar Monitoramento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MovimentacoesDatajudView
