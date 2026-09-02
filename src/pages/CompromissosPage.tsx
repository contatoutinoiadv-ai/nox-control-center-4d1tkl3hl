import React, { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  Video,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  Briefcase,
  Layers,
  ArrowRight,
  Brain,
  ShieldCheck,
  CalendarCheck,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  FileText,
  BadgeAlert,
  Flame,
} from 'lucide-react'
import {
  AgendaEvent,
  AgendaEventType,
  DailyBriefingData,
  SentinelaTask,
  SentinelaCommunication,
  OperationalTwinCapacity,
} from '@/types/sentinela'
import { dataStore } from '@/services/dataStore'
import { getComplexidadeTarefa, ComplexidadeResultado } from '@/services/complexityService'
import {
  gerarSugestoesAgendamento,
  buscarAudienciasDetectadasNoDjen,
  calcularCapacidadeOperacionalTitular,
  detectarAudienciaNoTeor,
  SugestaoHorario,
  DjenAudienciaDetectada,
} from '@/services/smartSchedulerService'
import {
  fetchDjenCommunicationsDirect,
  DjenSearchResult,
  TRIBUNAIS_BRASIL,
} from '@/services/djenService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

const EVENT_TYPE_BADGES: Record<
  AgendaEventType,
  { bg: string; text: string; border: string; label: string }
> = {
  AUDIENCIA: {
    bg: 'bg-purple-950/70',
    text: 'text-purple-300',
    border: 'border-purple-700/60',
    label: 'Audiência',
  },
  ATENDIMENTO: {
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-300',
    border: 'border-emerald-700/60',
    label: 'Atendimento',
  },
  COMPROMISSO: {
    bg: 'bg-blue-950/70',
    text: 'text-blue-300',
    border: 'border-blue-700/60',
    label: 'Compromisso',
  },
  REUNIAO: {
    bg: 'bg-cyan-950/70',
    text: 'text-cyan-300',
    border: 'border-cyan-700/60',
    label: 'Reunião',
  },
  DILIGENCIA: {
    bg: 'bg-amber-950/70',
    text: 'text-amber-300',
    border: 'border-amber-700/60',
    label: 'Diligência',
  },
  VENCIMENTO_PRAZO: {
    bg: 'bg-rose-950/70',
    text: 'text-rose-300',
    border: 'border-rose-700/60',
    label: 'Prazo Fatal',
  },
  SUSTENTACAO_ORAL: {
    bg: 'bg-indigo-950/70',
    text: 'text-indigo-300',
    border: 'border-indigo-700/60',
    label: 'Sustentação Oral',
  },
  PERICIA: {
    bg: 'bg-slate-900',
    text: 'text-slate-300',
    border: 'border-slate-700',
    label: 'Perícia',
  },
}

const COMPLEXITY_COLORS = {
  baixa: {
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    indicator: 'bg-slate-400',
    label: 'Baixa (Mero Expediente)',
  },
  media: {
    badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-700',
    indicator: 'bg-cyan-400',
    label: 'Média (Rito Comum)',
  },
  alta: {
    badge: 'bg-amber-950/80 text-amber-300 border-amber-700',
    indicator: 'bg-amber-400',
    label: 'Alta (Grande Porte/Recursivo)',
  },
  critica: {
    badge: 'bg-rose-950/80 text-rose-300 border-rose-700 animate-pulse',
    indicator: 'bg-rose-500',
    label: 'Crítica (Réu Preso/STJ/Concorrente)',
  },
}

