import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Database,
  EyeOff,
  FileDown,
  Lock,
  Radar,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'
import './consultaPublica/consultaPublica.css'
import { fetchDjenCommunicationsDirect, TRIBUNAIS_BRASIL } from '@/services/djenService'
import { SentinelaCommunication } from '@/types/sentinela'
import { useClock, usePrefersReducedMotion, useCursorGlow } from './consultaPublica/visualKit'
import { ScanLogLine, ScanOperationPanel, ScanPhase } from './consultaPublica/ScanOperationPanel'
import { PublicationCard, PaginationFooter } from './consultaPublica/ResultsList'
import { TelemetryCard } from './consultaPublica/TelemetryCard'
import { NoxPulsarBackdrop } from './consultaPublica/NoxPulsarBackdrop'
import { NoxPulsarMark, NoxPulsarState } from './consultaPublica/NoxPulsarMark'
import { gerarPdfNoxPulsar } from './consultaPublica/noxPulsarPdfExporter'

/**
 * NOX PULSAR (ferramenta externa de consulta pública)
 *
 * Uma criação de Higor Utinoi · NOX Intelligence.
 * Totalmente isolada do sistema interno:
 *  - Não exige login, sem menu, sem módulos, sem navegação interna.
 *  - Não usa inteligência NOX (sem análise, sem Oráculo, sem chat).
 *  - Não grava nada em banco ou localStorage: todo o estado vive apenas
 *    na memória desta página (useState) e se perde ao recarregar.
 *
 * Regras desta tela: nenhum travessão ou meia-risca em texto de interface.
 */

const DJEN_PAGE_SIZE = 100

type LocalFilterType = 'todos' | 'citacao' | 'intimacao' | 'urgente'

const TELEMETRY_CARDS: {
  value: LocalFilterType
  label: string
  color: string
  accent: string
}[] = [
  { value: 'todos', label: 'Publicações Capturadas', color: '#F1F5F9', accent: '#22D3EE' },
  { value: 'citacao', label: 'Citações', color: '#67E8F9', accent: '#22D3EE' },
  { value: 'intimacao', label: 'Intimações', color: '#FCD34D', accent: '#F5B301' },
  { value: 'urgente', label: 'Prazos Críticos', color: '#FDA4AF', accent: '#E11D48' },
]

