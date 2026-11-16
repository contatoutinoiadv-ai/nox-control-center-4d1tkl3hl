import React, { useState } from 'react'
import { Search, AlertTriangle, Radio, ShieldCheck, CalendarDays, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  fetchDjenCommunicationsDirect,
  TRIBUNAIS_BRASIL,
  DjenSearchResult,
} from '@/services/djenService'
import { SentinelaCommunication } from '@/types/sentinela'

/**
 * CONSULTA PÚBLICA DJEN SENTINELA NOX
 *
 * Ferramenta externa de consulta instantânea de publicações do DJEN/CNJ.
 * Extensão da tela de busca do Sentinela NOX (rota interna /sentinela/djen),
 * porém totalmente isolada:
 *  - Não exige login e não herda o layout autenticado da Central NOX.
 *  - Não usa inteligência NOX (sem análise, sem Oráculo, sem chat).
 *  - Não grava nada em banco, coleção interna ou localStorage: todo o estado
 *    vive apenas na memória desta página (useState) e se perde ao recarregar.
 *  - Não expõe menu, módulos, clientes, processos, históricos ou auditoria.
 * A fonte de dados é a mesma da tela interna: fetch direto no navegador para
 * https://comunicaapi.pje.jus.br (ComunicaAPI pública do CNJ/PJe).
 */

const DJEN_PAGE_SIZE = 100

const localFilterOptions = [
  { value: 'todos', label: 'Total Encontradas' },
  { value: 'citacao', label: 'Citações' },
  { value: 'intimacao', label: 'Intimações' },
  { value: 'urgente', label: 'Urgentes / Fatais' },
] as const

type LocalFilterType = (typeof localFilterOptions)[number]['value']

const formatarDataBr = (iso?: string): string => {
  if (!iso) return 'não informada'
  const match = String(iso).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  return String(iso)
}

