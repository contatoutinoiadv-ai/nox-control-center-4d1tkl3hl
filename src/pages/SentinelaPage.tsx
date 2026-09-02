import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  TrendingUp,
  Brain,
  Zap,
  Users,
  Search,
  ChevronRight,
  Sparkles,
  LifeBuoy,
  HelpCircle,
  Eye,
  Bell,
  Scale,
  Calendar,
  CheckSquare,
} from 'lucide-react'
import {
  SentinelaCommunication,
  DailyBriefingData,
  RecoveredTimeMetric,
  OperationalTwinCapacity,
  GapItem,
  DecisionMemoryItem,
  IncidentCrisisRoom,
} from '@/types/sentinela'
import {
  fetchDjenCommunicationsDirect,
  TRIBUNAIS_BRASIL,
  DjenSearchResult,
} from '@/services/djenService'
import { dataStore } from '@/services/dataStore'
import { calculateLegalDeadline } from '@/services/deadlineEngine'
import {
  queryOraculoGemini,
  analyzeBatchWithGemini,
  buildSentinelaContext,
  OraculoMessage,
} from '@/services/aiOraculoService'
import { CustodyChainTimeline } from '@/components/CustodyChainTimeline'
import { DeadlineCalculatorView } from '@/components/DeadlineCalculatorView'
import { AgendaView } from '@/components/AgendaView'
import { TasksView } from '@/components/TasksView'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export type SentinelaSubArea =
  | 'pulso'
  | 'comunicacoes'
  | 'triagem'
  | 'sala_situacao'
  | 'prazos'
  | 'processos'
  | 'automacoes'
  | 'saude'