const formatClock = (d: Date) =>
  d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export const ConsultaPublicaPage: React.FC = () => {
  // Filtros (mesma modalidade da tela interna de busca DJEN)
  const [modo, setModo] = useState<'oab' | 'nome' | 'processo'>('oab')
  const [oab, setOab] = useState('15400')
  const [uf, setUf] = useState('MS')
  const [advogado, setAdvogado] = useState('Higor Utinói')
  const [parte, setParte] = useState('')
  const [processoInput, setProcessoInput] = useState('')
  const [tribunal, setTribunal] = useState('') // vazio = todos os tribunais do Brasil
  const hoje = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [dataIni, setDataIni] = useState(hoje)
  const [dataFim, setDataFim] = useState(hoje)

  // Resultados: estado apenas em memória, nada é persistido
  const [resultados, setResultados] = useState<SentinelaCommunication[]>([])
  const [jaBuscou, setJaBuscou] = useState(false)

  // Paginação local em memória
  const [paginaApi, setPaginaApi] = useState(1)
  const [totalApi, setTotalApi] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [paginaLocal, setPaginaLocal] = useState(1)
  const [filtroTipo, setFiltroTipo] = useState<LocalFilterType>('todos')
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  // Cabeçalho: relógio em tempo real
  const agora = useClock()
  const reducedMotion = usePrefersReducedMotion()

  // Cascata: reinicia animação dos cartões a cada nova varredura
  const [telemetryKey, setTelemetryKey] = useState(0)

  // Painel de operação (radar + log honesto amarrado ao fetch real)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle')
  const [scanLines, setScanLines] = useState<ScanLogLine[]>([])
  const scanOpenRef = useRef(false)
  const scanLinesRef = useRef<ScanLogLine[]>([])

  // Rastro de luz no console de parâmetros (a lista tem glow por card)
  const paramsGlowRef = useCursorGlow<HTMLDivElement>()

  // Microfeedback: pulso do botão ao acionar a varredura
  const [btnPulse, setBtnPulse] = useState(0)

  // Exportação em PDF: aviso local, sem tocar no estado da varredura
  const [exportAviso, setExportAviso] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const exportAvisoTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (exportAvisoTimer.current) window.clearTimeout(exportAvisoTimer.current)
    },
    [],
  )
  const handleExportarPdf = () => {
    if (exporting) return
    if (filtradas.length === 0) {
      setExportAviso('Nenhuma publicação para exportar. Conduza uma varredura com resultados.')
      if (exportAvisoTimer.current) window.clearTimeout(exportAvisoTimer.current)
      exportAvisoTimer.current = window.setTimeout(() => setExportAviso(null), 4200)
      return
    }
    try {
      setExporting(true)
      gerarPdfNoxPulsar({
        publicacoes: filtradas,
        ancora: `OAB/${uf.toUpperCase() || 'MS'} ${oab}`,
        parte,
        tribunalSigla: tribunal,
        dataInicio: dataIni,
        dataFim,
        totalCapturado: resultados.length,
      })
    } catch (err) {
      setExportAviso('Não foi possível gerar o PDF agora. Tente novamente em instantes.')
      if (exportAvisoTimer.current) window.clearTimeout(exportAvisoTimer.current)
      exportAvisoTimer.current = window.setTimeout(() => setExportAviso(null), 4200)
      return
    } finally {
      setExporting(false)
    }
  }

  // Estado da logomarca/núcleo do cabeçalho
  const markState: NoxPulsarState =
    scanPhase === 'failed'
      ? 'failed'
      : scanPhase === 'done'
        ? 'done'
        : scanOpen
          ? 'scanning'
          : 'idle'

  const pushLog = useCallback((line: ScanLogLine) => {
    scanLinesRef.current = [...scanLinesRef.current, line]
    setScanLines(scanLinesRef.current)
  }, [])

  // Erro da última varredura (tipo estruturado do serviço DJEN)
  const [djenError, setDjenError] = useState<{
    type?: string
    message?: string
  } | null>(null)

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

  const executarBusca = async (targetPage: number, append: boolean) => {
    if (append) {
      setIsLoadingMore(true)
      // Carregar mais é uma operação discreta, sem abrir o painel de operação
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
          () => {},
        )
        if (result.success) {
          const itens = Array.isArray(result.items) ? result.items : []
          setResultados((prev) => {
            const existentes = new Set(prev.map((c) => c?.externalId || c?.id).filter(Boolean))
            const novos = itens.filter((c) => !existentes.has(c?.externalId || c?.id))
            return [...prev, ...novos]
          })
          setTotalApi(typeof result.totalCount === 'number' ? result.totalCount : itens.length)
          setPaginaApi(result.currentPage || targetPage)
        } else {
          setDjenError(
            result.error || { type: 'UNKNOWN', message: 'Erro ao conduzir a varredura.' },
          )
        }
      } catch (err: any) {
        setDjenError({ type: 'NETWORK', message: err?.message || 'Erro inesperado na consulta.' })
      } finally {
        setIsLoadingMore(false)
      }
      return
    }

    // Varredura principal: abre o painel de operação
    setScanOpen(true)
    scanOpenRef.current = true
    scanLinesRef.current = []
    setScanLines([])
    setDjenError(null)
    setScanPhase('channel')
    pushLog({ marker: 'RUN', text: 'Estabelecendo canal seguro com a malha NOX', tone: 'cyan' })

    try {
      pushLog({
        marker: 'OK',
        text: 'Canal seguro estabelecido com a malha NOX',
        tone: 'cyan',
      })
      pushLog({
        marker: 'RUN',
        text: `Validando âncora OAB/${uf.toUpperCase() || 'MS'} ${oab || 'não informada'}`,
        tone: 'amber',
      })
      setScanPhase('anchor')

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
          if (!scanOpenRef.current) return
          if (status.isWaitingRetry && status.secondsRemaining !== undefined) {
            pushLog({
              marker: 'RUN',
              text: `Malha congestionada. Aguardando ${status.secondsRemaining}s para nova tentativa automática`,
              tone: 'amber',
            })
          }
        },
      )

      if (!scanOpenRef.current) return

      if (!result.success) {
        setScanPhase('failed')
        pushLog({
          marker: 'FAIL',
          text: '[ FALHA ] Malha de varredura indisponível no momento',
          tone: 'crimson',
        })
        setDjenError(result.error || { type: 'UNKNOWN', message: 'Erro ao conduzir a varredura.' })
        setResultados([])
        setTotalApi(null)
        return
      }

      setScanPhase('sweep')
      pushLog({
        marker: 'RUN',
        text: 'Varrendo o Diário de Justiça Eletrônico Nacional',
        tone: 'cyan',
      })

      // Resposta recebida e validada pelo serviço
      pushLog({ marker: 'OK', text: 'Fluxo de leitura confirmado pela malha NOX', tone: 'cyan' })
      setScanPhase('response')

      // Parsing: itens normalizados pelo serviço (mapDjenItemToCommunication)
      const itens = Array.isArray(result.items) ? result.items : []
      pushLog({ marker: 'OK', text: 'Parsing da resposta concluído', tone: 'default' })
      setScanPhase('parsing')

      // Classificação: citações e intimações
      const citacoes = itens.filter((c) => String(c.tipoComunicacao || '').includes('CIT')).length
      const intimacoes = itens.filter((c) =>
        String(c.tipoComunicacao || '').includes('INTIM'),
      ).length
      pushLog({
        marker: 'OK',
        text: `Classificando citações e intimações: ${citacoes} citações, ${intimacoes} intimações`,
        tone: 'default',
      })
      setScanPhase('classifying')

      // Renderização e prazos críticos
      const urgentes = itens.filter(
        (c) => c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica',
      ).length
      pushLog({
        marker: 'OK',
        text: `Identificando prazos críticos: ${urgentes} comunicados de alta prioridade`,
        tone: 'default',
      })
      setScanPhase('deadlines')

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
      setJaBuscou(true)
      setTelemetryKey((k) => k + 1)

      pushLog({
        marker: 'OK',
        text: `Varredura concluída: ${itens.length} publicações capturadas`,
        tone: 'green',
      })
      setScanPhase('done')

      // Recolhimento suave do painel após a conclusão
      window.setTimeout(
        () => {
          if (scanOpenRef.current) {
            setScanOpen(false)
            scanOpenRef.current = false
          }
        },
        reducedMotion ? 400 : 1600,
      )
    } catch (err: any) {
      setScanPhase('failed')
      pushLog({
        marker: 'FAIL',
        text: '[ FALHA ] Malha de varredura indisponível no momento',
        tone: 'crimson',
      })
      setDjenError({ type: 'NETWORK', message: err?.message || 'Erro inesperado na consulta.' })
      setResultados([])
      setTotalApi(null)
    }
  }

  const iniciarVarredura = () => {
    setBtnPulse((k) => k + 1)
    executarBusca(1, false)
  }

  const repetirVarredura = () => {
    setScanOpen(false)
    scanOpenRef.current = false
    window.setTimeout(() => executarBusca(1, false), 250)
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
    setDjenError(null)
    setExpandidoId(null)
    setJaBuscou(false)
    setScanOpen(false)
    scanOpenRef.current = false
    setScanPhase('idle')
  }

  // Atalhos: Enter dispara a varredura; Esc limpa os parâmetros
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')
      if (e.key === 'Enter' && !inField && !scanOpenRef.current) {
        e.preventDefault()
        executarBusca(1, false)
      }
      if (e.key === 'Escape') {
        limparFiltros()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [executarBusca, limparFiltros, scanOpenRef])

  // Rótulos de erro sem citar fonte, endpoint ou provedor
  const erroTitulo =
    djenError?.type === 'RATE_LIMIT_429'
      ? 'Malha congestionada (HTTP 429)'
      : djenError?.type === 'FORBIDDEN_403'
        ? 'Malha de varredura bloqueada (HTTP 403)'
        : djenError?.type === 'CORS'
          ? 'Restrição de rede ao atingir a malha NOX'
          : '[ FALHA ] Malha de varredura indisponível no momento'

  // Detalhe de erro redigido pela própria ferramenta: nunca exibe o texto
  // bruto do serviço (que cita fontes e infraestrutura externas)
  const erroDetalhe =
    djenError?.type === 'RATE_LIMIT_429'
      ? 'O Pulso alcançou o limite de leitura momentânea da malha. Aguarde cerca de 1 minuto e repita a varredura.'
      : djenError?.type === 'FORBIDDEN_403'
        ? 'A leitura foi recusada pela malha externa. Verifique a conexão da rede atual e repita a varredura.'
        : djenError?.type === 'CORS'
          ? 'A rede local bloqueou a leitura momentânea. Verifique sua conexão com a internet e repita a varredura.'
          : 'A varredura não pôde ser concluída agora. Verifique a conexão e repita em instantes.'

  return (
    <div className="min-h-screen text-slate-200 relative">
      <NoxPulsarBackdrop />
      <div className="relative z-10 max-w-7xl mx-auto px-3 py-5 sm:px-6 sm:py-8 space-y-5">
        {/* Cabeçalho de comando */}
        <header className="nox-glass relative rounded-2xl p-5 sm:p-6">
          <span className="nox-corner nox-corner-tl" />
          <span className="nox-corner nox-corner-tr" />
          <span className="nox-corner nox-corner-bl" />
          <span className="nox-corner nox-corner-br" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <NoxPulsarMark state={markState} size={52} />
              <div>
                <h1
                  className="text-xl sm:text-2xl font-bold uppercase text-[#F5B301]"
                  style={{
                    fontFamily: "'Space Grotesk', 'Sora', system-ui, sans-serif",
                    letterSpacing: '0.22em',
                  }}
                >
                  NOX Pulsar
                </h1>
                <p className="mt-1 text-[11px] sm:text-xs font-mono uppercase tracking-[0.18em] text-slate-400">
                  Varredura do Diário de Justiça Eletrônico Nacional
                </p>
                <p className="nox-author-credit mt-1.5">
                  <span className="nox-credit-sep">◆</span>
                  <span>
                    Uma criação de <strong>Higor Utinoi</strong>{' '}
                    <span className="nox-credit-sep">·</span> NOX Intelligence
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`nox-status-pill ${
                  scanPhase === 'failed'
                    ? ''
                    : scanPhase === 'done'
                      ? 'nox-status-done'
                      : scanOpen
                        ? 'nox-status-scanning'
                        : 'nox-status-vigil'
                }`}
              >
                <span className="nox-status-dot" />
                {scanPhase === 'failed'
                  ? 'Falha na varredura'
                  : scanPhase === 'done'
                    ? 'Varredura concluída'
                    : scanOpen
                      ? 'Varredura em curso'
                      : 'Em vigília'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums tracking-widest">
                {formatClock(agora)}
              </span>
              <span
                className="text-[11px] font-mono px-2.5 py-1 rounded-full border"
                style={{
                  borderColor: 'rgba(245,179,1,0.4)',
                  color: '#FCD34D',
                  background: 'rgba(245,179,1,0.06)',
                }}
              >
                Âncora ativa: OAB/{uf.toUpperCase() || 'MS'} {oab}
              </span>
            </div>
          </div>

          {/* Selo de garantia discreto */}
          <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-center">
            <div className="nox-assurance-line">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Varredura soberana</span>
              <span className="text-slate-700">·</span>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Zero armazenamento</span>
              <span className="text-slate-700">·</span>
              <Database className="w-3.5 h-3.5" />
              <span>Leitura momentânea, nada fica guardado</span>
            </div>
          </div>
        </header>

        {/* Console de parâmetros */}
        <section className="nox-glass nox-glow-surface relative rounded-2xl p-5 sm:p-6 space-y-4">
          <span className="nox-corner nox-corner-tl" />
          <span className="nox-corner nox-corner-tr" />
          <span className="nox-corner nox-corner-bl" />
          <span className="nox-corner nox-corner-br" />

          <div className="flex items-center gap-2.5">
            <ScanLine className="w-4 h-4 text-[#22D3EE]" />
            <h2
              className="text-xs font-bold uppercase text-slate-300"
              style={{
                fontFamily: "'Space Grotesk', 'Sora', system-ui, sans-serif",
                letterSpacing: '0.2em',
              }}
            >
              Protocolo de consulta
            </h2>
          </div>

          <div ref={paramsGlowRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="nox-label" htmlFor="cxp-modo">
                Protocolo de busca <span className="nox-fixed-chip">Fixo</span>
              </label>
              <div className="relative">
                <select
                  id="cxp-modo"
                  value={modo}
                  disabled
                  aria-readonly="true"
                  title="Protocolo de busca fixo: não editável"
                  className="nox-field nox-field-locked cursor-not-allowed select-none"
                >
                  <option value="oab">Âncora OAB</option>
                  <option value="nome">Nome da parte ou advogado</option>
                  <option value="processo">Número do processo</option>
                </select>
                <Lock className="nox-lock-icon" aria-hidden />
              </div>
            </div>

            {modo === 'oab' && (
              <div>
                <label className="nox-label">
                  Âncora profissional <span className="nox-fixed-chip">Fixo</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={oab}
                      readOnly
                      disabled
                      aria-readonly="true"
                      title="Âncora fixa: não editável"
                      aria-label="Número da OAB"
                      className="nox-field nox-field-locked cursor-not-allowed select-none font-mono text-[#F5B301]"
                    />
                    <Lock className="nox-lock-icon" aria-hidden />
                  </div>
                  <div className="relative w-20">
                    <input
                      value={uf}
                      readOnly
                      disabled
                      aria-readonly="true"
                      title="Âncora fixa: não editável"
                      aria-label="UF da OAB"
                      className="nox-field nox-field-locked cursor-not-allowed select-none font-mono uppercase"
                    />
                    <Lock className="nox-lock-icon nox-lock-icon-compact" aria-hidden />
                  </div>
                </div>
              </div>
            )}

            {modo === 'nome' && (
              <div>
                <label className="nox-label">
                  Âncora profissional <span className="nox-fixed-chip">Fixo</span>
                </label>
                <div className="relative">
                  <input
                    value={advogado}
                    readOnly
                    disabled
                    aria-readonly="true"
                    title="Âncora fixa: não editável"
                    className="nox-field nox-field-locked cursor-not-allowed select-none"
                  />
                  <Lock className="nox-lock-icon" aria-hidden />
                </div>
              </div>
            )}

            {modo === 'processo' && (
              <div>
                <label className="nox-label">
                  Âncora profissional <span className="nox-fixed-chip">Fixo</span>
                </label>
                <div className="relative">
                  <input
                    value={processoInput}
                    readOnly
                    disabled
                    aria-readonly="true"
                    title="Âncora fixa: não editável"
                    className="nox-field nox-field-locked cursor-not-allowed select-none font-mono text-cyan-300"
                  />
                  <Lock className="nox-lock-icon" aria-hidden />
                </div>
              </div>
            )}

            <div>
              <label className="nox-label">Parte monitorada</label>
              <div className="relative">
                <input
                  value={parte}
                  onChange={(e) => setParte(e.target.value)}
                  placeholder="Filtrar por parte"
                  className="nox-field"
                />
                <span className="nox-field-line" />
              </div>
            </div>

            <div>
              <label className="nox-label">Malha de tribunais</label>
              <select
                value={tribunal}
                onChange={(e) => setTribunal(e.target.value)}
                className="nox-field"
                aria-label="Malha de tribunais"
              >
                {TRIBUNAIS_BRASIL.map((trib) => (
                  <option key={trib.sigla || 'all'} value={trib.sigla}>
                    {trib.sigla
                      ? `${trib.sigla}: ${trib.nome.replace(/^[A-Z0-9]+\s*[—–-]\s*/, '')}`
                      : trib.nome}
                  </option>
                ))}
              </select>
              <span className="nox-field-line" />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="nox-label">Janela temporal (de / até)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={dataIni}
                    onChange={(e) => setDataIni(e.target.value)}
                    aria-label="Data inicial"
                    className="nox-field font-mono"
                  />
                  <span className="nox-field-line" />
                </div>
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    aria-label="Data final"
                    className="nox-field font-mono"
                  />
                  <span className="nox-field-line" />
                </div>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/60">
            <button
              onClick={iniciarVarredura}
              disabled={scanOpen}
              key={`btn-${btnPulse}`}
              className={`nox-btn-scan ${scanOpen ? 'nox-btn-progress' : 'nox-btn-pulse'}`}
            >
              {scanOpen && <span className="nox-btn-progress-bar" />}
              <span className="relative z-10 inline-flex items-center gap-2">
                <Radar className="w-4 h-4" />
                {scanOpen ? 'Varrendo' : 'Iniciar Varredura'}
              </span>
            </button>
            <button onClick={limparFiltros} className="nox-btn-ghost">
              Redefinir Parâmetros
            </button>
            <span className="text-[10px] font-mono text-slate-500 ml-auto hidden sm:inline">
              Enter dispara a varredura · Esc redefine
            </span>
          </div>
        </section>

        {/* Painel de operação (radar + log honesto) */}
        {scanOpen && (
          <ScanOperationPanel
            open={scanOpen}
            phase={scanPhase}
            lines={scanLines}
            onRetry={repetirVarredura}
            activeAnchor={`OAB/${uf.toUpperCase() || 'MS'} ${oab}`}
          />
        )}

        {/* Erro da varredura (fora do painel, persistente) */}
        {djenError && !scanOpen && (
          <div className="relative rounded-xl border border-rose-800/70 bg-rose-950/30 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-rose-300 font-mono uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{erroTitulo}</span>
              </div>
              <span className="text-[9px] font-mono border border-rose-700 text-rose-300 px-2 py-0.5 rounded-full">
                {djenError.type}
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{erroDetalhe}</p>
            <button
              onClick={iniciarVarredura}
              className="px-3 py-1.5 rounded-md border border-rose-700 text-rose-200 hover:bg-rose-950/60 transition-colors text-[11px] font-semibold"
            >
              Repetir varredura
            </button>
          </div>
        )}

        {/* Painel de telemetria: os quatro cartões */}
        <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TELEMETRY_CARDS.map((card) => {
            const valor =
              card.value === 'todos'
                ? resultados.length
                : card.value === 'citacao'
                  ? totalCitacoes
                  : card.value === 'intimacao'
                    ? totalIntimacoes
                    : totalUrgentes
            return (
              <TelemetryCard
                key={card.value}
                label={card.label}
                value={valor}
                color={card.color}
                accent={card.accent}
                active={filtroTipo === card.value}
                isCritical={card.value === 'urgente'}
                animateKey={telemetryKey}
                reducedMotion={reducedMotion}
                onClick={() => {
                  setFiltroTipo(card.value)
                  setPaginaLocal(1)
                }}
              />
            )
          })}
        </section>

        {/* Lista de resultados (somente leitura) */}
        <div>
          {/* Barra de exportação: visível quando a varredura já foi conduzida */}
          {jaBuscou && (
            <section className="nox-glass relative rounded-xl px-4 py-2.5 mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="nox-corner nox-corner-tl" />
              <span className="nox-corner nox-corner-tr" />
              <span className="nox-corner nox-corner-bl" />
              <span className="nox-corner nox-corner-br" />
              <div className="flex items-center gap-2 min-w-0">
                <FileDown className="w-4 h-4 text-[#F5B301] shrink-0" />
                <span className="text-[11px] font-mono text-slate-400 truncate">
                  Exportar a varredura atual em PDF formatado
                </span>
              </div>
              <div className="flex items-center gap-2">
                {exportAviso && (
                  <span
                    className={`text-[10px] font-mono px-2 py-1 rounded-md border ${
                      exportAviso.startsWith('Nenhuma')
                        ? 'border-amber-700/70 text-amber-300 bg-amber-950/30'
                        : 'border-rose-700/70 text-rose-300 bg-rose-950/30'
                    }`}
                  >
                    {exportAviso}
                  </span>
                )}
                <button
                  onClick={handleExportarPdf}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  style={{
                    borderColor: 'rgba(245,179,1,0.5)',
                    color: '#F5B301',
                    background: 'rgba(245,179,1,0.06)',
                  }}
                >
                  <FileDown className="w-3.5 h-3.5" />
                  {exporting ? 'Gerando PDF' : 'Exportar PDF'}
                </button>
              </div>
            </section>
          )}
          <section className="space-y-3">
            {paginadas.length === 0 ? (
              <div className="nox-glass relative rounded-2xl p-14 text-center space-y-3">
                <span className="nox-corner nox-corner-tl" />
                <span className="nox-corner nox-corner-tr" />
                <span className="nox-corner nox-corner-bl" />
                <span className="nox-corner nox-corner-br" />
                <Radar className="w-9 h-9 mx-auto text-slate-600" />
                <div
                  className="text-sm font-bold uppercase tracking-[0.2em] text-slate-300"
                  style={{ fontFamily: "'Space Grotesk', 'Sora', system-ui, sans-serif" }}
                >
                  {jaBuscou
                    ? 'Nenhuma publicação no período. O Pulso segue em vigília.'
                    : 'O Pulso segue em vigília.'}
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {jaBuscou
                    ? 'Ajuste a janela temporal, a malha de tribunais ou a parte monitorada e inicie uma nova varredura.'
                    : 'Confira o protocolo de busca acima e inicie a varredura para capturar as publicações.'}
                </p>
              </div>
            ) : (
              paginadas.map((comm, idx) => (
                <PublicationCard
                  key={comm.id}
                  comm={comm}
                  index={idx}
                  expanded={expandidoId === comm.id}
                  reducedMotion={reducedMotion}
                  onToggle={() => setExpandidoId(expandidoId === comm.id ? null : comm.id)}
                />
              ))
            )}
          </section>
        </div>

        {/* Rodapé de paginação */}
        {jaBuscou && (
          <PaginationFooter
            first={filtradas.length === 0 ? 0 : (paginaLocal - 1) * DJEN_PAGE_SIZE + 1}
            last={Math.min(paginaLocal * DJEN_PAGE_SIZE, filtradas.length)}
            total={filtradas.length}
            totalApi={totalApi}
            paginaLocal={paginaLocal}
            totalPaginas={totalPaginas}
            canLoadMore={totalApi !== null && totalApi > resultados.length}
            isLoadingMore={isLoadingMore}
            proximaPagina={paginaApi + 1}
            onPrev={() => setPaginaLocal((p) => Math.max(1, p - 1))}
            onNext={() => setPaginaLocal((p) => Math.min(totalPaginas, p + 1))}
            onLoadMore={() => executarBusca(paginaApi + 1, true)}
          />
        )}

        {/* Rodapé isolado, sem links para o sistema interno */}
        <footer className="pt-3 pb-6 flex flex-col items-center gap-2 text-center">
          <NoxPulsarMark state={markState} size={34} />
          <p className="nox-author-credit">
            <span className="nox-credit-sep">◆</span>
            <span>
              Desenvolvido por <strong>Higor Utinoi</strong>{' '}
              <span className="nox-credit-sep">·</span> NOX Intelligence
            </span>
          </p>
          <p className="text-[10px] font-mono text-slate-600 tracking-wide">
            NOX Pulsar · Ferramenta de consulta externa · Nenhum dado é gravado em banco ou no
            sistema interno
          </p>
        </footer>
      </div>
    </div>
  )
}

export default ConsultaPublicaPage