export const ConsultaPublicaPage: React.FC = () => {
  // Filtros (mesma modalidade da tela interna de busca DJEN)
  const [modo, setModo] = useState<'oab' | 'nome' | 'processo'>('oab')
  const [oab, setOab] = useState('15400')
  const [uf, setUf] = useState('MS')
  const [advogado, setAdvogado] = useState('Higor Utinói')
  const [parte, setParte] = useState('')
  const [processoInput, setProcessoInput] = useState('')
  const [tribunal, setTribunal] = useState('') // vazio = todos os tribunais do Brasil
  const hoje = new Date().toISOString().split('T')[0]
  const [dataIni, setDataIni] = useState(hoje)
  const [dataFim, setDataFim] = useState(hoje)

  // Resultados: estado apenas em memória, nada é persistido
  const [resultados, setResultados] = useState<SentinelaCommunication[]>([])
  const [isBuscando, setIsBuscando] = useState(false)
  const [jaBuscou, setJaBuscou] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [retryRemaining, setRetryRemaining] = useState<number | null>(null)
  const [errorState, setErrorState] = useState<DjenSearchResult['error'] | null>(null)
  const [lastSourceUrl, setLastSourceUrl] = useState(
    'https://comunicaapi.pje.jus.br/api/v1/comunicacao',
  )

  // Paginação local em memória
  const [paginaApi, setPaginaApi] = useState(1)
  const [totalApi, setTotalApi] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [paginaLocal, setPaginaLocal] = useState(1)
  const [filtroTipo, setFiltroTipo] = useState<LocalFilterType>('todos')
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  const executarBusca = async (targetPage: number, append: boolean) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsBuscando(true)
    }
    setErrorState(null)
    setStatusMessage(
      append
        ? `Buscando página ${targetPage} da ComunicaAPI...`
        : 'Consultando ComunicaAPI do CNJ diretamente do navegador...',
    )
    setRetryRemaining(null)

    try {
      const result = await fetchDjenCommunicationsDirect(
        {
          itensPorPagina: DJEN_PAGE_SIZE,
          pagina: targetPage,
          meio: 'D',
          numeroProcesso: processoInput,
          numeroOab: oab,
          ufOab: uf,
          nomeAdvogado: advogado,
          nomeParte: parte,
          siglaTribunal: tribunal,
          dataDisponibilizacaoInicio: dataIni,
          dataDisponibilizacaoFim: dataFim,
          modo,
        },
        undefined,
        (status) => {
          setStatusMessage(status.message)
          if (status.secondsRemaining !== undefined) {
            setRetryRemaining(status.secondsRemaining)
          }
        },
      )

      if (result.sourceUrl) setLastSourceUrl(result.sourceUrl)

      if (!result.success) {
        setErrorState(result.error || { type: 'UNKNOWN', message: 'Erro ao consultar o DJEN.' })
        setResultados([])
        setTotalApi(null)
        return
      }

      const itens = Array.isArray(result.items) ? result.items : []
      setResultados((prev) => {
        const base = append ? prev : []
        const existentes = new Set(base.map((c) => c?.externalId || c?.id).filter(Boolean))
        const novos = itens.filter((c) => !existentes.has(c?.externalId || c?.id))
        return [...base, ...novos]
      })
      setTotalApi(typeof result.totalCount === 'number' ? result.totalCount : itens.length)
      setPaginaApi(result.currentPage || targetPage)
      setPaginaLocal(1)
      setFiltroTipo('todos')
    } catch (err: any) {
      setErrorState({
        type: 'NETWORK',
        message: err?.message || 'Erro inesperado na consulta ao DJEN.',
      })
    } finally {
      setIsBuscando(false)
      setIsLoadingMore(false)
      setStatusMessage(null)
      setRetryRemaining(null)
      setJaBuscou(true)
    }
  }

  const limparFiltros = () => {
    setModo('oab')
    setOab('15400')
    setUf('MS')
    setAdvogado('Higor Utinói')
    setParte('')
    setProcessoInput('')
    setTribunal('')
    setDataIni(hoje)
    setDataFim(hoje)
    setResultados([])
    setTotalApi(null)
    setPaginaApi(1)
    setPaginaLocal(1)
    setFiltroTipo('todos')
    setErrorState(null)
    setStatusMessage(null)
    setExpandidoId(null)
    setJaBuscou(false)
  }

  // Contadores locais (apenas memória)
  const totalCitacoes = resultados.filter((c) =>
    String(c.tipoComunicacao || '').includes('CIT'),
  ).length
  const totalIntimacoes = resultados.filter((c) =>
    String(c.tipoComunicacao || '').includes('INTIM'),
  ).length
  const totalUrgentes = resultados.filter(
    (c) => c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica',
  ).length

  const filtradas = resultados.filter((c) => {
    const tipo = String(c.tipoComunicacao || '')
    if (filtroTipo === 'citacao') return tipo.includes('CIT')
    if (filtroTipo === 'intimacao') return tipo.includes('INTIM')
    if (filtroTipo === 'urgente') return c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica'
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / DJEN_PAGE_SIZE))
  const paginadas = filtradas.slice(
    (paginaLocal - 1) * DJEN_PAGE_SIZE,
    paginaLocal * DJEN_PAGE_SIZE,
  )

  const metricaCard = (
    option: (typeof localFilterOptions)[number],
    valor: number,
    corValor: string,
    corBarra: string,
  ) => (
    <div
      onClick={() => {
        setFiltroTipo(option.value)
        setPaginaLocal(1)
      }}
      className={`p-3 rounded-xl border cursor-pointer transition-all ${
        filtroTipo === option.value
          ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="text-[10px] font-mono uppercase text-slate-400">{option.label}</div>
      <div className={`text-xl font-black font-mono mt-0.5 ${corValor}`}>{valor}</div>
      <div className="flex items-end gap-1 h-3 mt-2">
        {[40, 70, 55, 90, 100].map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className={`flex-1 rounded-xs ${corBarra}`}
          ></span>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-200 px-3 py-5 sm:px-6 sm:py-8">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Cabeçalho NOX (identidade visual da tela interna) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h1 className="text-sm sm:text-base font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              DJEN SENTINELA NOX — CONSULTA EXTERNA DE PUBLICAÇÕES
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Endpoint:</span>
              <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-mono">
                comunicaapi.pje.jus.br (Fetch Direto no Navegador)
              </Badge>
            </div>
          </div>

          {/* Aviso discreto da ferramenta externa */}
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-slate-400">
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Ferramenta de consulta externa: busca instantânea de publicações, nada é armazenado.
              Somente leitura da API pública do CNJ, sem acesso ao sistema interno e sem uso da
              inteligência NOX.
            </span>
          </div>

          {/* Filtros: mesma modalidade da tela interna */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">
                Modo de Busca
              </label>
              <select
                value={modo}
                onChange={(e) => setModo(e.target.value as 'oab' | 'nome' | 'processo')}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="oab">OAB (Âncora Principal)</option>
                <option value="nome">Nome da Parte / Adv</option>
                <option value="processo">Número do Processo</option>
              </select>
            </div>

            {modo === 'oab' && (
              <div className="space-y-1 lg:col-span-2">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Âncora OAB / UF
                </label>
                <div className="flex gap-1.5">
                  <Input
                    value={oab}
                    onChange={(e) => setOab(e.target.value)}
                    placeholder="15.400"
                    className="bg-slate-950 border-slate-800 h-8 text-xs font-mono text-amber-300"
                  />
                  <Input
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    placeholder="MS"
                    className="bg-slate-950 border-slate-800 h-8 text-xs w-16 font-mono uppercase"
                  />
                </div>
              </div>
            )}

            {modo === 'nome' && (
              <div className="space-y-1 lg:col-span-2">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Nome da Parte ou Advogado
                </label>
                <Input
                  value={advogado}
                  onChange={(e) => setAdvogado(e.target.value)}
                  placeholder="Ex: Higor Utinói"
                  className="bg-slate-950 border-slate-800 h-8 text-xs text-slate-200"
                />
              </div>
            )}

            {modo === 'processo' && (
              <div className="space-y-1 lg:col-span-2">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Processo (CNJ)
                </label>
                <Input
                  value={processoInput}
                  onChange={(e) => setProcessoInput(e.target.value)}
                  placeholder="0000000-00.0000.8.12.0001"
                  className="bg-slate-950 border-slate-800 h-8 text-xs font-mono text-cyan-300"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">
                Nome da Parte
              </label>
              <Input
                value={parte}
                onChange={(e) => setParte(e.target.value)}
                placeholder="Filtrar por parte..."
                className="bg-slate-950 border-slate-800 h-8 text-xs text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">
                Tribunal {tribunal ? `(${tribunal})` : '(Todos)'}
              </label>
              <select
                value={tribunal}
                onChange={(e) => setTribunal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
              >
                {TRIBUNAIS_BRASIL.map((trib) => (
                  <option key={trib.sigla || 'all'} value={trib.sigla}>
                    {trib.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">Data Inicial</label>
              <Input
                type="date"
                value={dataIni}
                onChange={(e) => setDataIni(e.target.value)}
                className="bg-slate-950 border-slate-800 h-8 text-xs font-mono text-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400">Data Final</label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-slate-950 border-slate-800 h-8 text-xs font-mono text-slate-200"
              />
            </div>
          </div>

          {/* Ações: apenas busca e limpeza */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <Button
              onClick={() => executarBusca(1, false)}
              disabled={isBuscando}
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 shadow-md"
            >
              {isBuscando ? '⟳ Consultando...' : '🔍 Buscar Publicações'}
            </Button>
            <Button
              onClick={limparFiltros}
              variant="outline"
              size="sm"
              className="text-xs h-8 border-slate-800 text-slate-400 hover:text-slate-200"
            >
              Limpar Filtros
            </Button>
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 ml-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Sem gravação de dados · Sem análise NOX · Somente consulta
            </span>
          </div>
        </div>

        {/* Status de consulta e erros honestos */}
        {(statusMessage || retryRemaining !== null) && (
          <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/70 text-xs font-mono text-cyan-200 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin shrink-0"></span>
            <span>{statusMessage}</span>
            {retryRemaining !== null && (
              <Badge className="bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-mono animate-pulse">
                Retry em {retryRemaining}s
              </Badge>
            )}
          </div>
        )}

        {errorState && (
          <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/80 space-y-2 text-xs text-rose-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>
                  {errorState.type === 'RATE_LIMIT_429'
                    ? 'Limite de Requisições Atingido (HTTP 429)'
                    : errorState.type === 'FORBIDDEN_403'
                      ? 'Acesso Bloqueado pelo CNJ (HTTP 403 / CloudFront)'
                      : errorState.type === 'CORS'
                        ? 'Restrição de CORS / Rede ao Conectar com o CNJ'
                        : 'Falha na Conexão com a ComunicaAPI'}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[9px] font-mono border-rose-700 text-rose-300"
              >
                {errorState.type}
              </Badge>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{errorState.message}</p>
            <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400">
              <span className="truncate max-w-md">URL: {lastSourceUrl}</span>
              <Button
                size="sm"
                onClick={() => executarBusca(1, false)}
                className="h-6 px-2 text-[10px] bg-rose-900 hover:bg-rose-800 text-white"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {/* Métricas locais da consulta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {metricaCard(
            localFilterOptions[0],
            resultados.length,
            'text-slate-100',
            'bg-cyan-500/60',
          )}
          {metricaCard(localFilterOptions[1], totalCitacoes, 'text-blue-400', 'bg-blue-500/60')}
          {metricaCard(localFilterOptions[2], totalIntimacoes, 'text-amber-400', 'bg-amber-500/60')}
          {metricaCard(localFilterOptions[3], totalUrgentes, 'text-rose-400', 'bg-rose-500/60')}
        </div>

        {/* Barra de paginação em memória */}
        {jaBuscou && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 rounded-lg bg-slate-950/90 border border-slate-800 gap-3 text-xs font-mono">
            <div className="text-slate-400 flex items-center gap-2 flex-wrap">
              <span>
                Visualizando{' '}
                <strong className="text-slate-200">
                  {filtradas.length === 0 ? 0 : (paginaLocal - 1) * DJEN_PAGE_SIZE + 1}–
                  {Math.min(paginaLocal * DJEN_PAGE_SIZE, filtradas.length)}
                </strong>{' '}
                de <strong className="text-amber-400">{filtradas.length}</strong> em tela
              </span>
              {totalApi !== null && (
                <Badge variant="outline" className="text-[10px] border-slate-700 text-cyan-300">
                  Total no DJEN/CNJ: {totalApi}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {totalApi !== null && totalApi > resultados.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executarBusca(paginaApi + 1, true)}
                  disabled={isLoadingMore || isBuscando}
                  className="h-7 px-3 text-[11px] bg-cyan-950/40 border-cyan-800 text-cyan-300 hover:bg-cyan-900/60 font-semibold"
                >
                  {isLoadingMore ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-cyan-300 border-t-transparent animate-spin"></span>
                      Carregando pág. {paginaApi + 1}...
                    </span>
                  ) : (
                    `+ Carregar Mais do DJEN (${resultados.length}/${totalApi})`
                  )}
                </Button>
              )}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaLocal <= 1}
                  onClick={() => setPaginaLocal((p) => Math.max(1, p - 1))}
                  className="h-7 px-2 text-[11px] border-slate-800 text-slate-300 disabled:opacity-30"
                >
                  ◀
                </Button>
                <span className="px-2 text-slate-400 text-[11px]">
                  {paginaLocal}/{totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaLocal >= totalPaginas}
                  onClick={() => setPaginaLocal((p) => Math.min(totalPaginas, p + 1))}
                  className="h-7 px-2 text-[11px] border-slate-800 text-slate-300 disabled:opacity-30"
                >
                  ▶
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de publicações encontradas (somente leitura) */}
        <div className="space-y-3">
          {paginadas.length === 0 ? (
            <div className="p-12 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 space-y-2">
              <Radio className="w-8 h-8 mx-auto text-slate-600" />
              <div className="font-bold text-slate-200">
                {jaBuscou ? 'Nenhuma publicação encontrada' : 'Consulta pronta para iniciar'}
              </div>
              <p className="text-xs text-slate-500">
                {jaBuscou
                  ? 'Ajuste os filtros de data, tribunal ou parte e execute uma nova busca.'
                  : 'Defina os filtros acima e clique em Buscar Publicações para consultar o DJEN.'}
              </p>
            </div>
          ) : (
            paginadas.map((comm) => {
              const tipo = String(comm.tipoComunicacao || 'INTIMACAO')
              const isCit = tipo.includes('CIT')
              const isInt = tipo.includes('INTIM')
              const isUrg = comm.urgencyLevel === 'alta' || comm.urgencyLevel === 'critica'
              const cardBorderColor = isUrg
                ? 'border-rose-700/60'
                : isCit
                  ? 'border-blue-700/60'
                  : 'border-amber-700/40'
              const isExpandido = expandidoId === comm.id
              const teor = comm.teorCompleto || comm.teorResumido || 'Teor não informado.'
              const teorVisivel = isExpandido || teor.length <= 320

              return (
                <div
                  key={comm.id}
                  className={`p-4 rounded-xl bg-slate-900/90 border ${cardBorderColor} transition-all space-y-3 nox-glass-card`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[10px] font-mono ${
                          isCit
                            ? 'bg-blue-950 text-blue-300 border-blue-800'
                            : isInt
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {tipo}
                      </Badge>
                      <Badge className="bg-slate-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                        {comm.tribunal || 'DJEN'} • {comm.orgaoJulgador || 'Órgão Julgador'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono ${
                          isUrg
                            ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                            : 'bg-slate-950 text-slate-400'
                        }`}
                      >
                        {String(comm.urgencyLevel || 'baixa').toUpperCase()}
                      </Badge>
                      <span className="text-xs font-mono font-bold text-slate-100">
                        {comm.numeroProcesso || 'Processo sem número'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800 whitespace-pre-line">
                    {teorVisivel ? teor : `${teor.slice(0, 320)}...`}
                  </p>

                  {teor.length > 320 && (
                    <button
                      onClick={() => setExpandidoId(isExpandido ? null : comm.id)}
                      className="text-[10px] font-mono uppercase text-cyan-400 hover:text-cyan-300"
                    >
                      {isExpandido ? 'Recolher teor' : 'Ver teor completo'}
                    </button>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1">
                    <div>
                      Destinatário:{' '}
                      <span className="text-slate-200">{comm.destinatario || 'não informado'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3 text-amber-400" />
                      Disponibilizado em:{' '}
                      <span className="text-amber-400">
                        {formatarDataBr(comm.dataDisponibilizacao)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé isolado, sem links para o sistema interno */}
        <div className="pt-2 pb-6 text-center text-[10px] font-mono text-slate-600">
          DJEN SENTINELA NOX · Ferramenta de consulta externa · Consulta direta à ComunicaAPI do
          CNJ/PJe · Nenhum dado é gravado em banco ou no sistema interno
        </div>
      </div>
    </div>
  )
}

export default ConsultaPublicaPage
