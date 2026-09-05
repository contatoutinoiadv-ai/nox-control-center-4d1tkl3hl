import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ConversationSummary,
  ConversationMessage,
  ConversationFilter,
  ConversationStatus,
  ConversationPriority,
} from '@/types/atendimento'
import { getConversationRepository } from '@/repositories/conversationRepositoryProvider'
import {
  ConversationList,
  ConversationHeader,
  MessageTimeline,
  MessageComposer,
  IntelligencePanel,
  IntelligenceTab,
  AtendimentoMetrics,
  AtendimentoHeaderTabs,
  AtendimentoModuleTab,
  TransferAtendimentoModal,
  CreateTaskFromAtendimentoModal,
  CreateAppointmentFromAtendimentoModal,
  LinkProcessModal,
  LinkClientModal,
  HistoryEventItem,
} from '@/components/atendimento'
import { NoxPageHeader, NoxEmptyState, NoxErrorState, NoxButton } from '@/design-system'
import { clientService } from '@/services/clients/ClientService'
import { taskService } from '@/services/tasks/TaskService'
import { appointmentService } from '@/services/appointments/AppointmentService'
import { datajudService, ProcessoMonitorado } from '@/services/datajudService'
import { auditService } from '@/services/audit/AuditService'
import { NoxClient } from '@/types/nox'
import { TaskPriority, AgendaEventType } from '@/types/sentinela'
import { cn } from '@/lib/utils'
import { MessageSquare, Sparkles, WifiOff, PanelRightOpen, ArrowRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'

export const CentralAtendimentoPage: React.FC = () => {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const repository = getConversationRepository()

  // Tab de nível superior do módulo
  const [moduleTab, setModuleTab] = useState<AtendimentoModuleTab>('ATENDIMENTO')

  // Estados de dados da página
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [currentFilter, setCurrentFilter] = useState<ConversationFilter>('TODAS')
  const [searchQuery, setSearchQuery] = useState('')
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [urgentTotal, setUrgentTotal] = useState(0)

  // Estados de ciclo de vida (LOADING, ERROR, OFFLINE)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  // Mobile/Tablet navigation state
  // Mobile: 'FILA' -> 'CHAT' -> 'INTELIGENCIA'
  // Tablet: Drawer de inteligência aberto/fechado
  const [mobileScreen, setMobileScreen] = useState<'FILA' | 'CHAT' | 'INTELIGENCIA'>('FILA')
  const [isTabletDrawerOpen, setIsTabletDrawerOpen] = useState(false)

  // Dados reais integrados
  const [allClients, setAllClients] = useState<NoxClient[]>([])
  const [matchedClient, setMatchedClient] = useState<NoxClient | null>(null)
  const [clientProcesses, setClientProcesses] = useState<ProcessoMonitorado[]>([])
  const [allMonitoredProcesses, setAllMonitoredProcesses] = useState<ProcessoMonitorado[]>([])

  // Tab ativa do Painel de Inteligência
  const [intelligenceActiveTab, setIntelligenceActiveTab] =
    useState<IntelligenceTab>('INTELIGENCIA')

  // Trilha de eventos de auditoria e histórico em memória da sessão
  const [sessionHistoryEvents, setSessionHistoryEvents] = useState<HistoryEventItem[]>([])

  // Modais de Ação Integrada
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [isCreateAppointmentModalOpen, setIsCreateAppointmentModalOpen] = useState(false)
  const [isLinkProcessModalOpen, setIsLinkProcessModalOpen] = useState(false)
  const [isLinkClientModalOpen, setIsLinkClientModalOpen] = useState(false)

  // Texto para inserir no composer ao aprovar sugestão de IA
  const [composerPresetText, setComposerPresetText] = useState<string | null>(null)

  // Monitoramento de conexão online/offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Carrega clientes reais e processos reais da base NOX
  useEffect(() => {
    const loadRealData = async () => {
      try {
        const clientRes = await clientService.listClients()
        if (clientRes.success && clientRes.data) {
          setAllClients(clientRes.data)
        }
        const procs = await datajudService.getProcessosMonitorados()
        setAllMonitoredProcesses(procs)
      } catch (err) {
        console.warn('Erro ao carregar dados integrados:', err)
      }
    }
    loadRealData()
  }, [])

  // Carrega lista de conversas
  const loadConversations = useCallback(async () => {
    setIsLoadingList(true)
    setErrorMessage(null)
    try {
      const res = await repository.listConversations({
        filter: currentFilter,
        searchQuery,
      })
      if (res.success && res.data) {
        setConversations(res.data.items)
        setUnreadTotal(res.data.unreadTotal)
        setUrgentTotal(res.data.urgentTotal)

        // Se houver uma selecionada, atualiza seus dados
        if (selectedConversation) {
          const updated = res.data.items.find((c) => c.id === selectedConversation.id)
          if (updated) setSelectedConversation(updated)
        }
      } else {
        setErrorMessage(res.error?.message || 'Falha ao listar atendimentos.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao carregar atendimentos.')
    } finally {
      setIsLoadingList(false)
    }
  }, [currentFilter, searchQuery, repository, selectedConversation])

  // Efeito para carregar ao alterar filtros ou busca
  useEffect(() => {
    loadConversations()
  }, [currentFilter, searchQuery])

  // Sincroniza cliente e processos reais quando a conversa selecionada muda
  useEffect(() => {
    if (!selectedConversation) {
      setMatchedClient(null)
      setClientProcesses([])
      return
    }

    // 1. Busca cliente por clientId explícito ou correspondência exata de telefone/nome
    let foundClient: NoxClient | null = null
    if (selectedConversation.clientId) {
      foundClient = allClients.find((c) => c.id === selectedConversation.clientId) || null
    }

    if (!foundClient) {
      const pPhone = selectedConversation.participantPhone.replace(/\D/g, '')
      const pName = selectedConversation.participantName.trim().toLowerCase()

      foundClient =
        allClients.find((c) => {
          const cPhone = (c.telefone || '').replace(/\D/g, '')
          if (
            pPhone &&
            cPhone &&
            (pPhone === cPhone || cPhone.endsWith(pPhone) || pPhone.endsWith(cPhone))
          ) {
            return true
          }
          if (pName && c.nome.trim().toLowerCase() === pName) {
            return true
          }
          return false
        }) || null
    }

    setMatchedClient(foundClient)

    // 2. Busca processos associados ao cliente
    if (foundClient) {
      const clientProcs = allMonitoredProcesses.filter((p) => {
        const pCli = (p.cliente || '').trim().toLowerCase()
        const fCli = (foundClient?.nome || '').trim().toLowerCase()
        return (
          pCli === fCli ||
          (p.client_id && p.client_id === foundClient?.id) ||
          (selectedConversation.linkedProcessNumber &&
            p.numero_processo === selectedConversation.linkedProcessNumber)
        )
      })
      setClientProcesses(clientProcs)
    } else if (selectedConversation.linkedProcessNumber) {
      const singleProc = allMonitoredProcesses.filter(
        (p) => p.numero_processo === selectedConversation.linkedProcessNumber,
      )
      setClientProcesses(singleProc)
    } else {
      setClientProcesses([])
    }
  }, [selectedConversation, allClients, allMonitoredProcesses])

  // Assinatura em tempo real de eventos do repository
  useEffect(() => {
    const unsubscribe = repository.subscribe((event) => {
      if (event.type === 'message:created') {
        const newMsg = event.payload as ConversationMessage
        if (selectedConversation && newMsg.conversationId === selectedConversation.id) {
          setMessages((prev) => [...prev, newMsg])
        }
      } else if (event.type === 'conversation:updated') {
        const updatedConv = event.payload as ConversationSummary
        setConversations((prev) => prev.map((c) => (c.id === updatedConv.id ? updatedConv : c)))
        if (selectedConversation && selectedConversation.id === updatedConv.id) {
          setSelectedConversation(updatedConv)
        }
      }
    })
    return () => unsubscribe()
  }, [repository, selectedConversation])

  // Seleciona conversa e carrega timeline
  const handleSelectConversation = async (conv: ConversationSummary) => {
    setSelectedConversation(conv)
    setIsLoadingMessages(true)
    if (isMobile) {
      setMobileScreen('CHAT')
    }

    // Registra evento de auditoria conceitual
    try {
      await auditService.log(
        'CONVERSATION_OPENED',
        'sistema',
        conv.assignedTo || 'Operador NOX',
        conv.id,
        {
          summary: `Atendimento com ${conv.participantName} aberto para análise operacional.`,
        },
      )
    } catch {
      // Ignora erro de auditoria para não travar UI
    }

    try {
      // Marca como lida
      if (conv.unreadCount > 0) {
        await repository.markAsRead(conv.id)
      }

      const res = await repository.getMessages(conv.id)
      if (res.success && res.data) {
        setMessages(res.data)
      } else {
        toast.error('Erro ao buscar histórico de mensagens.')
      }
    } catch (err) {
      console.warn('Erro ao carregar mensagens:', err)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Enviar mensagem ao cliente
  const handleSendMessage = async (content: string, mentions?: string[]) => {
    if (!selectedConversation) return
    const res = await repository.sendMessage(
      {
        conversationId: selectedConversation.id,
        content,
        type: 'TEXT',
        mentions,
      },
      selectedConversation.assignedTo || 'Higor Utinoi',
    )

    if (!res.success) {
      toast.error('Não foi possível enviar mensagem.', {
        description: res.error?.message,
      })
    }
  }

  // Enviar nota interna
  const handleSendInternalNote = async (content: string, mentions?: string[]) => {
    if (!selectedConversation) return
    const res = await repository.sendMessage(
      {
        conversationId: selectedConversation.id,
        content,
        type: 'INTERNAL_NOTE',
        mentions,
      },
      selectedConversation.assignedTo || 'Higor Utinoi',
    )

    if (res.success) {
      // Adiciona evento ao histórico
      const newEvt: HistoryEventItem = {
        id: `note-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: selectedConversation.assignedTo || 'Higor Utinoi',
        type: 'INTERNAL_NOTE_CREATED',
        label: 'Nota interna gravada',
        details: content.length > 60 ? `${content.substring(0, 60)}...` : content,
      }
      setSessionHistoryEvents((prev) => [newEvt, ...prev])
    } else {
      toast.error('Não foi possível registrar nota interna.', {
        description: res.error?.message,
      })
    }
  }

  // Atualizar status
  const handleUpdateStatus = async (status: ConversationStatus) => {
    if (!selectedConversation) return
    const res = await repository.updateStatus(
      selectedConversation.id,
      status,
      selectedConversation.assignedTo || 'Higor Utinoi',
    )
    if (res.success && res.data) {
      setSelectedConversation(res.data)
      toast.success(`Estado atualizado para ${status}.`)

      // Evento de histórico
      const newEvt: HistoryEventItem = {
        id: `st-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: selectedConversation.assignedTo || 'Higor Utinoi',
        type: 'STATUS_CHANGED',
        label: `Status alterado para ${status}`,
      }
      setSessionHistoryEvents((prev) => [newEvt, ...prev])
    } else {
      toast.error('Erro ao atualizar estado.')
    }
  }

  // Atualizar prioridade
  const handleUpdatePriority = async (priority: ConversationPriority) => {
    if (!selectedConversation) return
    const res = await repository.updatePriority(
      selectedConversation.id,
      priority,
      selectedConversation.assignedTo || 'Higor Utinoi',
    )
    if (res.success && res.data) {
      setSelectedConversation(res.data)
      toast.success(`Prioridade alterada para ${priority}.`)
    } else {
      toast.error('Erro ao atualizar prioridade.')
    }
  }

  // Triar com IA NOX (ação rápida do cabeçalho)
  const handleTriggerAiTriage = () => {
    if (!selectedConversation) return
    setIntelligenceActiveTab('INTELIGENCIA')
    if (!isMobile && window.innerWidth < 1024) {
      setIsTabletDrawerOpen(true)
    } else if (isMobile) {
      setMobileScreen('INTELIGENCIA')
    }
    toast.success('Triagem IA ativa', {
      description: `Oráculo NOX analisou o teor de ${selectedConversation.participantName}.`,
    })
  }

  // Sugerir resposta rápida com IA
  const handleSuggestResponse = () => {
    if (!selectedConversation) return
    setIntelligenceActiveTab('INTELIGENCIA')
    if (!isMobile && window.innerWidth < 1024) {
      setIsTabletDrawerOpen(true)
    } else if (isMobile) {
      setMobileScreen('INTELIGENCIA')
    }
    toast.info('Sugestão de resposta disponível', {
      description: 'Abra a aba Inteligência para revisar, editar e aprovar a minuta.',
    })
  }

  // Transferir atendimento para outro operador
  const handleConfirmTransfer = async (newResponsible: string, note?: string) => {
    if (!selectedConversation) return
    const res = await repository.assignConversation(selectedConversation.id, newResponsible)
    if (res.success && res.data) {
      setSelectedConversation(res.data)

      // Se houver nota de transferência, grava como nota interna
      if (note) {
        await repository.sendMessage(
          {
            conversationId: selectedConversation.id,
            content: `TRANSFERÊNCIA DE CUSTÓDIA para ${newResponsible}. Motivo: ${note}`,
            type: 'INTERNAL_NOTE',
          },
          'Higor Utinoi',
        )
      }

      // Adiciona evento de histórico
      const newEvt: HistoryEventItem = {
        id: `trf-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: 'Higor Utinoi',
        type: 'CONVERSATION_ASSIGNED',
        label: `Atendimento transferido para ${newResponsible}`,
        details: note,
      }
      setSessionHistoryEvents((prev) => [newEvt, ...prev])

      toast.success(`Atendimento transferido para ${newResponsible}.`)
    } else {
      toast.error('Erro ao transferir atendimento.')
    }
  }

  // Criar tarefa no módulo de Produção existente
  const handleConfirmCreateTask = async (taskData: {
    title: string
    description: string
    priority: TaskPriority
    processNumber?: string
    clientName?: string
    internalDueDate: string
    responsible: string
  }) => {
    if (!selectedConversation) return

    try {
      const res = await taskService.createTask({
        title: taskData.title,
        description: `[Origem: CENTRAL DE ATENDIMENTO] ${taskData.description}`,
        priority: taskData.priority,
        processNumber: taskData.processNumber,
        clientName: taskData.clientName,
        internalDueDate: taskData.internalDueDate,
        responsible: taskData.responsible,
        status: 'A_FAZER',
      })

      if (res.success) {
        toast.success('Tarefa cadastrada com sucesso no módulo de Produção NOX.', {
          description: `Título: ${taskData.title}`,
        })

        // Evento de histórico
        const newEvt: HistoryEventItem = {
          id: `task-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: taskData.responsible,
          type: 'TASK_CREATED_FROM_CONVERSATION',
          label: `Tarefa criada: ${taskData.title}`,
          details: `Prioridade: ${taskData.priority} | Vencimento: ${taskData.internalDueDate}`,
        }
        setSessionHistoryEvents((prev) => [newEvt, ...prev])

        // Grava nota interna de confirmação
        await repository.sendMessage(
          {
            conversationId: selectedConversation.id,
            content: `Tarefa gerada no módulo de Produção: "${taskData.title}" (Prioridade: ${taskData.priority}, Resp: ${taskData.responsible}).`,
            type: 'INTERNAL_NOTE',
          },
          'Sistema NOX',
        )
      } else {
        toast.error('Erro ao gravar tarefa na Produção.', {
          description: res.error?.message,
        })
      }
    } catch (err: any) {
      toast.error('Erro inesperado ao criar tarefa.', {
        description: err.message,
      })
    }
  }

  // Agendar compromisso no módulo de Compromissos/Agenda existente
  const handleConfirmCreateAppointment = async (appointmentData: {
    title: string
    description: string
    eventType: AgendaEventType
    processNumber?: string
    clientName?: string
    startDate: string
    endDate: string
    isVirtual: boolean
    locationOrLink?: string
    responsible: string
  }) => {
    if (!selectedConversation) return

    try {
      const res = await appointmentService.createAppointment({
        title: appointmentData.title,
        description: `[Origem: CENTRAL DE ATENDIMENTO] ${appointmentData.description}`,
        eventType: appointmentData.eventType,
        processNumber: appointmentData.processNumber,
        clientName: appointmentData.clientName,
        startDate: appointmentData.startDate,
        endDate: appointmentData.endDate,
        isVirtual: appointmentData.isVirtual,
        locationOrLink: appointmentData.locationOrLink,
        responsible: appointmentData.responsible,
        status: 'AGENDADO',
      })

      if (res.success) {
        toast.success('Compromisso agendado com sucesso na Agenda NOX.', {
          description: `${appointmentData.title} (${appointmentData.eventType})`,
        })

        // Evento de histórico
        const newEvt: HistoryEventItem = {
          id: `apt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: appointmentData.responsible,
          type: 'APPOINTMENT_CREATED',
          label: `Compromisso agendado: ${appointmentData.title}`,
          details: `Data: ${new Date(appointmentData.startDate).toLocaleString()} | Local: ${appointmentData.locationOrLink || 'Online'}`,
        }
        setSessionHistoryEvents((prev) => [newEvt, ...prev])

        // Grava nota interna
        await repository.sendMessage(
          {
            conversationId: selectedConversation.id,
            content: `Compromisso agendado na Agenda NOX: "${appointmentData.title}" em ${new Date(appointmentData.startDate).toLocaleString()}.`,
            type: 'INTERNAL_NOTE',
          },
          'Sistema NOX',
        )
      } else {
        toast.error('Erro ao gravar compromisso na agenda.', {
          description: res.error?.message,
        })
      }
    } catch (err: any) {
      toast.error('Erro inesperado ao agendar compromisso.', {
        description: err.message,
      })
    }
  }

  // Vincular processo existente à conversa
  const handleConfirmLinkProcess = async (processNumber: string) => {
    if (!selectedConversation) return
    const res = await repository.linkProcess(selectedConversation.id, processNumber)
    if (res.success && res.data) {
      setSelectedConversation(res.data)
      toast.success(`Processo ${processNumber} vinculado à conversa com sucesso.`)

      // Evento de histórico
      const newEvt: HistoryEventItem = {
        id: `proc-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: selectedConversation.assignedTo || 'Higor Utinoi',
        type: 'PROCESS_LINKED',
        label: `Processo ${processNumber} vinculado`,
      }
      setSessionHistoryEvents((prev) => [newEvt, ...prev])
    } else {
      toast.error('Erro ao vincular processo.')
    }
  }

  // Vincular cliente existente à conversa
  const handleConfirmLinkClient = async (clientId: string, clientName: string) => {
    if (!selectedConversation) return
    const res = await repository.linkClient(selectedConversation.id, clientId)
    if (res.success && res.data) {
      setSelectedConversation(res.data)
      toast.success(`Cliente ${clientName} vinculado com sucesso.`)

      // Evento de histórico
      const newEvt: HistoryEventItem = {
        id: `cli-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: selectedConversation.assignedTo || 'Higor Utinoi',
        type: 'CLIENT_LINKED',
        label: `Cliente vinculado: ${clientName}`,
      }
      setSessionHistoryEvents((prev) => [newEvt, ...prev])
    } else {
      toast.error('Erro ao vincular cliente.')
    }
  }

  // Ação de solicitar documento ao cliente (insere modelo padrão na conversa)
  const handleRequestDocument = () => {
    if (!selectedConversation) return
    const reqText = `Olá, ${selectedConversation.participantName}. Para resguardarmos o prazo legal e analisarmos as medidas cabíveis, por favor envie uma foto nítida da correspondência ou intimação que você recebeu.`
    setComposerPresetText(reqText)
    toast.info('Texto de solicitação de documento preenchido no chat.', {
      description: 'Revise o conteúdo e clique em Enviar.',
    })
    if (isMobile) {
      setMobileScreen('CHAT')
    }
  }

  // Aplica resposta sugerida pela IA no chat
  const handleApplySuggestedResponse = (response: string) => {
    setComposerPresetText(response)
    toast.success('Minuta sugerida inserida no chat.', {
      description: 'Revise e edite o texto antes do envio.',
    })
    if (isMobile) {
      setMobileScreen('CHAT')
    }
  }

  // Navega para a ficha do cliente no módulo de Clientes
  const handleNavigateToClient = (clientId: string) => {
    if (clientId === 'new') {
      navigate('/clientes')
    } else {
      navigate('/clientes', { state: { highlightClientId: clientId } })
    }
  }

  // Navega para detalhe do processo
  const handleNavigateToProcessDetail = (processNumber: string) => {
    navigate('/processos', { state: { searchNumber: processNumber } })
  }

  // Métricas calculadas para os indicadores de topo
  const waitingClientTotal = useMemo(
    () => conversations.filter((c) => c.status === 'AGUARDANDO_CLIENTE').length,
    [conversations],
  )

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#030712]">
      {/* 1. Header do Módulo NOX */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-800/80 bg-[#050811] shrink-0">
        <NoxPageHeader
          title="Central de Atendimento"
          description="Gestão integrada de mensageria com clientes, triagem com IA e custódia de comunicações jurídicas."
          icon={MessageSquare}
          badge={
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-gradient-to-r from-purple-950 to-cyan-950 text-cyan-300 border border-cyan-500/50">
              FASE 5: LOTE 2 (FINAL)
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              {/* Botão de abrir painel de inteligência em tablet */}
              {selectedConversation && (
                <button
                  onClick={() => setIsTabletDrawerOpen(true)}
                  className="hidden md:flex lg:hidden items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 hover:bg-slate-800"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Painel Inteligência</span>
                </button>
              )}
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                MOCK ADAPTER NOX
              </span>
            </div>
          }
        />
      </div>

      {/* 2. Tabs Superiores do Módulo */}
      <AtendimentoHeaderTabs
        activeTab={moduleTab}
        onTabChange={(tab) => {
          setModuleTab(tab)
          if (tab === 'AGENDAMENTOS') navigate('/agenda')
          if (tab === 'TAREFAS') navigate('/producao')
        }}
      />

      {/* 3. Indicadores Discretos no Topo */}
      <AtendimentoMetrics
        totalOpen={conversations.length}
        unreadCount={unreadTotal}
        urgentCount={urgentTotal}
        waitingClientCount={waitingClientTotal}
        isMockDemo={true}
      />

      {/* Banner de Estado OFFLINE */}
      {isOffline && (
        <div className="bg-amber-950/90 border-b border-amber-600 px-4 py-1.5 flex items-center justify-between text-amber-200 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span>Conexão perdida. Operando em modo cache local.</span>
          </div>
          <button
            onClick={() => loadConversations()}
            className="text-xs underline hover:text-white"
          >
            Tentar reconectar
          </button>
        </div>
      )}

      {/* Tratamento de Estado de ERRO global */}
      {errorMessage ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <NoxErrorState
            title="Falha ao carregar central de atendimento"
            description={errorMessage}
            actionLabel="Tentar novamente"
            onAction={loadConversations}
          />
        </div>
      ) : (
        /* LAYOUT PRINCIPAL: RESPONSIVIDADE ESTRITA:
         * Desktop (>= 1024px): 3 colunas (FILA 24% | CHAT 46% | INTELIGENCIA 30%)
         * Tablet (768px - 1023px): 2 colunas (FILA 32% | CHAT 68%) + Drawer Tablet para Inteligencia
         * Mobile (< 768px): 1 coluna sequencial (Tela 1 Fila -> Tela 2 Chat -> Tela 3 Inteligencia)
         */
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* ============================================================== */}
          {/* COLUNA 1: FILA DE ATENDIMENTO (24% desktop, full no mobile)    */}
          {/* ============================================================== */}
          <div
            className={cn(
              'h-full transition-all duration-200 shrink-0 border-r border-slate-800',
              // Desktop & Tablet
              'hidden md:flex md:w-[320px] lg:w-[24%]',
              // Mobile conditional
              mobileScreen === 'FILA' && 'flex w-full',
            )}
          >
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
              currentFilter={currentFilter}
              onFilterChange={setCurrentFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              unreadTotal={unreadTotal}
              urgentTotal={urgentTotal}
              isLoading={isLoadingList}
              onRefresh={loadConversations}
              className="w-full"
            />
          </div>

          {/* ============================================================== */}
          {/* COLUNA 2: CHAT CENTRAL (46% desktop, expansível no tablet)     */}
          {/* ============================================================== */}
          <div
            className={cn(
              'flex-1 flex flex-col h-full bg-[#030712] overflow-hidden min-w-0 transition-all duration-200',
              // Mobile conditional
              mobileScreen !== 'CHAT' && 'hidden md:flex',
            )}
          >
            {selectedConversation ? (
              <>
                <ConversationHeader
                  conversation={selectedConversation}
                  onBackMobile={() => setMobileScreen('FILA')}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdatePriority={handleUpdatePriority}
                  onTriggerAiTriage={handleTriggerAiTriage}
                  onSuggestResponse={handleSuggestResponse}
                  onOpenTransferModal={() => setIsTransferModalOpen(true)}
                  onCreateTask={() => setIsCreateTaskModalOpen(true)}
                  onScheduleAppointment={() => setIsCreateAppointmentModalOpen(true)}
                  onLinkProcess={() => setIsLinkProcessModalOpen(true)}
                />

                {/* Barra de Acesso Rápido Mobile/Tablet ao Painel de Inteligência */}
                <div className="lg:hidden bg-gradient-to-r from-purple-950/40 to-cyan-950/40 border-b border-purple-800/40 px-3 py-1.5 flex items-center justify-between text-xs font-mono text-purple-300">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Inteligência NOX: {matchedClient ? matchedClient.nome : 'Contato'}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (isMobile) {
                        setMobileScreen('INTELIGENCIA')
                      } else {
                        setIsTabletDrawerOpen(true)
                      }
                    }}
                    className="flex items-center gap-1 font-bold text-cyan-300 hover:underline"
                  >
                    <span>Abrir Painel</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <MessageTimeline messages={messages} isLoading={isLoadingMessages} />

                <MessageComposer
                  presetContent={composerPresetText}
                  onPresetContentConsumed={() => setComposerPresetText(null)}
                  onSendMessage={handleSendMessage}
                  onSendInternalNote={handleSendInternalNote}
                />
              </>
            ) : (
              /* EMPTY STATE OBRIGATÓRIO */
              <div className="flex-1 flex items-center justify-center p-6 bg-[#030712]">
                <NoxEmptyState
                  icon={MessageSquare}
                  title="Nenhum atendimento em análise"
                  description="Selecione um atendimento na fila para iniciar a análise operacional e triagem jurídica."
                  className="max-w-md p-10"
                />
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* COLUNA 3: PAINEL INTELIGÊNCIA NOX (30% desktop, full mobile)  */}
          {/* ============================================================== */}
          <div
            className={cn(
              'h-full shrink-0 transition-all duration-200',
              // Desktop: terceira coluna visível fixa (30%)
              'hidden lg:flex lg:w-[30%]',
              // Mobile conditional quando selecionada Tela 3
              mobileScreen === 'INTELIGENCIA' && 'flex w-full',
            )}
          >
            <IntelligencePanel
              conversation={selectedConversation}
              client={matchedClient}
              processes={clientProcesses}
              processCount={clientProcesses.length}
              activeTab={intelligenceActiveTab}
              onTabChange={setIntelligenceActiveTab}
              onCloseDrawer={() => setMobileScreen('CHAT')}
              onNavigateToClient={handleNavigateToClient}
              onCreateTask={() => setIsCreateTaskModalOpen(true)}
              onScheduleAppointment={() => setIsCreateAppointmentModalOpen(true)}
              onOpenLinkClientModal={() => setIsLinkClientModalOpen(true)}
              onOpenLinkProcessModal={() => setIsLinkProcessModalOpen(true)}
              onOpenTransferModal={() => setIsTransferModalOpen(true)}
              onRequestDocument={handleRequestDocument}
              onApplySuggestedResponse={handleApplySuggestedResponse}
              onSelectRelatedProcess={handleConfirmLinkProcess}
              onNavigateToProcessDetail={handleNavigateToProcessDetail}
              customHistoryEvents={sessionHistoryEvents}
            />
          </div>

          {/* ============================================================== */}
          {/* DRAWER FLUTUANTE DE INTELIGÊNCIA PARA TABLET (768px - 1023px)   */}
          {/* ============================================================== */}
          {isTabletDrawerOpen && (
            <div className="hidden md:flex lg:hidden fixed inset-y-0 right-0 z-50 w-[420px] shadow-2xl bg-[#050811] border-l border-slate-800">
              <div className="w-full h-full flex flex-col">
                <IntelligencePanel
                  conversation={selectedConversation}
                  client={matchedClient}
                  processes={clientProcesses}
                  processCount={clientProcesses.length}
                  activeTab={intelligenceActiveTab}
                  onTabChange={setIntelligenceActiveTab}
                  onCloseDrawer={() => setIsTabletDrawerOpen(false)}
                  onNavigateToClient={handleNavigateToClient}
                  onCreateTask={() => setIsCreateTaskModalOpen(true)}
                  onScheduleAppointment={() => setIsCreateAppointmentModalOpen(true)}
                  onOpenLinkClientModal={() => setIsLinkClientModalOpen(true)}
                  onOpenLinkProcessModal={() => setIsLinkProcessModalOpen(true)}
                  onOpenTransferModal={() => setIsTransferModalOpen(true)}
                  onRequestDocument={handleRequestDocument}
                  onApplySuggestedResponse={handleApplySuggestedResponse}
                  onSelectRelatedProcess={handleConfirmLinkProcess}
                  onNavigateToProcessDetail={handleNavigateToProcessDetail}
                  customHistoryEvents={sessionHistoryEvents}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAIS OPERACIONAIS INTEGRADOS                                 */}
      {/* ============================================================== */}
      {selectedConversation && (
        <>
          {/* Modal 1: Transferir Atendimento */}
          <TransferAtendimentoModal
            open={isTransferModalOpen}
            onOpenChange={setIsTransferModalOpen}
            currentResponsible={selectedConversation.assignedTo || 'Higor Utinoi'}
            onConfirmTransfer={handleConfirmTransfer}
          />

          {/* Modal 2: Criar Tarefa no Módulo de Produção */}
          <CreateTaskFromAtendimentoModal
            open={isCreateTaskModalOpen}
            onOpenChange={setIsCreateTaskModalOpen}
            defaultClientName={matchedClient?.nome || selectedConversation.participantName}
            defaultProcessNumber={selectedConversation.linkedProcessNumber}
            conversationId={selectedConversation.id}
            onConfirmCreateTask={handleConfirmCreateTask}
          />

          {/* Modal 3: Agendar Compromisso na Agenda NOX */}
          <CreateAppointmentFromAtendimentoModal
            open={isCreateAppointmentModalOpen}
            onOpenChange={setIsCreateAppointmentModalOpen}
            defaultClientName={matchedClient?.nome || selectedConversation.participantName}
            defaultProcessNumber={selectedConversation.linkedProcessNumber}
            conversationId={selectedConversation.id}
            onConfirmCreateAppointment={handleConfirmCreateAppointment}
          />

          {/* Modal 4: Vincular Processo CNJ */}
          <LinkProcessModal
            open={isLinkProcessModalOpen}
            onOpenChange={setIsLinkProcessModalOpen}
            currentProcessNumber={selectedConversation.linkedProcessNumber}
            availableProcesses={allMonitoredProcesses}
            onConfirmLink={handleConfirmLinkProcess}
          />

          {/* Modal 5: Vincular Cliente da Base */}
          <LinkClientModal
            open={isLinkClientModalOpen}
            onOpenChange={setIsLinkClientModalOpen}
            currentParticipantName={selectedConversation.participantName}
            availableClients={allClients}
            onConfirmLink={handleConfirmLinkClient}
          />
        </>
      )}
    </div>
  )
}

export default CentralAtendimentoPage