export const SentinelaHub: React.FC = () => {
  const navigate = useNavigate()
  const { subarea } = useParams<{ subarea?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const resolveSubArea = (): SentinelaSubArea => {
    const raw = (
      subarea ||
      searchParams.get('tab') ||
      searchParams.get('area') ||
      'pulso'
    ).toLowerCase()
    if (raw === 'sala-situacao' || raw === 'sala_situacao' || raw === 'sala' || raw === 'crise')
      return 'sala_situacao'
    if (raw === 'saude-gemeo' || raw === 'saude' || raw === 'gemeo') return 'saude'
    if (raw === 'dossie' || raw === 'processo' || raw === 'processos') return 'processos'
    if (raw === 'comunicacao' || raw === 'comunicacoes' || raw === 'djen') return 'comunicacoes'
    if (raw === 'prazo' || raw === 'prazos' || raw === 'memorial') return 'prazos'
    if (raw === 'automacao' || raw === 'automacoes' || raw === 'regras') return 'automacoes'
    if (raw === 'triagem') return 'triagem'
    if (raw === 'pulso') return 'pulso'
    return 'pulso'
  }

  const [activeSubTab, setActiveSubTabState] = useState<SentinelaSubArea>(resolveSubArea)

  // Sync state with URL params
  useEffect(() => {
    const nextArea = resolveSubArea()
    setActiveSubTabState(nextArea)
  }, [subarea, searchParams])

  const handleSubTabChange = (areaId: SentinelaSubArea) => {
    setActiveSubTabState(areaId)
    navigate(`/sentinela/${areaId}`, { replace: true })
  }

  const [communications, setCommunications] = useState<SentinelaCommunication[]>(
    dataStore.getCommunications(),
  )
  const [briefing, setBriefing] = useState<DailyBriefingData>(dataStore.getDailyBriefing())
  const [recoveredTime, setRecoveredTime] = useState<RecoveredTimeMetric>(
    dataStore.getRecoveredTimeMetric(),
  )
  const [twin, setTwin] = useState<OperationalTwinCapacity[]>(dataStore.getOperationalTwin())
  const [gaps, setGaps] = useState<GapItem[]>(dataStore.getGaps())
  const [memory, setMemory] = useState<DecisionMemoryItem[]>(dataStore.getDecisionMemory())
  const [incidents, setIncidents] = useState<IncidentCrisisRoom[]>(dataStore.getIncidents())
  const [automations, setAutomations] = useState(dataStore.getAutomations())
  const [apiHealth, setApiHealth] = useState(dataStore.getApiHealth())

  // Central dataStore real-time subscription
  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setCommunications(dataStore.getCommunications())
      setBriefing(dataStore.getDailyBriefing())
      setRecoveredTime(dataStore.getRecoveredTimeMetric())
      setTwin(dataStore.getOperationalTwin())
      setGaps(dataStore.getGaps())
      setMemory(dataStore.getDecisionMemory())
      setIncidents(dataStore.getIncidents())
      setAutomations(dataStore.getAutomations())
      setApiHealth(dataStore.getApiHealth())
    })
    return unsub
  }, [])

  // Selected Item for Detail Modal
  const [selectedComm, setSelectedComm] = useState<SentinelaCommunication | null>(null)
  const [selectedCommModalOpen, setSelectedCommModalOpen] = useState(false)
  const [searchComm, setSearchComm] = useState('')
  const [triageFilter, setTriageFilter] = useState<string>('TODOS')

  const handleOpenComm = (comm: SentinelaCommunication) => {
    setSelectedComm(comm)
    setSelectedCommModalOpen(true)
  }

  const handleAdvanceStatus = (commId: string, nextStatus: SentinelaCommunication['status']) => {
    dataStore.advanceCommunicationStatus(
      commId,
      nextStatus,
      'Operador NOX',
      'Validação realizada no Sentinela NOX',
    )
    setCommunications(dataStore.getCommunications())
    toast.success(`Comunicação avançada para o estágio "${nextStatus}".`)
    if (selectedComm?.id === commId) {
      setSelectedComm(dataStore.getCommunicationById(commId) || null)
    }
  }

  const handleApproveDeadline = (commId: string, memorial: any) => {
    const lawyerName = dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira'
    dataStore.approveCommunicationDeadline(commId, memorial, lawyerName)
    setCommunications(dataStore.getCommunications())
    setRecoveredTime(dataStore.getRecoveredTimeMetric())
    toast.success('Prazo homologado e tarefas geradas na Agenda!')
    setSelectedCommModalOpen(false)
  }

  // --- RECONCILED DJEN STATE (Browser Client Fetch Direto à ComunicaAPI) ---
  const [djenModo, setDjenModo] = useState<'oab' | 'nome' | 'processo'>('oab')
  const [djenOab, setDjenOab] = useState('15400')
  const [djenUf, setDjenUf] = useState('MS')
  const [djenAdvogado, setDjenAdvogado] = useState('Higor Utinói')
  const [djenParte, setDjenParte] = useState('')
  const [djenProcessoInput, setDjenProcessoInput] = useState('')
  // Padrão: VAZIO = todos os tribunais do Brasil (exigência explícita do DJEN)
  const [djenTribunal, setDjenTribunal] = useState('')
  const [djenDataIni, setDjenDataIni] = useState(new Date().toISOString().split('T')[0])
  const [djenDataFim, setDjenDataFim] = useState(new Date().toISOString().split('T')[0])
  const [djenFilterType, setDjenFilterType] = useState<
    'todos' | 'citacao' | 'intimacao' | 'urgente' | 'analisado'
  >('todos')
  const [djenLocalPage, setDjenLocalPage] = useState(1)
  const [isDjenSearching, setIsDjenSearching] = useState(false)
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false)

  // Estado da API Remota (ComunicaAPI / DJEN CNJ)
  const [djenApiPage, setDjenApiPage] = useState(1)
  const [djenTotalApiCount, setDjenTotalApiCount] = useState<number | null>(null)
  const [isDjenLoadingMore, setIsDjenLoadingMore] = useState(false)
  const [djenApiStatusMessage, setDjenApiStatusMessage] = useState<string | null>(null)
  const [djenErrorState, setDjenErrorState] = useState<DjenSearchResult['error'] | null>(null)
  const [djenRetryRemaining, setDjenRetryRemaining] = useState<number | null>(null)
  const [djenLastSourceUrl, setDjenLastSourceUrl] = useState<string>(
    'https://comunicaapi.pje.jus.br/api/v1/comunicacao',
  )

  const [analyzingProgress, setAnalyzingProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  // Side Drawer NOX Analysis State
  const [noxPanelOpen, setNoxPanelOpen] = useState(false)
  const [noxActiveComm, setNoxActiveComm] = useState<SentinelaCommunication | null>(null)
  const [isNoxAnalyzing, setIsNoxAnalyzing] = useState(false)

  // Managerial Chat (ORÁCULO NOX) State
  const [isGerencialOpen, setIsGerencialOpen] = useState(false)
  const [gerencialMessages, setGerencialMessages] = useState<OraculoMessage[]>([])
  const [gerencialInput, setGerencialInput] = useState('')
  const [isGerencialSending, setIsGerencialSending] = useState(false)
  const [aiStatusBadge, setAiStatusBadge] = useState<{
    text: string
    variant: 'gemini' | 'local'
  }>({ text: 'GEMINI ATIVO', variant: 'gemini' })

  // Inline Calculator State per Card { [commId]: { days, isBusiness, date, calculatedDate, memorial } }
  const [inlineCalcState, setInlineCalcState] = useState<
    Record<
      string,
      { days: number; comarca: string; resultDate?: string; diffDays?: number; scheduled?: boolean }
    >
  >({})

  // DJEN Search Action — Chamada DIRETA via fetch() do navegador à API pública ComunicaAPI/DJEN
  const handleDjenSearch = async (targetPage = 1) => {
    setIsDjenSearching(true)
    setDjenErrorState(null)
    setDjenApiStatusMessage('Consultando ComunicaAPI do CNJ diretamente do navegador...')
    setDjenRetryRemaining(null)

    try {
      const result = await fetchDjenCommunicationsDirect(
        {
          itensPorPagina: 100,
          pagina: targetPage,
          meio: 'D',
          numeroProcesso: djenProcessoInput,
          numeroOab: djenOab,
          ufOab: djenUf,
          nomeAdvogado: djenAdvogado,
          nomeParte: djenParte,
          siglaTribunal: djenTribunal,
          dataDisponibilizacaoInicio: djenDataIni,
          dataDisponibilizacaoFim: djenDataFim,
          modo: djenModo,
        },
        undefined,
        (status) => {
          setDjenApiStatusMessage(status.message)
          if (status.secondsRemaining !== undefined) {
            setDjenRetryRemaining(status.secondsRemaining)
          }
        },
      )

      setDjenLastSourceUrl(result.sourceUrl)
      setDjenApiPage(result.currentPage)

      if (!result.success) {
        setDjenErrorState(result.error || { type: 'UNKNOWN', message: 'Erro ao consultar DJEN' })
        toast.error(result.error?.message || 'Falha na comunicação direta com DJEN/CNJ.')
        return
      }

      setDjenTotalApiCount(result.totalCount)
      setDjenCommunicationsFromApi(result.items, targetPage > 1)
      setDjenLocalPage(1)

      const tribunalLabel = djenTribunal
        ? `Tribunal: ${djenTribunal}`
        : 'Todos os Tribunais do Brasil'
      toast.success(
        `ComunicaAPI: ${result.items.length} publicação(ões) capturada(s) em tempo real (${tribunalLabel}).`,
      )
    } catch (err: any) {
      const msg = err?.message || 'Erro inesperado na consulta ao DJEN.'
      setDjenErrorState({ type: 'NETWORK', message: msg })
      toast.error(msg)
    } finally {
      setIsDjenSearching(false)
      setDjenApiStatusMessage(null)
      setDjenRetryRemaining(null)
    }
  }

  // Carregar Próxima Página da API Remota do DJEN (Paginação "Carregar Mais")
  const handleDjenLoadMore = async () => {
    if (isDjenLoadingMore || isDjenSearching) return
    const nextPage = djenApiPage + 1
    setIsDjenLoadingMore(true)
    setDjenErrorState(null)
    setDjenApiStatusMessage(`Buscando página ${nextPage} da ComunicaAPI...`)

    try {
      // Intervalo de segurança preventivo entre chamadas consecutivas para evitar 429
      await new Promise((resolve) => setTimeout(resolve, 800))

      const result = await fetchDjenCommunicationsDirect(
        {
          itensPorPagina: 100,
          pagina: nextPage,
          meio: 'D',
          numeroProcesso: djenProcessoInput,
          numeroOab: djenOab,
          ufOab: djenUf,
          nomeAdvogado: djenAdvogado,
          nomeParte: djenParte,
          siglaTribunal: djenTribunal,
          dataDisponibilizacaoInicio: djenDataIni,
          dataDisponibilizacaoFim: djenDataFim,
          modo: djenModo,
        },
        undefined,
        (status) => {
          setDjenApiStatusMessage(status.message)
          if (status.secondsRemaining !== undefined) {
            setDjenRetryRemaining(status.secondsRemaining)
          }
        },
      )

      setDjenLastSourceUrl(result.sourceUrl)

      if (!result.success) {
        setDjenErrorState(
          result.error || { type: 'UNKNOWN', message: 'Erro ao carregar mais publicações' },
        )
        toast.error(result.error?.message || 'Falha ao carregar página adicional do DJEN.')
        return
      }

      setDjenApiPage(nextPage)
      setDjenTotalApiCount(result.totalCount)
      setDjenCommunicationsFromApi(result.items, true)
      toast.success(`+${result.items.length} publicações adicionadas do DJEN/CNJ.`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao carregar mais dados do DJEN.')
    } finally {
      setIsDjenLoadingMore(false)
      setDjenApiStatusMessage(null)
      setDjenRetryRemaining(null)
    }
  }

  // Atualiza ou mescla publicações recebidas da ComunicaAPI mantendo o estado local
  const setDjenCommunicationsFromApi = (newItems: SentinelaCommunication[], append = false) => {
    if (!append) {
      setCommunications(newItems)
    } else {
      setCommunications((prev) => {
        const existingIds = new Set(prev.map((c) => c.externalId || c.id))
        const uniqueNew = newItems.filter((c) => !existingIds.has(c.externalId || c.id))
        return [...prev, ...uniqueNew]
      })
    }
  }

  const handleDjenClear = () => {
    const today = new Date().toISOString().split('T')[0]
    setDjenDataIni(today)
    setDjenDataFim(today)
    setDjenProcessoInput('')
    setDjenParte('')
    setDjenTribunal('') // Padrão: VAZIO = todos os tribunais
    setDjenModo('oab')
    setDjenOab('15400')
    setDjenUf('MS')
    setDjenAdvogado('Higor Utinói')
    setDjenFilterType('todos')
    setDjenLocalPage(1)
    setDjenApiPage(1)
    setDjenTotalApiCount(null)
    setDjenErrorState(null)
    setDjenApiStatusMessage(null)
    toast.info(
      'Filtros DJEN resetados para os valores padrão (OAB/MS 15.400 - Todos os Tribunais).',
    )
  }

  // NOX Single Analysis Action
  const handleAnalyzeWithNox = (comm: SentinelaCommunication) => {
    setNoxActiveComm(comm)
    setNoxPanelOpen(true)
    setIsNoxAnalyzing(true)

    setTimeout(() => {
      setIsNoxAnalyzing(false)
      dataStore.advanceCommunicationStatus(
        comm.id,
        'ANALISADA',
        'ORÁCULO NOX (IA)',
        'Análise jurídica estratégica concluída com extração de prazo e urgência.',
      )
      setCommunications(dataStore.getCommunications())
      toast.success('Análise estratégica NOX concluída para o processo ' + comm.numeroProcesso)
    }, 800)
  }

  // NOX Batch Analysis ("Analisar Todos") com Google Gemini
  const handleAnalyzeAllWithNox = async () => {
    const pending = communications.filter(
      (c) => c.status !== 'ANALISADA' && c.status !== 'CONCLUIDA',
    )
    if (pending.length === 0) {
      toast.info('Todas as publicações já foram analisadas pelo Sentinela NOX.')
      return
    }

    setIsAnalyzingAll(true)
    setAnalyzingProgress({ current: 0, total: pending.length })

    // Dispara análise real via backend Google Gemini
    const batchResult = await analyzeBatchWithGemini(pending)

    for (let i = 0; i < pending.length; i++) {
      setAnalyzingProgress({ current: i + 1, total: pending.length })
      await new Promise((resolve) => setTimeout(resolve, 150))
      dataStore.advanceCommunicationStatus(
        pending[i].id,
        'ANALISADA',
        batchResult.isFallback ? 'ORÁCULO NOX (Lote Local)' : 'ORÁCULO NOX (Gemini Lote)',
        `Análise em lote (${batchResult.model}): ${batchResult.summary.slice(0, 100)}...`,
      )
    }

    setCommunications(dataStore.getCommunications())
    setIsAnalyzingAll(false)
    setAnalyzingProgress(null)
    if (batchResult.isFallback) {
      toast.info(`Análise em lote concluída (Modo Local): ${pending.length} publicação(ões).`)
    } else {
      toast.success(
        `Análise em lote com Google Gemini concluída: ${pending.length} publicação(ões).`,
      )
    }
  }

  // Schedule to Agenda from Sentinela
  const handleScheduleFromSentinela = (comm: SentinelaCommunication, targetDate?: string) => {
    const eventId = `agenda_${Date.now()}`
    const finalDate =
      targetDate || comm.deadlineCalculated?.finalDeadlineDate || comm.dataDisponibilizacao
    dataStore.addAgendaEvent({
      id: eventId,
      title: `[DJEN] ${comm.numeroProcesso} — ${comm.tipoComunicacao}`,
      description: `Publicação DJEN ${comm.tribunal}: ${comm.teorResumido}`,
      eventType: 'VENCIMENTO_PRAZO',
      startDate: `${finalDate}T09:00:00Z`,
      endDate: `${finalDate}T18:00:00Z`,
      isAllDay: true,
      isVirtual: false,
      processNumber: comm.numeroProcesso,
      responsible: comm.assignedTo || dataStore.getLawyerProfile().nome,
      participants: [comm.assignedTo || dataStore.getLawyerProfile().nome],
      tribunal: comm.tribunal,
      communicationId: comm.id,
      status: 'AGENDADO',
      remindersMinutesBefore: [1440, 240, 60],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    toast.success(`Prazo agendado na Agenda Operacional para ${finalDate}!`)
  }

  // Schedule All Urgent to Agenda
  const handleScheduleAllUrgent = () => {
    const urgentes = communications.filter(
      (c) => c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica',
    )
    urgentes.forEach((comm) => {
      const finalDate = comm.deadlineCalculated?.finalDeadlineDate || comm.dataDisponibilizacao
      dataStore.addAgendaEvent({
        id: `agenda_${Date.now()}_${comm.id}`,
        title: `[DJEN URGENTE] ${comm.numeroProcesso} — ${comm.tipoComunicacao}`,
        description: `Tribunal ${comm.tribunal}: ${comm.teorResumido}`,
        eventType: 'VENCIMENTO_PRAZO',
        startDate: `${finalDate}T09:00:00Z`,
        endDate: `${finalDate}T18:00:00Z`,
        isAllDay: true,
        isVirtual: false,
        processNumber: comm.numeroProcesso,
        responsible: comm.assignedTo || dataStore.getLawyerProfile().nome,
        participants: [comm.assignedTo || dataStore.getLawyerProfile().nome],
        tribunal: comm.tribunal,
        communicationId: comm.id,
        status: 'AGENDADO',
        remindersMinutesBefore: [1440, 60],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })
    toast.success(`${urgentes.length} prazo(s) urgente(s) agendado(s) na Agenda Geral!`)
  }

  // Inline Calculator per Publication
  const handleInlineCalcExecute = (
    commId: string,
    initialDate: string,
    days: number,
    tribunal: string,
  ) => {
    const calc = calculateLegalDeadline({
      originText: 'Cálculo inline Sentinela NOX',
      customDays: days,
      customDaysType: 'uteis',
      initialDate,
      tribunal,
    })
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(calc.finalDeadlineDate + 'T00:00:00')
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

    setInlineCalcState((prev) => ({
      ...prev,
      [commId]: {
        days,
        comarca: tribunal,
        resultDate: calc.finalDeadlineDate,
        diffDays,
        scheduled: false,
      },
    }))
    toast.info(`Prazo calculado: ${calc.finalDeadlineDate} (${diffDays} dias restantes)`)
  }

  // Export to Markdown
  const handleExportMarkdown = () => {
    let md = `# RELATÓRIO SENTINELA NOX — DJEN / PUBLICAÇÕES\n`
    md += `*Gerado em: ${new Date().toLocaleString('pt-BR')}*\n`
    md += `*Advogado Âncora: ${dataStore.getLawyerProfile().nome} (${dataStore.getLawyerProfile().oab})*\n\n`
    md += `## 1. Resumo Quantitativo\n`
    md += `- Total de Comunicações: ${communications.length}\n`
    md += `- Citações: ${communications.filter((c) => c.tipoComunicacao === 'CITACAO').length}\n`
    md += `- Intimações: ${communications.filter((c) => c.tipoComunicacao === 'INTIMACAO').length}\n`
    md += `- Urgentes/Críticas: ${communications.filter((c) => c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica').length}\n\n`
    md += `## 2. Detalhamento de Publicações\n\n`

    communications.forEach((c, idx) => {
      md += `### ${idx + 1}. Processo: ${c.numeroProcesso} (${c.tribunal})\n`
      md += `- **Tipo:** ${c.tipoComunicacao} | **Urgência:** ${c.urgencyLevel.toUpperCase()}\n`
      md += `- **Disponibilização:** ${c.dataDisponibilizacao} | **Destinatário:** ${c.destinatario}\n`
      md += `- **Status:** ${c.status}\n`
      md += `- **Teor:** ${c.teorResumido}\n`
      if (c.deadlineCalculated) {
        md += `- **Vencimento Fatal:** ${c.deadlineCalculated.finalDeadlineDate} (${c.deadlineCalculated.legalRuleName})\n`
      }
      md += `\n---\n\n`
    })

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sentinela_djen_relatorio_${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Relatório Markdown exportado com sucesso!')
  }

  // Export to CSV with Formula Injection Immunity
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Processo',
      'Tribunal',
      'Orgao',
      'Tipo Comunicacao',
      'Data Disponibilizacao',
      'Destinatario',
      'Urgencia',
      'Status',
      'Teor Resumido',
      'Data Fatal',
    ]

    const rows = communications.map((c) => [
      c.id,
      c.numeroProcesso,
      c.tribunal,
      c.orgaoJulgador,
      c.tipoComunicacao,
      c.dataDisponibilizacao,
      c.destinatario,
      c.urgencyLevel,
      c.status,
      c.teorResumido.replace(/[\r\n]+/g, ' '),
      c.deadlineCalculated?.finalDeadlineDate || '',
    ])

    // CSV format with ; and sanitized fields
    const escapeCsv = (val: string) => {
      let str = String(val || '')
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`
      }
      if (str.includes('"') || str.includes(';') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent =
      '\uFEFF' +
      headers.map(escapeCsv).join(';') +
      '\n' +
      rows.map((r) => r.map(escapeCsv).join(';')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sentinela_djen_publicacoes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Planilha CSV protegida exportada com sucesso!')
  }

  // Open Managerial Chat (Oráculo NOX)
  const handleOpenGerencial = async () => {
    setIsGerencialOpen(true)
    if (gerencialMessages.length === 0) {
      const lawyer = dataStore.getLawyerProfile()
      const initialSysMsg: OraculoMessage = {
        id: 'msg-init-1',
        role: 'sys',
        content: `📡 Contexto montado: ${communications.length} publicações carregadas · Tribunal TJMS/Nacional · Âncora ${lawyer.nome} (${lawyer.oab || 'OAB/MS 15.400'}).`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      }

      const defaultDiagnosticMsg: OraculoMessage = {
        id: 'msg-init-2',
        role: 'nox',
        content: `**ORÁCULO NOX — Diagnóstico Executivo Operacional (Google Gemini)**\n\n1. **Panorama Geral:** ${communications.length} publicações monitoradas no período. Identificadas ${communications.filter((c) => c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica').length} publicações de alta urgência com impacto imediato em prazos recursais e audiências.\n2. **Ações Críticas (Próximas 48-72h):** Homologação tempestiva dos prazos de Apelação Cível e alinhamento de prepostos para audiência telepresencial.\n3. **Diretriz:** Utilize o painel lateral para despachar prazos individualmente ou execute a homologação em lote.\n\n---\n**Fonte:** Sentinela NOX / DJEN Integrado\n**Nível de Confiança:** ALTA\n⚠️ *Revisão humana obrigatória por advogado responsável antes de qualquer protocolo.*`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        confidence: 'ALTA',
        sourceInfo: 'Google Gemini (Skip AI Gateway)',
        isFallback: false,
      }

      setGerencialMessages([initialSysMsg, defaultDiagnosticMsg])
    }
  }

  const handleSendGerencial = async () => {
    if (!gerencialInput.trim() || isGerencialSending) return
    const userText = gerencialInput.trim()
    const userMsg: OraculoMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
    }
    const updatedHistory = [...gerencialMessages, userMsg]
    setGerencialMessages(updatedHistory)
    setGerencialInput('')
    setIsGerencialSending(true)

    try {
      const lawyer = dataStore.getLawyerProfile()
      const contexto = buildSentinelaContext(communications, lawyer.nome, lawyer.oab)

      const aiHistory = updatedHistory
        .filter((m) => m.role === 'user' || m.role === 'nox')
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.content,
        }))

      const result = await queryOraculoGemini({
        messages: aiHistory,
        contexto,
        modo: 'oraculo',
        commsFallback: communications,
      })

      // Atualiza badge de estado da IA
      if (result.isFallback) {
        setAiStatusBadge({ text: 'GEMINI INDISPONÍVEL — MODO LOCAL', variant: 'local' })
      } else {
        setAiStatusBadge({ text: 'GEMINI ATIVO', variant: 'gemini' })
      }

      const noxResponse: OraculoMessage = {
        id: `msg_n_${Date.now()}`,
        role: 'nox',
        content: result.content,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        isFallback: result.isFallback,
        model: result.model,
        confidence: result.confidence,
        sourceInfo: result.source,
      }

      setGerencialMessages((prev) => [...prev, noxResponse])
    } catch (err) {
      console.error('[Oraculo NOX] Falha no fluxo:', err)
      setAiStatusBadge({ text: 'GEMINI INDISPONÍVEL — MODO LOCAL', variant: 'local' })
      const fallbackMsg: OraculoMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'nox',
        content: `**ORÁCULO NOX — Resposta em Modo de Contingência Local:**\n\nEm atenção à sua consulta ("${userText}"): recomendamos a conferência direta no DJEN/TJMS e a observância dos prazos com garantia D-2 para prevenção de preclusão.\n\n---\n**Fonte:** Motor Local de Contingência\n**Nível de Confiança:** MÉDIO\n⚠️ *Revisão humana obrigatória por advogado responsável.*`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        isFallback: true,
      }
      setGerencialMessages((prev) => [...prev, fallbackMsg])
    } finally {
      setIsGerencialSending(false)
    }
  }

  // Filtered Communications according to DJEN legacy filters
  const filteredCommunications = communications.filter((comm) => {
    if (djenFilterType === 'citacao' && !comm.tipoComunicacao.includes('CIT')) return false
    if (djenFilterType === 'intimacao' && !comm.tipoComunicacao.includes('INTIM')) return false
    if (
      djenFilterType === 'urgente' &&
      comm.urgencyLevel !== 'alta' &&
      comm.urgencyLevel !== 'critica'
    )
      return false
    if (
      djenFilterType === 'analisado' &&
      comm.status !== 'ANALISADA' &&
      comm.status !== 'CONCLUIDA'
    )
      return false

    if (searchComm) {
      const q = searchComm.toLowerCase()
      const match =
        comm.numeroProcesso.toLowerCase().includes(q) ||
        comm.tribunal.toLowerCase().includes(q) ||
        comm.destinatario.toLowerCase().includes(q) ||
        comm.teorResumido.toLowerCase().includes(q)
      if (!match) return false
    }

    if (djenProcessoInput) {
      const p = djenProcessoInput.replace(/\D/g, '')
      if (p && !comm.numeroProcesso.replace(/\D/g, '').includes(p)) return false
    }

    return true
  })

  // Double Pagination: 10 per local screen page
  const DJEN_PAGE_SIZE = 10
  const totalLocalPages = Math.max(1, Math.ceil(filteredCommunications.length / DJEN_PAGE_SIZE))
  const paginatedSlice = filteredCommunications.slice(
    (djenLocalPage - 1) * DJEN_PAGE_SIZE,
    djenLocalPage * DJEN_PAGE_SIZE,
  )

  // Metrics for the 5 visual cards with sparkbars
  const totalCount = communications.length
  const citacoesCount = communications.filter((c) => c.tipoComunicacao === 'CITACAO').length
  const intimacoesCount = communications.filter((c) => c.tipoComunicacao === 'INTIMACAO').length
  const urgentesCount = communications.filter(
    (c) => c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica',
  ).length
  const analisadasCount = communications.filter(
    (c) =>
      c.status === 'ANALISADA' || c.status === 'CONCLUIDA' || c.status === 'PRAZO_TAREFA_AGENDA',
  ).length

  return (
    <div className="space-y-6">
      {/* Sentinela Master Header with Sub-Navigation */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0b1329] via-[#0e1738] to-[#160d2b] border border-cyan-500/30 p-5 md:p-6 shadow-2xl shadow-cyan-950/40 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-[10px] font-mono tracking-wider uppercase px-2 py-0.5">
                Sentinela NOX v2.0
              </Badge>
              {dataStore.isUsingRealImportedData() ? (
                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 font-mono text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  DADOS IMPORTADOS REAIS ({communications.length})
                </Badge>
              ) : (
                <Badge className="bg-slate-900 text-slate-400 border-slate-800 font-mono text-xs">
                  SEM DADOS — aguardando importação ({communications.length})
                </Badge>
              )}{' '}
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Operação Inteligente & Cadeia de Custódia
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-200">
              Sentinela NOX — Centro Operacional Integrado
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Captura segura do DJEN/PJe, triagem com anti-prompt injection, cálculo explicável de
              prazos, agenda e orquestração de tarefas.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Tempo Recuperado</div>
              <div className="text-base font-black text-emerald-400 font-mono">
                +{recoveredTime.totalMinutesSaved} min
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  ({recoveredTime.manualBaselineHours}h economizadas)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 8 Areas Sub-Navigation Tabs */}
        <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/80 pt-4">
          {[
            { id: 'pulso', label: 'Pulso', icon: Activity, badge: null },
            {
              id: 'comunicacoes',
              label: 'Comunicações',
              icon: Radio,
              badge: communications.length,
            },
            {
              id: 'triagem',
              label: 'Triagem',
              icon: Flame,
              badge:
                communications.filter(
                  (c) => c.status === 'REVISAO_HUMANA' || c.triageCategory === 'ambigua',
                ).length || null,
              badgeVariant: 'warning',
            },
            {
              id: 'sala_situacao',
              label: 'Sala de Situação',
              icon: LifeBuoy,
              badge: incidents.length || null,
              badgeVariant: 'destructive',
            },
            { id: 'prazos', label: 'Prazos & Memorial', icon: Clock, badge: null },
            { id: 'processos', label: 'Dossiê Vivo', icon: Brain, badge: null },
            {
              id: 'automacoes',
              label: 'Automações',
              icon: Zap,
              badge: automations.filter((a) => a.active).length,
            },
            { id: 'saude', label: 'Saúde & Gêmeo', icon: ShieldCheck, badge: '100% OK' },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleSubTabChange(tab.id as SentinelaSubArea)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-slate-950 text-cyan-300'
                        : tab.badgeVariant === 'warning'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : tab.badgeVariant === 'destructive'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* SUB-VIEW 1: PULSO (Real-Time Operations & Daily Briefing) */}
      {activeSubTab === 'pulso' && (
        <div className="space-y-6">
          {/* Daily Executive Briefing */}
          <div className="rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 space-y-4 nox-glass-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Briefing Diário Sentinela NOX —{' '}
                  {new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                </h3>
              </div>
              <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
                CAPTURA ESTÁVEL (0 INCIDENTES ATIVOS)
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Urgent Deadlines Today */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-rose-400 flex items-center justify-between">
                  <span>Prazos Fatais Hoje ({briefing.urgentDeadlinesToday.length})</span>
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                </div>
                {briefing.urgentDeadlinesToday.map((d) => (
                  <div
                    key={d.id}
                    className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-xs text-slate-200"
                  >
                    <div className="font-bold text-rose-300">{d.title}</div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between mt-1">
                      <span>{d.process}</span>
                      <span className="text-rose-400 font-bold">{d.hoursLeft}h restantes</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Today's Commitments */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-cyan-400 flex items-center justify-between">
                  <span>Compromissos & Audiências Hoje</span>
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                {briefing.upcomingCommitments.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100">{c.title}</span>
                      <span className="text-cyan-400 font-mono text-[11px]">{c.time}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{c.responsible}</div>
                  </div>
                ))}
              </div>

              {/* Explainable AI Recommendations */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-purple-400 flex items-center justify-between">
                  <span>Recomendações Operacionais Explicáveis</span>
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                </div>
                {briefing.explainableRecommendations.map((rec, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (rec.targetRoute) {
                        navigate(rec.targetRoute)
                      }
                    }}
                    className={`p-2 rounded bg-purple-950/20 border border-purple-900/40 text-xs text-slate-200 ${
                      rec.targetRoute
                        ? 'cursor-pointer hover:border-purple-600 hover:bg-purple-950/40 transition-all'
                        : ''
                    }`}
                  >
                    <div className="font-bold text-purple-300 flex items-center justify-between">
                      <span>{rec.title}</span>
                      {rec.targetRoute && <ChevronRight className="w-3 h-3 text-purple-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{rec.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recovered Time Metric & Automation ROI */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Métrica de Tempo Recuperado (Baseada em Ações Auditadas Reais)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Comparativo entre tempo manual de referência vs tempo do fluxo automatizado NOX.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recoveredTime.breakdown.map((b, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-300">{b.category}</div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                    {b.totalHours} horas salvas
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    {b.count} eventos × {b.minutesPerUnitSaved} min economizados cada
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Gaps Detector */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Detector de Lacunas Operacionais ({gaps.length} pendências estruturais)
              </h4>
            </div>

            <div className="divide-y divide-slate-800 text-xs">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[9px] font-mono border-amber-800 text-amber-300 bg-amber-950/40"
                      >
                        {gap.category}
                      </Badge>
                      <span className="font-semibold text-slate-200">{gap.targetTitle}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{gap.description}</p>
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono shrink-0">
                    Ação: {gap.recommendedFix}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: COMUNICACOES (DJEN / Sentinela NOX — Reconciliação Legada Integral) */}
      {activeSubTab === 'comunicacoes' && (
        <div className="space-y-4">
          {/* DJEN Control & Ingestion Toolbar (Modos de Busca, Filtros de Tribunal e Datas) */}
          <div className="p-4 rounded-xl bg-slate-900/95 border border-amber-500/20 shadow-lg space-y-3 nox-glass-card">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                  DJEN Sentinela NOX — Ingestão de Publicações & Conexão Direta CNJ/PJe
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Endpoint:</span>
                <Badge className="bg-emerald-950/90 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
                  comunicaapi.pje.jus.br (Fetch Direto no Navegador)
                </Badge>
              </div>
            </div>

            {/* Banner de Estado da API / Rate Limit / CORS / Notificação */}
            {djenApiStatusMessage && (
              <div className="p-3 rounded-lg bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-between gap-3 text-xs text-cyan-200">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></div>
                  <span>{djenApiStatusMessage}</span>
                </div>
                {djenRetryRemaining !== null && (
                  <Badge className="bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-mono animate-pulse">
                    Retry em {djenRetryRemaining}s
                  </Badge>
                )}
              </div>
            )}

            {/* Alerta de Erro Honesto e Visível (Sem Mock Oculto) */}
            {djenErrorState && (
              <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/80 space-y-2 text-xs text-rose-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>
                      {djenErrorState.type === 'RATE_LIMIT_429'
                        ? 'Limite de Requisições Atingido (HTTP 429)'
                        : djenErrorState.type === 'FORBIDDEN_403'
                          ? 'Acesso Bloqueado pelo CNJ (HTTP 403 / CloudFront)'
                          : djenErrorState.type === 'CORS'
                            ? 'Restrição de CORS / Rede ao Conectar com o CNJ'
                            : 'Falha na Conexão com a ComunicaAPI'}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono border-rose-700 text-rose-300"
                  >
                    {djenErrorState.type}
                  </Badge>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {djenErrorState.message}
                </p>
                <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-md">URL: {djenLastSourceUrl}</span>
                  <Button
                    size="sm"
                    onClick={() => handleDjenSearch(1)}
                    className="h-6 px-2 text-[10px] bg-rose-900 hover:bg-rose-800 text-white"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            )}

            {/* Top Search Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
              {/* Modo de Busca */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Modo de Busca
                </label>
                <select
                  value={djenModo}
                  onChange={(e) => setDjenModo(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="oab">OAB (Âncora Principal)</option>
                  <option value="nome">Nome da Parte / Adv</option>
                  <option value="processo">Número do Processo</option>
                </select>
              </div>

              {/* OAB / UF ou Advogado */}
              {djenModo === 'oab' && (
                <div className="space-y-1 sm:col-span-1 lg:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-slate-400">
                    Âncora OAB / UF
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      value={djenOab}
                      onChange={(e) => setDjenOab(e.target.value)}
                      placeholder="15.400"
                      className="bg-slate-950 border-slate-800 h-8 text-xs font-mono text-amber-300"
                    />
                    <Input
                      value={djenUf}
                      onChange={(e) => setDjenUf(e.target.value)}
                      placeholder="MS"
                      className="bg-slate-950 border-slate-800 h-8 text-xs w-16 font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              {djenModo === 'nome' && (
                <div className="space-y-1 sm:col-span-1 lg:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-slate-400">
                    Nome da Parte ou Advogado
                  </label>
                  <Input
                    value={djenAdvogado}
                    onChange={(e) => setDjenAdvogado(e.target.value)}
                    placeholder="Ex: Higor Utinói"
                    className="bg-slate-950 border-slate-800 h-8 text-xs text-slate-200"
                  />
                </div>
              )}

              {djenModo === 'processo' && (
                <div className="space-y-1 sm:col-span-1 lg:col-span-2">
                  <label className="text-[10px] font-mono uppercase text-slate-400">
                    Processo (CNJ)
                  </label>
                  <Input
                    value={djenProcessoInput}
                    onChange={(e) => setDjenProcessoInput(e.target.value)}
                    placeholder="0000000-00.0000.8.12.0001"
                    className="bg-slate-950 border-slate-800 h-8 text-xs font-mono text-cyan-300"
                  />
                </div>
              )}

              {/* Nome da Parte Opcional */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Nome da Parte
                </label>
                <Input
                  value={djenParte}
                  onChange={(e) => setDjenParte(e.target.value)}
                  placeholder="Filtrar por parte..."
                  className="bg-slate-950 border-slate-800 h-8 text-xs text-slate-200"
                />
              </div>

              {/* Tribunal Seletor com Siglas */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Tribunal {djenTribunal ? `(${djenTribunal})` : '(Todos)'}
                </label>
                <select
                  value={djenTribunal}
                  onChange={(e) => setDjenTribunal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-hidden"
                >
                  {TRIBUNAIS_BRASIL.map((trib) => (
                    <option key={trib.sigla || 'all'} value={trib.sigla}>
                      {trib.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data Início */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">
                  Data Inicial
                </label>
                <Input
                  type="date"
                  value={djenDataIni}
                  onChange={(e) => setDjenDataIni(e.target.value)}
                  className="bg-slate-950 border-slate-800 h-8 text-xs font-mono text-slate-200"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-400">Data Final</label>
                <Input
                  type="date"
                  value={djenDataFim}
                  onChange={(e) => setDjenDataFim(e.target.value)}
                  className="bg-slate-950 border-slate-800 h-8 text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => handleDjenSearch(1)}
                  disabled={isDjenSearching}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 shadow-md"
                >
                  {isDjenSearching ? '⟳ Consultando...' : '🔍 Buscar Publicações'}
                </Button>
                <Button
                  onClick={handleDjenClear}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Limpar Filtros
                </Button>
                <Button
                  onClick={handleAnalyzeAllWithNox}
                  disabled={isAnalyzingAll}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs h-8 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  {isAnalyzingAll
                    ? `⟳ Analisando (${analyzingProgress?.current}/${analyzingProgress?.total})...`
                    : '⚡ Analisar Todos com NOX'}
                </Button>
                <Button
                  onClick={handleScheduleAllUrgent}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-amber-800/80 text-amber-300 hover:bg-amber-950/50"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  Agendar Prazos Fatais
                </Button>
              </div>

              {/* Chat Oráculo NOX and Exports */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleOpenGerencial}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-8 shadow-md flex items-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5" />
                  Oráculo NOX (Chat Gerencial)
                </Button>
                <Button
                  onClick={handleExportMarkdown}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-slate-800 text-slate-300 hover:text-cyan-300"
                >
                  .MD
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 border-slate-800 text-slate-300 hover:text-emerald-300"
                >
                  .CSV Seguro
                </Button>
              </div>
            </div>
          </div>

          {/* 5 Cards de Métricas Visuais com Sparkbars (Igual ao Legado DJEN) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* Total */}
            <div
              onClick={() => {
                setDjenFilterType('todos')
                setDjenLocalPage(1)
              }}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                djenFilterType === 'todos'
                  ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-slate-400">
                Total Encontradas
              </div>
              <div className="text-xl font-black text-slate-100 font-mono mt-0.5">{totalCount}</div>
              {/* Sparkbar */}
              <div className="flex items-end gap-1 h-3 mt-2">
                {[40, 70, 55, 90, 100].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-cyan-500/60 rounded-xs"
                  ></span>
                ))}
              </div>
            </div>

            {/* Citações */}
            <div
              onClick={() => {
                setDjenFilterType('citacao')
                setDjenLocalPage(1)
              }}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                djenFilterType === 'citacao'
                  ? 'bg-blue-950/80 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-blue-300">Citações</div>
              <div className="text-xl font-black text-blue-400 font-mono mt-0.5">
                {citacoesCount}
              </div>
              <div className="flex items-end gap-1 h-3 mt-2">
                {[30, 50, 80, 60, 75].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-blue-500/60 rounded-xs"
                  ></span>
                ))}
              </div>
            </div>

            {/* Intimações */}
            <div
              onClick={() => {
                setDjenFilterType('intimacao')
                setDjenLocalPage(1)
              }}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                djenFilterType === 'intimacao'
                  ? 'bg-amber-950/80 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-amber-300">Intimações</div>
              <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
                {intimacoesCount}
              </div>
              <div className="flex items-end gap-1 h-3 mt-2">
                {[60, 85, 45, 95, 80].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-amber-500/60 rounded-xs"
                  ></span>
                ))}
              </div>
            </div>

            {/* Urgentes */}
            <div
              onClick={() => {
                setDjenFilterType('urgente')
                setDjenLocalPage(1)
              }}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                djenFilterType === 'urgente'
                  ? 'bg-rose-950/80 border-rose-500 shadow-md ring-1 ring-rose-500/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-rose-300">Urgentes / Fatais</div>
              <div className="text-xl font-black text-rose-400 font-mono mt-0.5">
                {urgentesCount}
              </div>
              <div className="flex items-end gap-1 h-3 mt-2">
                {[90, 100, 80, 95, 100].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-rose-500/70 rounded-xs animate-pulse"
                  ></span>
                ))}
              </div>
            </div>

            {/* Analisadas */}
            <div
              onClick={() => {
                setDjenFilterType('analisado')
                setDjenLocalPage(1)
              }}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                djenFilterType === 'analisado'
                  ? 'bg-emerald-950/80 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-emerald-300">Analisadas NOX</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                {analisadasCount}
              </div>
              <div className="flex items-end gap-1 h-3 mt-2">
                {[50, 70, 85, 90, 100].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 bg-emerald-500/60 rounded-xs"
                  ></span>
                ))}
              </div>
            </div>
          </div>

          {/* Barra de Controle de Paginação e Botão "Carregar Mais" da API Remota */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 rounded-lg bg-slate-950/90 border border-slate-800 gap-3 text-xs font-mono">
            <div className="text-slate-400 flex items-center gap-2 flex-wrap">
              <span>
                Visualizando{' '}
                <strong className="text-slate-200">
                  {filteredCommunications.length === 0
                    ? 0
                    : (djenLocalPage - 1) * DJEN_PAGE_SIZE + 1}
                  –{Math.min(djenLocalPage * DJEN_PAGE_SIZE, filteredCommunications.length)}
                </strong>{' '}
                de <strong className="text-amber-400">{filteredCommunications.length}</strong> em
                tela
              </span>
              {djenTotalApiCount !== null && (
                <Badge variant="outline" className="text-[10px] border-slate-700 text-cyan-300">
                  Total no DJEN/CNJ: {djenTotalApiCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Botão Carregar Mais direto da ComunicaAPI quando houver mais itens no total do servidor */}
              {djenTotalApiCount !== null && djenTotalApiCount > communications.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDjenLoadMore}
                  disabled={isDjenLoadingMore || isDjenSearching}
                  className="h-7 px-3 text-[11px] bg-cyan-950/40 border-cyan-800 text-cyan-300 hover:bg-cyan-900/60 font-semibold"
                >
                  {isDjenLoadingMore ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-cyan-300 border-t-transparent animate-spin"></span>
                      Carregando pág. {djenApiPage + 1}...
                    </span>
                  ) : (
                    `+ Carregar Mais do DJEN (${communications.length}/${djenTotalApiCount})`
                  )}
                </Button>
              )}

              {/* Controles de Navegação da Página Local */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={djenLocalPage <= 1}
                  onClick={() => setDjenLocalPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2 text-[11px] border-slate-800 text-slate-300 disabled:opacity-30"
                >
                  ◀
                </Button>
                <span className="px-2 text-slate-400 text-[11px]">
                  {djenLocalPage}/{totalLocalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={djenLocalPage >= totalLocalPages}
                  onClick={() => setDjenLocalPage((p) => Math.min(totalLocalPages, p + 1))}
                  className="h-7 px-2 text-[11px] border-slate-800 text-slate-300 disabled:opacity-30"
                >
                  ▶
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de Publicações do DJEN com Calculadora Inline por Card */}
          <div className="space-y-3">
            {paginatedSlice.length === 0 ? (
              <div className="p-12 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 space-y-2">
                <div className="text-2xl">📡</div>
                <div className="font-bold text-slate-200">Nenhuma publicação encontrada</div>
                <p className="text-xs text-slate-500">
                  Ajuste os filtros de data, tribunal ou execute uma nova busca na barra superior.
                </p>
              </div>
            ) : (
              paginatedSlice.map((comm) => {
                const isCit = comm.tipoComunicacao.includes('CIT')
                const isInt = comm.tipoComunicacao.includes('INTIM')
                const isUrg = comm.urgencyLevel === 'alta' || comm.urgencyLevel === 'critica'
                const cardBorderColor = isUrg
                  ? 'border-rose-700/60'
                  : isCit
                    ? 'border-blue-700/60'
                    : 'border-amber-700/40'

                const inlineState = inlineCalcState[comm.id] || { days: 15, comarca: comm.tribunal }

                return (
                  <div
                    key={comm.id}
                    className={`p-4 rounded-xl bg-slate-900/90 border ${cardBorderColor} transition-all space-y-3 nox-glass-card`}
                  >
                    {/* Header do Card */}
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
                          {comm.tipoComunicacao}
                        </Badge>
                        <Badge className="bg-slate-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                          {comm.tribunal} • {comm.orgaoJulgador}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            isUrg
                              ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse'
                              : 'bg-slate-950 text-slate-400'
                          }`}
                        >
                          {comm.urgencyLevel.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-slate-100">
                          {comm.numeroProcesso}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleAnalyzeWithNox(comm)}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold text-xs h-7 px-2.5 shadow-sm"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Análise NOX
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenComm(comm)}
                          className="border-slate-700 text-slate-300 hover:text-white text-xs h-7 px-2.5"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Custódia
                        </Button>
                      </div>
                    </div>

                    {/* Teor Resumido e Completo */}
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded border border-slate-800">
                      {comm.teorCompleto || comm.teorResumido}
                    </p>

                    {/* Meta Info Line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 pt-1">
                      <div>
                        Destinatário: <span className="text-slate-200">{comm.destinatario}</span>
                      </div>
                      <div>
                        Disponibilizado em:{' '}
                        <span className="text-amber-400">{comm.dataDisponibilizacao}</span>
                      </div>
                    </div>

                    {/* Calculadora de Prazo Inline por Publicação */}
                    <div className="mt-2 p-3 rounded-lg bg-gradient-to-r from-amber-950/20 via-slate-950 to-slate-950 border border-amber-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />⏱ Calculadora de Prazo Inline
                        </span>
                        {inlineState.resultDate && (
                          <Badge className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono">
                            Fatal: {inlineState.resultDate} ({inlineState.diffDays} dias restantes)
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={inlineState.days}
                          onChange={(e) =>
                            setInlineCalcState((prev) => ({
                              ...prev,
                              [comm.id]: {
                                ...inlineState,
                                days: Number(e.target.value) || 15,
                              },
                            }))
                          }
                          className="w-20 bg-slate-900 border-slate-700 h-7 text-xs font-mono text-amber-200"
                        />
                        <span className="text-[11px] font-mono text-slate-400">
                          dias úteis (CPC)
                        </span>

                        <Button
                          size="sm"
                          onClick={() =>
                            handleInlineCalcExecute(
                              comm.id,
                              comm.dataDisponibilizacao,
                              inlineState.days,
                              comm.tribunal,
                            )
                          }
                          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-7 px-2"
                        >
                          Calcular
                        </Button>

                        {inlineState.resultDate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleScheduleFromSentinela(comm, inlineState.resultDate)
                            }
                            className="bg-slate-900 border-amber-800 text-amber-300 hover:bg-amber-950 text-xs h-7 px-2"
                          >
                            📅 Agendar na Agenda
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: TRIAGEM (Items with Human Review Required & Ambiguities) */}
      {activeSubTab === 'triagem' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-2 text-amber-300">
              <Flame className="w-4 h-4 text-amber-400" />
              Mesa de Triagem Crítica & Resolução de Ambiguidades
            </div>
            <p className="text-amber-300/80">
              Publicações que exigem decisão humana obrigatória por divergência de marco, ausência
              de prazo expresso ou risco elevado.
            </p>
          </div>

          <div className="space-y-3">
            {communications
              .filter(
                (c) =>
                  c.status === 'REVISAO_HUMANA' ||
                  c.triageCategory === 'ambigua' ||
                  c.urgencyLevel === 'critica',
              )
              .map((comm) => (
                <div
                  key={comm.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-3 nox-glass-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-mono">
                        TRIAGEM PENDENTE
                      </Badge>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {comm.numeroProcesso}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenComm(comm)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-7"
                    >
                      Avaliar & Homologar
                    </Button>
                  </div>
                  <p className="text-xs text-slate-300">{comm.teorResumido}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: SALA DE SITUACAO (Incidents & Crisis Management) */}
      {activeSubTab === 'sala_situacao' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-rose-400" />
              Salas de Crise & Incidentes de Conectividade de Tribunais
            </h3>
          </div>

          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-rose-800/60 space-y-4 nox-glass-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono uppercase">
                    {inc.incidentType}
                  </Badge>
                  <h4 className="text-sm font-bold text-slate-100 mt-1">{inc.title}</h4>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-mono text-amber-400 border-amber-800"
                >
                  STATUS: {inc.status}
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Plano de Contingência Operacional:
                </div>
                <p>{inc.contingencyPlan}</p>
              </div>

              {/* Incident Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Atualizações da Sala de Crise:
                </div>
                {inc.timelineUpdates.map((u, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="text-[10px] font-mono text-cyan-400 shrink-0">
                      {new Date(u.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <span>
                      <strong>{u.author}:</strong> {u.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-VIEW 5: PRAZOS & MEMORIAL (Central de Prazos + Simulador) */}
      {activeSubTab === 'prazos' && (
        <div className="space-y-6">
          <DeadlineCalculatorView
            onApproveDeadline={(mem) => {
              toast.success('Prazo calculado com sucesso!')
            }}
          />
        </div>
      )}

      {/* SUB-VIEW 6: PROCESSOS & DOSSIE VIVO */}
      {activeSubTab === 'processos' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
            <h4 className="font-bold text-slate-100 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              Dossiê Vivo & Memória de Decisões Estratégicas
            </h4>
            <p className="text-slate-400">
              Registro histórico e semântico de como o escritório resolveu situações similares
              anteriores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memory.map((mem) => (
              <div
                key={mem.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 nox-glass-card"
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-mono text-purple-300 border-purple-800"
                  >
                    CASO ANÁLOGO ({mem.appliedDate})
                  </Badge>
                  <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-mono">
                    {mem.outcome}
                  </Badge>
                </div>

                <div className="text-xs font-bold text-slate-200">{mem.similarityContext}</div>
                <p className="text-xs text-slate-400">{mem.situationSummary}</p>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-0.5">
                    Decisão Adotada:
                  </span>
                  {mem.decisionTaken}
                </div>

                <div className="text-[10px] font-mono text-slate-500">
                  Registrado por: <span className="text-slate-400">{mem.decisionAuthor}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 7: AUTOMACOES */}
      {activeSubTab === 'automacoes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Regras & Gatilhos do Workflow Orchestrator
              </h3>
              <p className="text-xs text-slate-400">
                Padrão QUANDO [evento] SE [condição] ENTÃO [ação] com aprovação humana configurável.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {automations.map((auto) => (
              <div
                key={auto.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 nox-glass-card"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200">{auto.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{auto.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={auto.active ? 'default' : 'outline'}
                    onClick={() => {
                      dataStore.toggleAutomation(auto.id)
                      setAutomations(dataStore.getAutomations())
                      toast.info(`Regra "${auto.name}" ${auto.active ? 'desativada' : 'ativada'}.`)
                    }}
                    className={
                      auto.active
                        ? 'bg-emerald-600 text-white font-bold text-xs h-7'
                        : 'text-slate-400 text-xs h-7'
                    }
                  >
                    {auto.active ? 'Ativa' : 'Pausada'}
                  </Button>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-cyan-400 font-bold">SE:</span> {auto.conditionFormula}
                  </div>
                  <div>
                    <span className="text-purple-400 font-bold">ENTÃO:</span> {auto.actionFormula}
                  </div>
                </div>

                {auto.simulationResultPreview && (
                  <div className="text-[11px] text-amber-300/80 font-mono">
                    Simulação: {auto.simulationResultPreview}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 8: SAUDE & GEMEO OPERACIONAL */}
      {activeSubTab === 'saude' && (
        <div className="space-y-6">
          {/* Gêmeo Operacional do Escritório */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 nox-glass-card">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Gêmeo Operacional do Escritório (Carga de Trabalho & Risco de Sobrecarga)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {twin.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-slate-200">{p.personName}</div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono ${
                        p.riskOfOverload
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-slate-900 text-slate-300'
                      }`}
                    >
                      {p.capacityPercentage}% CARGA
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400">{p.role}</div>

                  <div className="text-[11px] font-mono text-slate-300 space-y-0.5 pt-1 border-t border-slate-800">
                    <div>Tarefas Ativas: {p.activeTasksCount}</div>
                    <div>Prazos (7 dias): {p.deadlinesNext7Days}</div>
                    <div>Compromissos: {p.agendaCommitmentsCount}</div>
                  </div>

                  {p.suggestedAction && (
                    <div className="text-[10px] text-amber-300/90 bg-amber-950/30 p-1.5 rounded border border-amber-900/40">
                      {p.suggestedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Health of APIs & Sync Pipelines */}
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Saúde das Conexões & Gateways de Tribunais
            </h3>

            <div className="divide-y divide-slate-800 text-xs font-mono">
              {apiHealth.map((api, idx) => (
                <div
                  key={idx}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-slate-200">{api.serviceName}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-md">
                      {api.endpoint}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400 text-[11px]">{api.latencyMs}ms</span>
                    <Badge className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      {api.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAINEL LATERAL NOX (Análise Individual com Banner de Urgência, Countdown, Ação Necessária) */}
      <Dialog open={noxPanelOpen} onOpenChange={setNoxPanelOpen}>
        <DialogContent className="bg-slate-950 border-purple-500/30 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-950/50">
          {noxActiveComm && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono">
                    ANÁLISE ESTRATÉGICA SENTINELA NOX
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">
                    {noxActiveComm.tribunal} • {noxActiveComm.orgaoJulgador}
                  </span>
                </div>
                <DialogTitle className="text-base font-bold text-slate-100 mt-1">
                  Processo {noxActiveComm.numeroProcesso}
                </DialogTitle>
              </DialogHeader>

              {isNoxAnalyzing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                  <div className="text-xs font-mono text-purple-300">
                    ORÁCULO NOX processando teor e cruzando com CPC/TJMS...
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 text-xs">
                  {/* Banner de Urgência */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                      noxActiveComm.urgencyLevel === 'critica' ||
                      noxActiveComm.urgencyLevel === 'alta'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : 'bg-amber-950/40 border-amber-800 text-amber-200'
                    }`}
                  >
                    <Flame className="w-5 h-5 shrink-0 text-rose-400" />
                    <div>
                      <div className="font-bold uppercase tracking-wider text-[11px]">
                        URGÊNCIA: {noxActiveComm.urgencyLevel.toUpperCase()}
                      </div>
                      <div className="text-[11px] opacity-90">
                        Ato que gera contagem fatal de prazo recursal ou preparatório de audiência.
                      </div>
                    </div>
                  </div>

                  {/* Countdown Prazo */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 to-purple-950/30 border border-purple-800/40 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        Vencimento Fatal Estimado
                      </div>
                      <div className="text-base font-black text-amber-300 font-mono mt-0.5">
                        {noxActiveComm.deadlineCalculated?.finalDeadlineDate ||
                          'A definir via cálculo'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono uppercase text-slate-400">
                        Regra CPC
                      </div>
                      <div className="text-xs font-mono text-cyan-300">
                        {noxActiveComm.deadlineCalculated?.legalRuleName ||
                          '15 dias úteis (Padrão)'}
                      </div>
                    </div>
                  </div>

                  {/* Ação Necessária */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                      ⚡ Ação Necessária Imediata
                    </div>
                    <p className="text-slate-200 leading-relaxed">
                      Elaborar e protocolar peça de {noxActiveComm.tipoComunicacao.toLowerCase()} no
                      tribunal {noxActiveComm.tribunal}, confirmando juntada de procuração e custas
                      processuais.
                    </p>
                  </div>

                  {/* Resumo Estratégico */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-purple-400 font-bold">
                      📋 Diagnóstico Forense NOX
                    </div>
                    <p className="text-slate-300 leading-relaxed">{noxActiveComm.teorResumido}</p>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNoxPanelOpen(false)}
                      className="text-xs border-slate-800 text-slate-400"
                    >
                      Fechar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleScheduleFromSentinela(noxActiveComm)
                        setNoxPanelOpen(false)
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      📅 Agendar Prazo
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        dataStore.advanceCommunicationStatus(
                          noxActiveComm.id,
                          'PRAZO_TAREFA_AGENDA',
                          dataStore.getLawyerProfile().nome,
                          'Homologado e despachado para a esteira jurídica.',
                        )
                        setCommunications(dataStore.getCommunications())
                        setNoxPanelOpen(false)
                        toast.success('Publicação enviada para o Pipeline de Produção!')
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                    >
                      🚀 Enviar ao Pipeline
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CHAT GERENCIAL NOX (ORÁCULO NOX — Conversação com Contexto Total) */}
      <Dialog open={isGerencialOpen} onOpenChange={setIsGerencialOpen}>
        <DialogContent className="bg-slate-950 border-cyan-500/30 text-slate-100 max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl shadow-cyan-950/60">
          <div className="p-4 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-b border-cyan-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  ORÁCULO NOX — Painel Gerencial Estratégico
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Contexto Ativo: {communications.length} publicações ·{' '}
                  {dataStore.getLawyerProfile().nome} {dataStore.getLawyerProfile().oab}
                  15.400
                </p>
              </div>
            </div>
            <Badge
              className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 px-2.5 py-1 ${
                aiStatusBadge.variant === 'gemini'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/80 shadow-sm shadow-emerald-950'
                  : 'bg-amber-950/90 text-amber-300 border border-amber-700/80'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  aiStatusBadge.variant === 'gemini'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              ></span>
              {aiStatusBadge.text}
            </Badge>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-950/90">
            {gerencialMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3.5 rounded-xl max-w-[88%] space-y-2 ${
                  msg.role === 'nox'
                    ? msg.isFallback
                      ? 'bg-slate-900/95 border border-amber-800/40 text-slate-200'
                      : 'bg-slate-900/95 border border-cyan-800/50 text-slate-200 shadow-md shadow-cyan-950/30'
                    : msg.role === 'user'
                      ? 'bg-cyan-600 text-slate-950 font-medium ml-auto'
                      : 'bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px] font-mono'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-75 pb-1 border-b border-slate-800/60">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold uppercase tracking-wider">
                      {msg.role === 'nox'
                        ? '⚖ ORÁCULO NOX'
                        : msg.role === 'user'
                          ? 'Advogado'
                          : 'Sistema'}
                    </span>
                    {msg.role === 'nox' && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] ${
                          msg.isFallback
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}
                      >
                        {msg.isFallback ? 'resposta local (IA indisponível)' : 'Google Gemini'}
                      </span>
                    )}
                  </div>
                  <span>{msg.timestamp}</span>
                </div>
                <div className="whitespace-pre-line leading-relaxed">{msg.content}</div>
                {msg.role === 'nox' && !msg.content.includes('Revisão humana obrigatória') && (
                  <div className="pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>Fonte: {msg.sourceInfo || 'Sentinela NOX'}</span>
                    <span className="text-amber-400 font-semibold">
                      ⚠️ Revisão humana obrigatória
                    </span>
                  </div>
                )}
              </div>
            ))}
            {isGerencialSending && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-800/50 text-cyan-300 text-xs flex items-center gap-2.5 font-mono shadow-md shadow-cyan-950/20">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span>Google Gemini formulando diagnóstico operacional e análise de prazos...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
            <Input
              value={gerencialInput}
              onChange={(e) => setGerencialInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendGerencial()}
              placeholder="Faça uma pergunta sobre prazos, tribunais ou estratégia ao Oráculo NOX..."
              className="bg-slate-950 border-slate-800 h-9 text-xs text-slate-100 flex-1"
            />
            <Button
              onClick={handleSendGerencial}
              disabled={isGerencialSending || !gerencialInput.trim()}
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-9 px-4"
            >
              Enviar ↵
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog for Communication with Custody Chain & Memorial */}
      <Dialog open={selectedCommModalOpen} onOpenChange={setSelectedCommModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedComm && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                  Comunicação #{selectedComm.id} ({selectedComm.tribunal})
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-mono">
                  {selectedComm.numeroProcesso} • {selectedComm.orgaoJulgador}
                </DialogDescription>
              </DialogHeader>

              {/* Custody Chain Component */}
              <CustodyChainTimeline custody={selectedComm.custody} />

              {/* Deadline Engine Integration */}
              <div className="pt-2">
                <DeadlineCalculatorView
                  initialMemorial={selectedComm.deadlineCalculated}
                  onApproveDeadline={(mem) => handleApproveDeadline(selectedComm.id, mem)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SentinelaHub