export const CompromissosPage: React.FC = () => {
  const [events, setEvents] = useState<AgendaEvent[]>(dataStore.getAgendaEvents())
  const [tasks, setTasks] = useState<SentinelaTask[]>(dataStore.getTasks())
  const [comms, setComms] = useState<SentinelaCommunication[]>(dataStore.getCommunications())
  const [activeTab, setActiveTab] = useState<
    'hoje' | 'audiencias' | 'consulta_periodo' | 'sugestoes' | 'todos'
  >('hoje')
  const [filterType, setFilterType] = useState<string>('TODOS')
  const [searchFilter, setSearchFilter] = useState('')

  // Filtros da Consulta de Audiências por Período
  const todayIso = new Date().toISOString().split('T')[0]
  const defaultFutureIso = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const [periodoDataInicio, setPeriodoDataInicio] = useState(todayIso)
  const [periodoDataFim, setPeriodoDataFim] = useState(defaultFutureIso)
  const [periodoStatusFiltro, setPeriodoStatusFiltro] = useState<string>('TODOS')
  const [periodoTermoBusca, setPeriodoTermoBusca] = useState('')
  const [periodoTribunalFiltro, setPeriodoTribunalFiltro] = useState('TODOS')
  const [periodoHasConsulted, setPeriodoHasConsulted] = useState(false)
  const [periodoIsSearching, setPeriodoIsSearching] = useState(false)
  const [periodoStatusMessage, setPeriodoStatusMessage] = useState<string | null>(null)
  const [periodoErrorState, setPeriodoErrorState] = useState<DjenSearchResult['error'] | null>(null)
  const [periodoLastApiUrl, setPeriodoLastApiUrl] = useState<string>('')
  const [periodoApiStats, setPeriodoApiStats] = useState<{
    totalApiFound: number
    audienciasDetectadas: number
    salvasNoDataStore: number
  } | null>(null)
  const [periodoResultados, setPeriodoResultados] = useState<
    Array<{
      id: string
      titulo: string
      dataHora: string
      data: string
      hora: string
      tipoAudiencia: string
      processo: string
      cliente?: string
      tribunal: string
      localOuLink?: string
      isVirtual: boolean
      origem: 'DJEN_DETECTADA' | 'AGENDA_OFICIAL'
      statusRevisao: 'PENDENTE_HOMOLOGACAO' | 'CONFIRMADA' | 'RASCUNHO' | 'CANCELADA'
      trechoDjen?: string
      rawDetectada?: DjenAudienciaDetectada
      rawEvent?: AgendaEvent
    }>
  >([])

  // Modais de Criação Manual
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualClient, setManualClient] = useState('')
  const [manualType, setManualType] = useState<AgendaEventType>('ATENDIMENTO')
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
  const [manualStartTime, setManualStartTime] = useState('14:00')
  const [manualEndTime, setManualEndTime] = useState('15:00')
  const [manualIsVirtual, setManualIsVirtual] = useState(true)
  const [manualLocation, setManualLocation] = useState('')
  const [manualResponsible, setManualResponsible] = useState(
    dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira',
  )
  const [manualNotes, setManualNotes] = useState('')

  // Estado das Sugestões e Audiências DJEN
  const [sugestoes, setSugestoes] = useState<SugestaoHorario[]>([])
  const [audienciasDjen, setAudienciasDjen] = useState<DjenAudienciaDetectada[]>([])
  const [twinCapacity, setTwinCapacity] = useState<OperationalTwinCapacity>(
    calcularCapacidadeOperacionalTitular(),
  )

  const reloadData = () => {
    const agendaEvs = dataStore.getAgendaEvents()
    const detectedDjen = buscarAudienciasDetectadasNoDjen()
    setEvents(agendaEvs)
    setTasks(dataStore.getTasks())
    setComms(dataStore.getCommunications())
    setSugestoes(gerarSugestoesAgendamento())
    setAudienciasDjen(detectedDjen)
    setTwinCapacity(calcularCapacidadeOperacionalTitular())
    if (periodoHasConsulted) {
      filtrarResultadosLocais(
        periodoDataInicio,
        periodoDataFim,
        periodoStatusFiltro,
        periodoTribunalFiltro,
        periodoTermoBusca,
        agendaEvs,
        detectedDjen,
      )
    }
  }

  useEffect(() => {
    reloadData()
    const unsub = dataStore.subscribe(() => {
      reloadData()
    })
    return unsub
  }, [])

  // Filtragem puramente local de audiências do dataStore / agenda (usada pelo subscribe e reset de filtros)
  const filtrarResultadosLocais = (
    dataIni = periodoDataInicio,
    dataFim = periodoDataFim,
    statusFiltro = periodoStatusFiltro,
    tribunalFiltro = periodoTribunalFiltro,
    termo = periodoTermoBusca,
    agendaData = dataStore.getAgendaEvents(),
    detectedData = buscarAudienciasDetectadasNoDjen(),
  ) => {
    const resultadosUnificados: Array<{
      id: string
      titulo: string
      dataHora: string
      data: string
      hora: string
      tipoAudiencia: string
      processo: string
      cliente?: string
      tribunal: string
      localOuLink?: string
      isVirtual: boolean
      origem: 'DJEN_DETECTADA' | 'AGENDA_OFICIAL'
      statusRevisao: 'PENDENTE_HOMOLOGACAO' | 'CONFIRMADA' | 'RASCUNHO' | 'CANCELADA'
      trechoDjen?: string
      rawDetectada?: DjenAudienciaDetectada
      rawEvent?: AgendaEvent
    }> = []

    // 1. Audiências detectadas autonomamente pelo DJEN (pendentes de homologação)
    for (const d of detectedData) {
      const dataEv =
        d.dataDetectada ||
        (d.rascunhoEvento.startDate ? d.rascunhoEvento.startDate.split('T')[0] : '')
      if (dataIni && dataEv && dataEv < dataIni) continue
      if (dataFim && dataEv && dataEv > dataFim) continue

      const statusRev: 'PENDENTE_HOMOLOGACAO' | 'CONFIRMADA' | 'RASCUNHO' | 'CANCELADA' =
        'PENDENTE_HOMOLOGACAO'

      if (statusFiltro !== 'TODOS' && statusFiltro !== statusRev) continue
      if (tribunalFiltro !== 'TODOS' && d.tribunal && d.tribunal !== tribunalFiltro) continue

      if (termo) {
        const q = termo.toLowerCase()
        const match =
          d.processo.toLowerCase().includes(q) ||
          d.tipoAudiencia.toLowerCase().includes(q) ||
          d.tribunal.toLowerCase().includes(q) ||
          d.trechoExtraido.toLowerCase().includes(q) ||
          (d.rascunhoEvento.clientName && d.rascunhoEvento.clientName.toLowerCase().includes(q))
        if (!match) continue
      }

      resultadosUnificados.push({
        id: `djen_det_${d.communicationId}`,
        titulo: d.rascunhoEvento.title,
        dataHora: d.rascunhoEvento.startDate,
        data: dataEv,
        hora: d.horaDetectada || '14:00',
        tipoAudiencia: d.tipoAudiencia,
        processo: d.processo,
        cliente: d.rascunhoEvento.clientName,
        tribunal: d.tribunal || 'DJEN',
        localOuLink: d.localOuLink || d.rascunhoEvento.locationOrLink,
        isVirtual: d.rascunhoEvento.isVirtual,
        origem: 'DJEN_DETECTADA',
        statusRevisao: statusRev,
        trechoDjen: d.trechoExtraido,
        rawDetectada: d,
        rawEvent: d.rascunhoEvento,
      })
    }

    // 2. Eventos da Agenda do tipo AUDIENCIA dentro do período
    for (const ev of agendaData) {
      if (ev.eventType !== 'AUDIENCIA') continue

      const dataEv = ev.startDate.includes('T') ? ev.startDate.split('T')[0] : ev.startDate
      if (dataIni && dataEv < dataIni) continue
      if (dataFim && dataEv > dataFim) continue

      // Evitar duplicar se a mesma comunicação já foi adicionada acima
      if (
        ev.communicationId &&
        resultadosUnificados.some((r) => r.rawDetectada?.communicationId === ev.communicationId)
      ) {
        continue
      }

      let statusRev: 'PENDENTE_HOMOLOGACAO' | 'CONFIRMADA' | 'RASCUNHO' | 'CANCELADA' = 'CONFIRMADA'
      if (ev.status === 'AGENDADO') {
        statusRev = ev.communicationId ? 'PENDENTE_HOMOLOGACAO' : 'RASCUNHO'
      } else if (ev.status === 'CANCELADO') {
        statusRev = 'CANCELADA'
      } else {
        statusRev = 'CONFIRMADA'
      }

      if (statusFiltro !== 'TODOS' && statusFiltro !== statusRev) continue
      if (tribunalFiltro !== 'TODOS' && ev.tribunal && ev.tribunal !== tribunalFiltro) continue

      if (termo) {
        const q = termo.toLowerCase()
        const match =
          ev.title.toLowerCase().includes(q) ||
          (ev.processNumber && ev.processNumber.toLowerCase().includes(q)) ||
          (ev.tribunal && ev.tribunal.toLowerCase().includes(q)) ||
          (ev.clientName && ev.clientName.toLowerCase().includes(q)) ||
          (ev.description && ev.description.toLowerCase().includes(q))
        if (!match) continue
      }

      const horaEv = ev.startDate.includes('T') ? ev.startDate.split('T')[1].slice(0, 5) : '00:00'

      resultadosUnificados.push({
        id: ev.id,
        titulo: ev.title,
        dataHora: ev.startDate,
        data: dataEv,
        hora: horaEv,
        tipoAudiencia: ev.title.split('-')[0].trim() || 'Audiência Geral',
        processo: ev.processNumber || 'Sem Processo Vinculado',
        cliente: ev.clientName,
        tribunal: ev.tribunal || 'Tribunal Não Informado',
        localOuLink: ev.locationOrLink,
        isVirtual: ev.isVirtual,
        origem: ev.communicationId ? 'DJEN_DETECTADA' : 'AGENDA_OFICIAL',
        statusRevisao: statusRev,
        trechoDjen: ev.description,
        rawEvent: ev,
      })
    }

    resultadosUnificados.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
    setPeriodoResultados(resultadosUnificados)
    setPeriodoHasConsulted(true)
    return resultadosUnificados
  }

  // Execução da Consulta REAL na API ComunicaAPI/DJEN ao clicar em "Consultar Período"
  const executarConsultaPeriodo = async (
    dataIni = periodoDataInicio,
    dataFim = periodoDataFim,
    statusFiltro = periodoStatusFiltro,
    tribunalFiltro = periodoTribunalFiltro,
    termo = periodoTermoBusca,
  ) => {
    if (dataIni && dataFim && dataIni > dataFim) {
      toast.error('Data inicial não pode ser posterior à data final')
      return
    }

    setPeriodoIsSearching(true)
    setPeriodoErrorState(null)
    setPeriodoStatusMessage('Conectando à ComunicaAPI do CNJ (DJEN) em tempo real...')

    const lawyerProfile = dataStore.getLawyerProfile()
    const oabRaw = lawyerProfile.oab || '15400'
    const oabNum = oabRaw.replace(/\D/g, '') || '15400'
    const oabUf = lawyerProfile.uf || 'MS'
    const lawyerName = lawyerProfile.nome || 'Higor Utinoi de Oliveira'

    try {
      // 1. Chamada direta à ComunicaAPI do CNJ/DJEN
      const searchResult = await fetchDjenCommunicationsDirect(
        {
          itensPorPagina: 100,
          pagina: 1,
          meio: 'D',
          numeroOab: oabNum,
          ufOab: oabUf,
          nomeAdvogado: lawyerName,
          siglaTribunal: tribunalFiltro !== 'TODOS' ? tribunalFiltro : '',
          dataDisponibilizacaoInicio: dataIni || undefined,
          dataDisponibilizacaoFim: dataFim || undefined,
          modo: 'oab',
        },
        undefined,
        (status) => {
          setPeriodoStatusMessage(status.message)
        },
      )

      if (searchResult.sourceUrl) {
        setPeriodoLastApiUrl(searchResult.sourceUrl)
      }

      // Se a API retornou erro (403, 429, rede, cors)
      if (!searchResult.success) {
        setPeriodoErrorState(
          searchResult.error || {
            type: 'UNKNOWN',
            message: 'Erro desconhecido ao consultar o tribunal.',
          },
        )

        // Fallback gracioso: filtra a base local para não deixar o usuário sem visualização
        const fallbackList = filtrarResultadosLocais(
          dataIni,
          dataFim,
          statusFiltro,
          tribunalFiltro,
          termo,
        )

        toast.error(
          searchResult.error?.message || 'Falha na conexão com o tribunal (ComunicaAPI/DJEN).',
          {
            description: `Exibindo ${fallbackList.length} registro(s) já presentes na base local.`,
          },
        )
        return
      }

      const rawItems = Array.isArray(searchResult.items) ? searchResult.items : []

      // 2. Salvar novas publicações no dataStore
      const savedCount = dataStore.addCommunications(rawItems)

      // 3. Processar comunicações com detectarAudienciaNoTeor
      let audienciasDetectadasNovas = 0
      for (const comm of rawItems) {
        const det = detectarAudienciaNoTeor(comm)
        if (det) {
          audienciasDetectadasNovas++
        }
      }

      // 4. Recarregar e unificar com a agenda oficial
      const updatedAgenda = dataStore.getAgendaEvents()
      const updatedDetected = buscarAudienciasDetectadasNoDjen()
      setAudienciasDjen(updatedDetected)
      setEvents(updatedAgenda)
      setComms(dataStore.getCommunications())

      setPeriodoApiStats({
        totalApiFound: searchResult.totalCount || rawItems.length,
        audienciasDetectadas: audienciasDetectadasNovas,
        salvasNoDataStore: savedCount,
      })

      const finalUnificados = filtrarResultadosLocais(
        dataIni,
        dataFim,
        statusFiltro,
        tribunalFiltro,
        termo,
        updatedAgenda,
        updatedDetected,
      )

      toast.success(`Busca no DJEN realizada com sucesso!`, {
        description: `${rawItems.length} publicação(ões) consultada(s) no CNJ • ${finalUnificados.length} audiência(s) no período.`,
      })
    } catch (err: any) {
      console.error('[Compromissos] Erro na consulta do período DJEN:', err)
      const msg = err?.message || 'Erro inesperado ao consultar a API pública do DJEN.'
      setPeriodoErrorState({
        type: 'NETWORK',
        message: msg,
      })
      // Fallback para base local
      filtrarResultadosLocais(dataIni, dataFim, statusFiltro, tribunalFiltro, termo)
      toast.error(msg)
    } finally {
      setPeriodoIsSearching(false)
      setPeriodoStatusMessage(null)
    }
  }

  const handleDispararConsultaPeriodo = () => {
    executarConsultaPeriodo(
      periodoDataInicio,
      periodoDataFim,
      periodoStatusFiltro,
      periodoTribunalFiltro,
      periodoTermoBusca,
    )
  }

  // Lista de tribunais distintos presentes nas audiências e comunicações
  const tribunaisDisponiveis = Array.from(
    new Set([
      ...events.map((e) => e.tribunal).filter(Boolean),
      ...audienciasDjen.map((a) => a.tribunal).filter(Boolean),
      ...comms.map((c) => c.tribunal).filter(Boolean),
      'TJSP',
      'TJMS',
      'TRT2',
      'TRT24',
      'TRF3',
      'TJDFT',
      'STJ',
      'STF',
    ]),
  ).filter(Boolean) as string[]

  // Visão do Dia (reaproveitando o padrão DailyBriefingData do NOX)
  const todayStr = new Date().toISOString().split('T')[0]
  const briefingData: DailyBriefingData = dataStore.getDailyBriefing()

  const compromissosHoje = events.filter((e) => {
    if (e.status === 'CANCELADO') return false
    return e.startDate.startsWith(todayStr)
  })

  const prazosUrgentesHoje = comms.filter(
    (c) => c.deadlineCalculated && c.deadlineCalculated.finalDeadlineDate === todayStr,
  )

  const tarefasPendentesHoje = tasks
    .filter((t) => t.status !== 'CONCLUIDA')
    .map((t) => ({
      task: t,
      complexidade: getComplexidadeTarefa(t),
    }))

  // Manipular criação de atendimento/compromisso manual
  const handleSaveManualEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTitle) {
      toast.error('Informe o título do compromisso/atendimento')
      return
    }

    const startIso = `${manualDate}T${manualStartTime}:00Z`
    const endIso = `${manualDate}T${manualEndTime}:00Z`

    // Prevenção de conflito
    const hasConflict = events.some((ev) => {
      if (ev.status === 'CANCELADO') return false
      if (!ev.startDate.startsWith(manualDate)) return false
      const evStart = ev.startDate.includes('T') ? ev.startDate.split('T')[1].slice(0, 5) : '00:00'
      const evEnd = ev.endDate.includes('T') ? ev.endDate.split('T')[1].slice(0, 5) : '23:59'
      return !(manualEndTime <= evStart || manualStartTime >= evEnd)
    })

    const newEvent: AgendaEvent = {
      id: `agenda_${Date.now()}`,
      title: manualTitle,
      description: manualNotes || (manualClient ? `Cliente: ${manualClient}` : undefined),
      eventType: manualType,
      startDate: startIso,
      endDate: endIso,
      isAllDay: false,
      locationOrLink:
        manualLocation ||
        (manualIsVirtual ? 'Videoconferência (Virtual)' : 'Escritório Presencial'),
      isVirtual: manualIsVirtual,
      clientName: manualClient || undefined,
      responsible: manualResponsible,
      participants: [manualResponsible],
      status: 'CONFIRMADO',
      remindersMinutesBefore: [1440, 60, 15],
      conflictDetected: hasConflict,
      conflictNotes: hasConflict
        ? 'Horário concorre com outro evento no mesmo intervalo'
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    dataStore.addAgendaEvent(newEvent)
    setManualModalOpen(false)
    setManualTitle('')
    setManualClient('')
    setManualNotes('')
    setManualLocation('')
    toast.success(
      manualType === 'ATENDIMENTO'
        ? 'Atendimento registrado com sucesso!'
        : 'Compromisso agendado com sucesso!',
      {
        description: `${manualDate} das ${manualStartTime} às ${manualEndTime}`,
      },
    )
  }

  // Aceitar sugestão automática e transformar em compromisso
  const handleAceitarSugestao = (sug: SugestaoHorario) => {
    setManualDate(sug.data)
    setManualStartTime(sug.inicio)
    setManualEndTime(sug.fim)
    setManualType(sug.tipoRecomendado === 'ATENDIMENTO_CLIENTE' ? 'ATENDIMENTO' : 'COMPROMISSO')
    setManualTitle(
      sug.tipoRecomendado === 'BLOCO_ESTUDO_COMPLEXIDADE'
        ? 'Bloco Focado de Estudo & Redação Jurídica'
        : sug.tipoRecomendado === 'RESERVA_ESTRATEGICA'
          ? 'Reserva Estratégica: Fechamento de Prazo Fatal'
          : 'Atendimento a Cliente / Reunião',
    )
    setManualNotes(`Sugerido automaticamente: ${sug.motivo}`)
    setManualModalOpen(true)
  }

  // Confirmar Audiência detectada pelo DJEN (Transição de Rascunho -> Agenda Oficial)
  const handleAprovarAudienciaDjen = (detectada: DjenAudienciaDetectada) => {
    const eventoConfirmado: AgendaEvent = {
      ...detectada.rascunhoEvento,
      status: 'CONFIRMADO',
      updatedAt: new Date().toISOString(),
    }

    dataStore.addAgendaEvent(eventoConfirmado)
    dataStore.logAction(
      'AUDIENCIA_DJEN_HOMOLOGADA',
      'revisao',
      dataStore.getLawyerProfile().nome,
      detectada.processo,
      {
        tribunal: detectada.tribunal,
        data: detectada.dataDetectada,
        hora: detectada.horaDetectada,
        revisaoHumana: 'Aprovada pelo titular',
      },
    )

    toast.success('Audiência confirmada e integrada à pauta com sucesso!', {
      description: `Processo ${detectada.processo} (${detectada.tribunal})`,
    })
    reloadData()
  }

  // Rejeitar/Ignorar Audiência detectada do DJEN
  const handleRejeitarAudienciaDjen = (detectada: DjenAudienciaDetectada) => {
    toast.info('Audiência descartada da pauta', {
      description: `Processo ${detectada.processo}`,
    })
    setAudienciasDjen((prev) => prev.filter((a) => a.communicationId !== detectada.communicationId))
  }

  // Filtragem de Eventos
  const filteredEvents = events.filter((ev) => {
    if (filterType !== 'TODOS' && ev.eventType !== filterType) return false
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      const match =
        ev.title.toLowerCase().includes(q) ||
        (ev.clientName && ev.clientName.toLowerCase().includes(q)) ||
        (ev.processNumber && ev.processNumber.includes(q)) ||
        ev.responsible.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const audienciasCadastradas = events.filter((e) => e.eventType === 'AUDIENCIA')

  return (
    <div className="space-y-6">
      {/* Header do Módulo Compromissos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-cyan-500/20">
              <CalendarCheck className="w-4 h-4 text-slate-950" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
              Compromissos & Agenda Autônoma
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-cyan-500/50 text-cyan-300 bg-cyan-950/40"
              >
                NOVO MÓDULO
              </Badge>
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Gestão unificada de atendimentos a clientes, audiências judiciais detectadas via DJEN,
            classificação de complexidade e sugestão autônoma de agendamento.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => reloadData()}
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-300"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Recalcular Sugestões
          </Button>

          <Button
            onClick={() => {
              setManualType('ATENDIMENTO')
              setManualModalOpen(true)
            }}
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-950 flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Novo Atendimento
          </Button>

          <Button
            onClick={() => {
              setManualType('AUDIENCIA')
              setManualModalOpen(true)
            }}
            size="sm"
            className="h-8 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-950 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Compromisso
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Operacionais & Capacidade do Titular */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Capacidade Operacional
            </div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
              {twinCapacity.capacityPercentage}%
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {twinCapacity.riskOfOverload ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Risco de Sobrecarga
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Carga Equilibrada
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase">Compromissos Hoje</div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
              {compromissosHoje.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {prazosUrgentesHoje.length > 0 ? (
                <span className="text-rose-400 font-semibold">
                  {prazosUrgentesHoje.length} prazo(s) fatal(is) hoje
                </span>
              ) : (
                <span>Nenhum prazo fatal hoje</span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-slate-300" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Audiências DJEN Detectadas
            </div>
            <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">
              {audienciasDjen.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {audienciasDjen.length > 0 ? (
                <span className="text-purple-300">Pendente de revisão humana</span>
              ) : (
                <span>Todas validadas</span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-950/60 border border-purple-800/40 flex items-center justify-center">
            <Video className="w-5 h-5 text-purple-400" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase">Horários Sugeridos</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {sugestoes.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              <span>Próximos 5 dias úteis</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Tabs de Navegação Interna do Módulo */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-slate-950/80 border border-slate-800 p-1 rounded-xl flex flex-wrap gap-1 max-w-3xl">
          <TabsTrigger
            value="hoje"
            className="text-xs font-semibold data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300 flex-1 min-w-[120px]"
          >
            Visão do Dia
          </TabsTrigger>
          <TabsTrigger
            value="consulta_periodo"
            className="text-xs font-semibold data-[state=active]:bg-purple-950 data-[state=active]:text-purple-300 flex-1 min-w-[180px] relative"
          >
            <Search className="w-3.5 h-3.5 mr-1 text-purple-400" />
            Consultar por Período DJEN
          </TabsTrigger>
          <TabsTrigger
            value="audiencias"
            className="text-xs font-semibold data-[state=active]:bg-purple-950/70 data-[state=active]:text-purple-300 flex-1 min-w-[140px] relative"
          >
            Pauta Geral
            {audienciasDjen.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] bg-purple-600 text-white font-mono">
                {audienciasDjen.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="sugestoes"
            className="text-xs font-semibold data-[state=active]:bg-emerald-950 data-[state=active]:text-emerald-300 flex-1 min-w-[140px]"
          >
            Sugestões de Horários
          </TabsTrigger>
          <TabsTrigger
            value="todos"
            className="text-xs font-semibold data-[state=active]:bg-slate-900 data-[state=active]:text-slate-200 flex-1 min-w-[120px]"
          >
            Todos os Eventos ({events.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VISÃO DO DIA */}
        <TabsContent value="hoje" className="space-y-5 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna 1: Prazos Fatais e Compromissos Confirmados Hoje */}
            <div className="space-y-4 lg:col-span-2">
              {/* Compromissos do Dia */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-100">
                      Agenda Confirmada de Hoje ({compromissosHoje.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date().toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                    })}
                  </span>
                </div>

                {compromissosHoje.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    Nenhum compromisso agendado para hoje. Janela livre para estudo de teses ou
                    atendimento a novos clientes.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {compromissosHoje.map((ev) => {
                      const badgeConfig =
                        EVENT_TYPE_BADGES[ev.eventType] || EVENT_TYPE_BADGES.COMPROMISSO
                      const startTime = ev.startDate.includes('T')
                        ? ev.startDate.split('T')[1].slice(0, 5)
                        : 'Dia Inteiro'
                      const endTime = ev.endDate.includes('T')
                        ? ev.endDate.split('T')[1].slice(0, 5)
                        : ''

                      return (
                        <div
                          key={ev.id}
                          className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-center font-mono shrink-0">
                              <span className="text-xs font-bold text-cyan-300">{startTime}</span>
                              {endTime && (
                                <span className="block text-[10px] text-slate-500">{endTime}</span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-mono px-1.5 py-0 ${badgeConfig.bg} ${badgeConfig.text} ${badgeConfig.border}`}
                                >
                                  {badgeConfig.label}
                                </Badge>
                                <span className="text-xs font-bold text-slate-200">{ev.title}</span>
                                {ev.isVirtual && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] text-cyan-400 border-cyan-800 bg-cyan-950/30 flex items-center gap-1"
                                  >
                                    <Video className="w-2.5 h-2.5" /> Virtual
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                {ev.clientName && (
                                  <span className="text-slate-300 font-medium">
                                    Cliente: {ev.clientName}
                                  </span>
                                )}
                                {ev.processNumber && (
                                  <span className="font-mono text-cyan-400/80">
                                    Proc: {ev.processNumber}
                                  </span>
                                )}
                                {ev.locationOrLink && (
                                  <span className="text-slate-500 truncate max-w-[200px]">
                                    {ev.locationOrLink}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-emerald-400 border-emerald-800 bg-emerald-950/30"
                          >
                            {ev.status}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Prazos Fatais de Hoje */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-bold text-slate-100">
                      Prazos Fatais Jurídicos de Hoje ({prazosUrgentesHoje.length})
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono text-rose-400 border-rose-800 bg-rose-950/40"
                  >
                    CPC / Garantia D-2
                  </Badge>
                </div>

                {prazosUrgentesHoje.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 flex items-center gap-2 bg-slate-950/40 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Nenhum prazo fatal vencendo na data de hoje. Toda a operação está protegida.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {prazosUrgentesHoje.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/60 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-rose-300">
                              {c.numeroProcesso}
                            </span>
                            <Badge className="text-[9px] bg-rose-900/60 text-rose-200 border-rose-700">
                              {c.tribunal}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">
                            {c.deadlineCalculated?.legalRuleName || c.teorResumido}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono text-rose-400 border-rose-800 bg-rose-950 shrink-0"
                        >
                          FATAL HOJE 23:59
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna 2: Tarefas Pendentes com Classificação de Complexidade Automática */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-100">Tarefas & Complexidade</h3>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">Classificação IA</span>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {tarefasPendentesHoje.length === 0 ? (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      Nenhuma tarefa pendente no momento.
                    </div>
                  ) : (
                    tarefasPendentesHoje.map(({ task, complexidade }) => {
                      const colorCfg =
                        COMPLEXITY_COLORS[complexidade.nivel] || COMPLEXITY_COLORS.media

                      return (
                        <div
                          key={task.id}
                          className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition-colors space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-200 leading-tight">
                              {task.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-mono uppercase px-1.5 py-0 shrink-0 ${colorCfg.badge}`}
                            >
                              {complexidade.nivel} ({complexidade.score} pts)
                            </Badge>
                          </div>

                          {/* Motivos da Classificação */}
                          {complexidade.motivos.length > 0 && (
                            <div className="text-[10px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800/60 space-y-0.5">
                              <span className="font-semibold text-slate-300 block font-mono text-[9px] uppercase">
                                Critério Jurídico:
                              </span>
                              {complexidade.motivos.map((motivo, idx) => (
                                <p key={idx} className="text-slate-400 leading-tight">
                                  • {motivo}
                                </p>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                            <span>Resp: {task.responsible.split(' ')[0]}</span>
                            <span>{task.estimatedHours}h estimadas</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-800/40 text-[10px] text-cyan-300 leading-tight">
                  💡 <strong>Diretriz NOX:</strong> A tabela de complexidade é determinística e
                  autônoma. A reclassificação manual pelo advogado sempre prevalece.
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CONSULTAR POR PERÍODO AS AUDIÊNCIAS DJEN */}
        <TabsContent value="consulta_periodo" className="space-y-5 mt-4">
          {/* Banner Indicador de Busca em Tempo Real no DJEN Ativa */}
          {periodoIsSearching && (
            <div className="p-3.5 rounded-xl bg-purple-950/80 border-2 border-purple-500 shadow-lg shadow-purple-900/40 flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shrink-0">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black tracking-wider text-purple-200 font-mono uppercase">
                      BUSCA EM TEMPO REAL NO DJEN ATIVA
                    </span>
                    <Badge className="text-[9px] bg-purple-500 text-slate-950 font-bold">
                      COMUNICAAPI CNJ
                    </Badge>
                  </div>
                  <p className="text-[11px] text-purple-300 font-mono mt-0.5">
                    {periodoStatusMessage || 'Varrendo comunicações e audiências no tribunal...'}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-purple-400 text-purple-200 hidden sm:inline-flex"
              >
                Âncora: OAB/MS 15.400
              </Badge>
            </div>
          )}

          {/* Banner de Erro na Conexão com Tribunal (HTTP 403, 429, CORS, Rede) */}
          {periodoErrorState && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-700 space-y-2 text-xs text-rose-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    {periodoErrorState.type === 'RATE_LIMIT_429'
                      ? 'Limite de Requisições da ComunicaAPI Atingido (HTTP 429)'
                      : periodoErrorState.type === 'FORBIDDEN_403'
                        ? 'Acesso Bloqueado pela Infraestrutura do Tribunal (HTTP 403 / CloudFront)'
                        : periodoErrorState.type === 'CORS'
                          ? 'Restrição de Conexão / CORS com o Tribunal'
                          : 'Falha na Comunicação Direta com o Tribunal'}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] font-mono border-rose-600 text-rose-300 bg-rose-950"
                >
                  {periodoErrorState.type}
                </Badge>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {periodoErrorState.message}
              </p>
              <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400 flex-wrap gap-2">
                <span className="truncate max-w-md text-slate-500">
                  {periodoLastApiUrl
                    ? `Endpoint: ${periodoLastApiUrl}`
                    : 'Modo fallback local ativado.'}
                </span>
                <Button
                  size="sm"
                  onClick={handleDispararConsultaPeriodo}
                  className="h-6 px-2 text-[10px] bg-rose-900 hover:bg-rose-800 text-white"
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}

          {/* Caixa de Filtros de Período */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-800/60 shadow-lg shadow-purple-950/20 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-700/60 flex items-center justify-center text-purple-300">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Consulta de Audiências DJEN por Período
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono border-purple-500/60 text-purple-300 bg-purple-950/50"
                    >
                      NOX AURORA • DJEN / DIÁRIOS
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Realize uma busca real na ComunicaAPI/DJEN do tribunal (OAB/MS 15.400) para
                    encontrar e cadastrar audiências do período com detecção autônoma.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-cyan-800 text-cyan-300 bg-cyan-950/40"
                >
                  Âncora: Higor Utinói (OAB/MS 15.400)
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-slate-700 text-slate-400 bg-slate-950"
                >
                  Revisão Humana Obrigatória
                </Badge>
              </div>
            </div>

            {/* Grid de Campos de Filtro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* Data Inicial */}
              <div className="space-y-1">
                <Label className="text-slate-300 text-[11px] font-mono flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                  Data Inicial
                </Label>
                <Input
                  type="date"
                  value={periodoDataInicio}
                  onChange={(e) => setPeriodoDataInicio(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono h-9 focus:border-purple-500"
                />
              </div>

              {/* Data Final */}
              <div className="space-y-1">
                <Label className="text-slate-300 text-[11px] font-mono flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                  Data Final
                </Label>
                <Input
                  type="date"
                  value={periodoDataFim}
                  onChange={(e) => setPeriodoDataFim(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-slate-100 text-xs font-mono h-9 focus:border-purple-500"
                />
              </div>

              {/* Status de Revisão */}
              <div className="space-y-1">
                <Label className="text-slate-300 text-[11px] font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Status de Revisão
                </Label>
                <select
                  value={periodoStatusFiltro}
                  onChange={(e) => setPeriodoStatusFiltro(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-2.5 h-9 text-xs font-mono focus:border-purple-500"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="PENDENTE_HOMOLOGACAO">Pendente de Homologação (DJEN)</option>
                  <option value="CONFIRMADA">Confirmada na Pauta</option>
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>

              {/* Tribunal */}
              <div className="space-y-1">
                <Label className="text-slate-300 text-[11px] font-mono flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  Tribunal
                </Label>
                <select
                  value={periodoTribunalFiltro}
                  onChange={(e) => setPeriodoTribunalFiltro(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md px-2.5 h-9 text-xs font-mono focus:border-purple-500"
                >
                  <option value="TODOS">Todos os Tribunais</option>
                  {tribunaisDisponiveis.map((trib) => (
                    <option key={trib} value={trib}>
                      {trib}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botão de Disparo da Consulta Real */}
              <div className="space-y-1 flex flex-col justify-end">
                <Label className="opacity-0 hidden lg:block text-[11px]">Ação</Label>
                <Button
                  onClick={handleDispararConsultaPeriodo}
                  disabled={periodoIsSearching}
                  className="w-full h-9 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950/40 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {periodoIsSearching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Consultando DJEN...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Consultar Período
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Busca textual complementar por processo/cliente */}
            <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <Input
                  placeholder="Refinar busca por número de processo, cliente ou palavras-chave no teor..."
                  value={periodoTermoBusca}
                  onChange={(e) => setPeriodoTermoBusca(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDispararConsultaPeriodo()}
                  className="bg-slate-950 border-slate-800 pl-8 h-8 text-xs text-slate-200 focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() => {
                    const ini = todayIso
                    const fim = defaultFutureIso
                    setPeriodoDataInicio(ini)
                    setPeriodoDataFim(fim)
                    setPeriodoStatusFiltro('TODOS')
                    setPeriodoTribunalFiltro('TODOS')
                    setPeriodoTermoBusca('')
                    setPeriodoErrorState(null)
                    filtrarResultadosLocais(ini, fim, 'TODOS', 'TODOS', '')
                  }}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  Limpar Filtros
                </Button>

                <Button
                  onClick={() => {
                    const ini = todayIso
                    const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split('T')[0]
                    setPeriodoDataInicio(ini)
                    setPeriodoDataFim(next30)
                    executarConsultaPeriodo(
                      ini,
                      next30,
                      periodoStatusFiltro,
                      periodoTribunalFiltro,
                      periodoTermoBusca,
                    )
                  }}
                  variant="outline"
                  size="sm"
                  disabled={periodoIsSearching}
                  className="h-8 text-xs bg-slate-950 border-purple-800/60 text-purple-300 hover:bg-purple-950/40 disabled:opacity-60"
                >
                  Próximos 30 dias
                </Button>
              </div>
            </div>
          </div>

          {/* Área de Resultados da Consulta */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Resultados da Consulta de Audiências ({periodoResultados.length})
                </h3>
                {periodoHasConsulted && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-purple-800/80 text-purple-300 bg-purple-950/30"
                  >
                    {periodoDataInicio || '...'} até {periodoDataFim || '...'}
                  </Badge>
                )}
                {periodoApiStats && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-emerald-800/80 text-emerald-300 bg-emerald-950/30 hidden md:inline-flex"
                  >
                    CNJ: {periodoApiStats.totalApiFound} capturadas •{' '}
                    {periodoApiStats.audienciasDetectadas} audiência(s)
                  </Badge>
                )}
              </div>

              {periodoResultados.length > 0 && (
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
                    {
                      periodoResultados.filter((r) => r.statusRevisao === 'PENDENTE_HOMOLOGACAO')
                        .length
                    }{' '}
                    pendente(s)
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    {periodoResultados.filter((r) => r.statusRevisao === 'CONFIRMADA').length}{' '}
                    confirmada(s)
                  </span>
                </div>
              )}
            </div>

            {periodoResultados.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Video className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-300">
                    {periodoHasConsulted
                      ? 'Nenhuma audiência localizada no período e filtros informados.'
                      : 'Defina o período desejado e clique em "Consultar Período".'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    O Sentinela realiza a chamada em tempo real na ComunicaAPI (DJEN) usando a
                    OAB/MS 15.400 e filtra eventos do tipo AUDIENCIA com extração inteligente de
                    termos (&quot;audiência designada&quot;, &quot;audiência para o dia&quot;,
                    &quot;ficam as partes intimadas da audiência&quot;).
                  </p>
                </div>
                {!periodoHasConsulted && (
                  <Button
                    onClick={handleDispararConsultaPeriodo}
                    disabled={periodoIsSearching}
                    size="sm"
                    className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold"
                  >
                    {periodoIsSearching ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Consultando DJEN...
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 mr-1.5" />
                        Consultar Audiências Agora
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {periodoResultados.map((item) => {
                  const isPendente = item.statusRevisao === 'PENDENTE_HOMOLOGACAO'
                  const isConfirmada = item.statusRevisao === 'CONFIRMADA'
                  const isRascunho = item.statusRevisao === 'RASCUNHO'

                  // Formatação amigável de data
                  let dataFormatada = item.data
                  if (item.data && item.data.includes('-')) {
                    const [y, m, d] = item.data.split('-')
                    dataFormatada = `${d}/${m}/${y}`
                  }

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        isPendente
                          ? 'bg-purple-950/20 border-purple-800/80 hover:border-purple-600'
                          : isConfirmada
                            ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {/* Bloco de Data e Hora */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 text-center shrink-0 shadow-inner">
                          <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">
                            {dataFormatada.split('/')[1]
                              ? `${dataFormatada.split('/')[0]}/${dataFormatada.split('/')[1]}`
                              : 'AUD'}
                          </span>
                          <span className="text-xs font-bold font-mono text-cyan-300">
                            {item.hora || '14:00'}
                          </span>
                        </div>

                        {/* Conteúdo Informativo */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono bg-purple-950 text-purple-300 border-purple-700"
                            >
                              {item.tipoAudiencia || 'Audiência'}
                            </Badge>

                            {item.tribunal && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono text-cyan-300 border-cyan-800 bg-cyan-950/40"
                              >
                                {item.tribunal}
                              </Badge>
                            )}

                            {item.isVirtual && (
                              <Badge
                                variant="outline"
                                className="text-[9px] text-cyan-400 border-cyan-800 bg-cyan-950/30 flex items-center gap-1"
                              >
                                <Video className="w-2.5 h-2.5" /> Virtual
                              </Badge>
                            )}

                            {/* Badge de Status de Revisão */}
                            {isPendente && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono text-amber-300 border-amber-700 bg-amber-950/50 flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                Pendente de Homologação
                              </Badge>
                            )}

                            {isConfirmada && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono text-emerald-300 border-emerald-700 bg-emerald-950/40 flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Confirmada
                              </Badge>
                            )}

                            {isRascunho && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono text-slate-300 border-slate-700 bg-slate-900"
                              >
                                Rascunho
                              </Badge>
                            )}
                          </div>

                          {/* Processo e Título */}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-slate-100">
                                {item.processo}
                              </span>
                              {item.cliente && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="text-xs text-slate-300">
                                    Parte/Cliente:{' '}
                                    <strong className="text-slate-200">{item.cliente}</strong>
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5 font-medium">
                              {item.titulo}
                            </p>
                          </div>

                          {/* Trecho extraído do DJEN se houver */}
                          {item.trechoDjen && (
                            <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/90 font-serif italic max-w-3xl">
                              &quot;{item.trechoDjen}&quot;
                            </div>
                          )}

                          {/* Metadados adicionais */}
                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 text-cyan-300">
                              <CalendarIcon className="w-3 h-3" />
                              Data: {dataFormatada} às {item.hora}
                            </span>
                            {item.localOuLink && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-400 truncate max-w-md">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  {item.localOuLink}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="text-slate-500">
                              Origem:{' '}
                              {item.origem === 'DJEN_DETECTADA'
                                ? 'Detecção Autônoma DJEN'
                                : 'Agenda Oficial NOX'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações de Revisão Humana */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800 w-full lg:w-auto justify-end">
                        {isPendente && item.rawDetectada && (
                          <>
                            <Button
                              onClick={() => {
                                handleRejeitarAudienciaDjen(item.rawDetectada!)
                                setPeriodoResultados((prev) => prev.filter((p) => p.id !== item.id))
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                            >
                              Descartar
                            </Button>
                            <Button
                              onClick={() => {
                                handleAprovarAudienciaDjen(item.rawDetectada!)
                                setPeriodoResultados((prev) =>
                                  prev.map((p) =>
                                    p.id === item.id
                                      ? { ...p, statusRevisao: 'CONFIRMADA' as const }
                                      : p,
                                  ),
                                )
                              }}
                              size="sm"
                              className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-950 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Homologar na Pauta
                            </Button>
                          </>
                        )}

                        {isConfirmada && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-emerald-400 border-emerald-800/80 bg-emerald-950/40 py-1 px-2.5"
                          >
                            Integrada à Pauta
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: PAUTA GERAL DE AUDIÊNCIAS (DJEN + OFICIAIS) */}
        <TabsContent value="audiencias" className="space-y-5 mt-4">
          {/* Alertas de Audiências Detectadas Autonomamente pelo DJEN */}
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-purple-200">
                    Audiências Detectadas no DJEN ({audienciasDjen.length})
                  </h3>
                  <p className="text-xs text-purple-300/80">
                    O Sentinela leu as publicações recentes, extraiu data/hora e gerou rascunhos.
                    Nenhuma audiência é confirmada sem o seu consentimento.
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-purple-500 text-purple-300 bg-purple-950"
              >
                REVISÃO HUMANA OBRIGATÓRIA
              </Badge>
            </div>

            {audienciasDjen.length === 0 ? (
              <div className="py-4 text-center text-purple-300/70 text-xs bg-slate-950/40 rounded-lg">
                Nenhuma nova audiência pendente de homologação nos diários processados.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {audienciasDjen.map((aud) => (
                  <div
                    key={aud.communicationId}
                    className="p-4 rounded-xl bg-slate-950/90 border border-purple-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="text-[10px] bg-purple-900 text-purple-200 border-purple-700">
                          {aud.tipoAudiencia}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-slate-100">
                          {aud.processo}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono text-cyan-400 border-cyan-800"
                        >
                          {aud.tribunal}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 font-serif italic">
                        &quot;{aud.trechoExtraido}&quot;
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                        <span className="flex items-center gap-1 text-cyan-300">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          Data:{' '}
                          {aud.dataDetectada ? (
                            aud.dataDetectada
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] font-mono text-amber-300 border-amber-800 bg-amber-950/40"
                            >
                              Data a confirmar
                            </Badge>
                          )}{' '}
                          às {aud.horaDetectada}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 truncate">
                          Local/Link: {aud.localOuLink || 'Sala do Juízo'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => handleRejeitarAudienciaDjen(aud)}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                      >
                        Descartar
                      </Button>
                      <Button
                        onClick={() => handleAprovarAudienciaDjen(aud)}
                        size="sm"
                        className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-950 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Homologar na Agenda
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Audiências Já Agendadas / Confirmadas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-cyan-400" />
                Pauta de Audiências Confirmadas ({audienciasCadastradas.length})
              </h3>
            </div>

            {audienciasCadastradas.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
                Nenhuma audiência confirmada no momento.
              </div>
            ) : (
              <div className="space-y-2.5">
                {audienciasCadastradas.map((aud) => {
                  const startD = new Date(aud.startDate)
                  return (
                    <div
                      key={aud.id}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 text-center shrink-0">
                          <span className="text-[10px] font-mono text-purple-400 uppercase">
                            {startD.toLocaleString('pt-BR', { month: 'short' })}
                          </span>
                          <span className="text-base font-extrabold text-slate-100 font-mono leading-none">
                            {startD.getDate()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono bg-purple-950/80 text-purple-300 border-purple-700"
                            >
                              AUDIÊNCIA
                            </Badge>
                            <span className="text-xs sm:text-sm font-bold text-slate-200">
                              {aud.title}
                            </span>
                            {aud.isVirtual && (
                              <Badge
                                variant="outline"
                                className="text-[9px] text-cyan-400 border-cyan-800 bg-cyan-950/30 flex items-center gap-1"
                              >
                                <Video className="w-2.5 h-2.5" /> Virtual
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono flex-wrap">
                            <span className="text-cyan-300">
                              {startD.toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>•</span>
                            <span>{aud.responsible}</span>
                            {aud.processNumber && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-400">{aud.processNumber}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono text-emerald-400 border-emerald-800 bg-emerald-950/40 shrink-0 self-end sm:self-center"
                      >
                        {aud.status}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 4: SUGESTÕES AUTOMÁTICAS DE AGENDAMENTO */}
        <TabsContent value="sugestoes" className="space-y-5 mt-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Janelas Livres & Recomendações Autônomas
                </h3>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono text-emerald-300 border-emerald-700 bg-emerald-950/40"
              >
                1 PESSOA • SEM SOBREPOSIÇÃO
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              O motor analisa a pauta do titular (Higor Utinói), cruzando compromissos já marcados,
              prazos fatais de hoje e dos próximos 2 dias, e a complexidade das tarefas pendentes.
              As sugestões são puramente indicativas e podem ser aceitas ou ignoradas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {sugestoes.map((sug) => {
              const [y, m, d] = sug.data.split('-')
              const dataFormatada = `${d}/${m}/${y}`

              return (
                <div
                  key={sug.id}
                  className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3 space-y-2"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-cyan-300">
                          {dataFormatada} • {sug.inicio}–{sug.fim}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono ${
                            sug.tipoRecomendado === 'BLOCO_ESTUDO_COMPLEXIDADE'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                              : sug.tipoRecomendado === 'RESERVA_ESTRATEGICA'
                                ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {sug.tipoRecomendado === 'BLOCO_ESTUDO_COMPLEXIDADE'
                            ? 'Estudo de Complexidade'
                            : sug.tipoRecomendado === 'RESERVA_ESTRATEGICA'
                              ? 'Reserva de Prazo Fatal'
                              : 'Atendimento a Cliente'}
                        </Badge>
                      </div>

                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        Afinidade: {sug.pontuacaoAfinidade}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                      💬 &quot;{sug.motivo}&quot;
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500">
                      Titular: {sug.capacidadeMomento.personName.split(' ')[0]}
                    </span>
                    <Button
                      onClick={() => handleAceitarSugestao(sug)}
                      size="sm"
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                    >
                      Agendar Neste Horário
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* TAB 5: TODOS OS EVENTOS & FILTRAGEM */}
        <TabsContent value="todos" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Filtrar por título, cliente, processo ou responsável..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="bg-slate-950 border-slate-800 pl-8 h-8 text-xs text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono text-[11px]">Tipo:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2.5 py-1 text-xs font-mono"
              >
                <option value="TODOS">Todos os Tipos</option>
                <option value="ATENDIMENTO">Atendimento</option>
                <option value="AUDIENCIA">Audiência</option>
                <option value="REUNIAO">Reunião</option>
                <option value="COMPROMISSO">Compromisso</option>
                <option value="DILIGENCIA">Diligência</option>
                <option value="VENCIMENTO_PRAZO">Vencimento de Prazo</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
                Nenhum evento encontrado para o filtro aplicado.
              </div>
            ) : (
              filteredEvents.map((ev) => {
                const badgeConfig = EVENT_TYPE_BADGES[ev.eventType] || EVENT_TYPE_BADGES.COMPROMISSO
                const startD = new Date(ev.startDate)

                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-slate-950 border border-slate-800 text-center shrink-0">
                        <span className="text-[9px] font-mono text-cyan-400 uppercase">
                          {startD.toLocaleString('pt-BR', { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold text-slate-100 font-mono leading-none">
                          {startD.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-mono px-1.5 py-0 ${badgeConfig.bg} ${badgeConfig.text} ${badgeConfig.border}`}
                          >
                            {badgeConfig.label}
                          </Badge>
                          <span className="text-xs font-bold text-slate-200">{ev.title}</span>
                          {ev.isVirtual && (
                            <Badge
                              variant="outline"
                              className="text-[9px] text-cyan-400 border-cyan-800 bg-cyan-950/30 flex items-center gap-1"
                            >
                              <Video className="w-2.5 h-2.5" /> Virtual
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {startD.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span>•</span>
                          <span>{ev.responsible}</span>
                          {ev.clientName && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400">Cliente: {ev.clientName}</span>
                            </>
                          )}
                          {ev.processNumber && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-400/80">{ev.processNumber}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono text-slate-300 border-slate-700 bg-slate-950 shrink-0 self-end sm:self-center"
                    >
                      {ev.status}
                    </Badge>
                  </div>
                )
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL DE INSERÇÃO MANUAL DE ATENDIMENTOS E COMPROMISSOS */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-cyan-400" />
              {manualType === 'ATENDIMENTO'
                ? 'Agendar Atendimento a Cliente'
                : 'Agendar Novo Compromisso'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Preencha os dados do agendamento. Conflitos de horário com outros compromissos serão
              sinalizados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveManualEvent} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-300">Título do Compromisso / Assunto</Label>
              <Input
                required
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Ex: Atendimento Inicial - Ação Revisional ou Audiência de Conciliação"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300">Cliente / Parte</Label>
                <Input
                  value={manualClient}
                  onChange={(e) => setManualClient(e.target.value)}
                  placeholder="Nome do cliente"
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Tipo de Evento</Label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as AgendaEventType)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded px-2.5 py-1.5 text-xs"
                >
                  <option value="ATENDIMENTO">Atendimento a Cliente</option>
                  <option value="AUDIENCIA">Audiência Judicial</option>
                  <option value="REUNIAO">Reunião Interna/Parceiros</option>
                  <option value="DILIGENCIA">Diligência Forense</option>
                  <option value="COMPROMISSO">Compromisso Geral</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-slate-300">Data</Label>
                <Input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Início</Label>
                <Input
                  type="time"
                  required
                  value={manualStartTime}
                  onChange={(e) => setManualStartTime(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Término</Label>
                <Input
                  type="time"
                  required
                  value={manualEndTime}
                  onChange={(e) => setManualEndTime(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-300">Modalidade</Label>
                <div className="flex items-center gap-3 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="modalidade"
                      checked={manualIsVirtual}
                      onChange={() => setManualIsVirtual(true)}
                      className="accent-cyan-400"
                    />
                    <span>Virtual (Zoom/Teams)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="modalidade"
                      checked={!manualIsVirtual}
                      onChange={() => setManualIsVirtual(false)}
                      className="accent-cyan-400"
                    />
                    <span>Presencial</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Responsável</Label>
                <Input
                  value={manualResponsible}
                  onChange={(e) => setManualResponsible(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Local ou Link da Sala Virtual</Label>
              <Input
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder={
                  manualIsVirtual
                    ? 'https://zoom.us/j/... ou link do Teams'
                    : 'Endereço do escritório ou Fórum'
                }
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Observações / Pauta</Label>
              <Input
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Notas adicionais sobre o atendimento..."
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setManualModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Confirmar Agendamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CompromissosPage
