import React, { useState, useEffect, useCallback } from 'react'
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
  IntelligencePanelPlaceholder,
} from '@/components/atendimento'
import { NoxPageHeader, NoxEmptyState, NoxErrorState, NoxButton } from '@/design-system'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  Sparkles,
  Bot,
  AlertCircle,
  WifiOff,
  RefreshCw,
  FolderOpen,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'

export const CentralAtendimentoPage: React.FC = () => {
  const isMobile = useIsMobile()
  const repository = getConversationRepository()

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

  // Mobile navigation state (Tela 1: Fila -> Tela 2: Chat -> Tela 3: Inteligência)
  const [mobileScreen, setMobileScreen] = useState<'FILA' | 'CHAT' | 'INTELIGENCIA'>('FILA')

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
      'Higor Utinoi',
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
      'Higor Utinoi',
    )

    if (!res.success) {
      toast.error('Não foi possível registrar nota interna.', {
        description: res.error?.message,
      })
    }
  }

  // Atualizar status
  const handleUpdateStatus = async (status: ConversationStatus) => {
    if (!selectedConversation) return
    const res = await repository.updateStatus(selectedConversation.id, status, 'Higor Utinoi')
    if (res.success && res.data) {
      setSelectedConversation(res.data)
      toast.success(`Estado atualizado para ${status}.`)
    } else {
      toast.error('Erro ao atualizar estado.')
    }
  }

  // Atualizar prioridade
  const handleUpdatePriority = async (priority: ConversationPriority) => {
    if (!selectedConversation) return
    const res = await repository.updatePriority(selectedConversation.id, priority, 'Higor Utinoi')
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
    toast.success('Triagem IA disparada', {
      description: `Oráculo NOX analisou o teor de ${selectedConversation.participant.name}. Intimação identificada.`,
    })
  }

  // Sugerir resposta rápida com IA
  const handleSuggestResponse = () => {
    toast.info('Sugestão de resposta gerada', {
      description: 'Oráculo NOX redigiu minuta defensiva em conformidade com o Art. 335 do CPC.',
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-[#030712]">
      {/* Cabeçalho Oficial do Design System NOX V2 */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-800/80 bg-[#050811] shrink-0">
        <NoxPageHeader
          title="Central de Atendimento"
          description="Gestão integrada de mensageria com clientes, triagem com IA e custódia de comunicações jurídicas."
          icon={MessageSquare}
          badge={
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-gradient-to-r from-purple-950 to-cyan-950 text-cyan-300 border border-cyan-500/50">
              FASE 5 — LOTE 1 (OPERACIONAL)
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                MOCK ADAPTER ATIVO
              </span>
            </div>
          }
        />
      </div>

      {/* Banner de Estado OFFLINE quando detectada queda de rede */}
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
        /* LAYOUT PRINCIPAL — RESPONSIVIDADE ESTRITA:
         * Desktop (>= 1024px): 3 colunas (FILA 25% | CHAT 45% | INTELIGÊNCIA 30%)
         * Tablet (768px - 1023px): 2 colunas (FILA 35% | CHAT 65%)
         * Mobile (< 768px): 1 coluna sequencial com chaveamento (Tela 1 Fila -> Tela 2 Chat -> Tela 3 Inteligência)
         */
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* ============================================================== */}
          {/* COLUNA 1: FILA DE ATENDIMENTO (25% no desktop, full no mobile) */}
          {/* ============================================================== */}
          <div
            className={cn(
              'h-full transition-all duration-200 shrink-0',
              // Desktop & Tablet
              'hidden md:flex md:w-[320px] lg:w-[26%] xl:w-[24%]',
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
          {/* COLUNA 2: CHAT CENTRAL (45% no desktop, expansível no tablet) */}
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
                />

                {/* Botão Mobile para transitar para Tela 3 (Inteligência) */}
                <div className="md:hidden bg-purple-950/40 border-b border-purple-800/40 px-3 py-1.5 flex items-center justify-between text-xs font-mono text-purple-300">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Oráculo IA NOX disponível</span>
                  </div>
                  <button
                    onClick={() => setMobileScreen('INTELIGENCIA')}
                    className="flex items-center gap-1 font-bold text-cyan-300 hover:underline"
                  >
                    <span>Ver Inteligência</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <MessageTimeline messages={messages} isLoading={isLoadingMessages} />

                <MessageComposer
                  onSendMessage={handleSendMessage}
                  onSendInternalNote={handleSendInternalNote}
                />
              </>
            ) : (
              /* EMPTY STATE OBRIGATÓRIO (Exigência 13 da especificação) */
              <div className="flex-1 flex items-center justify-center p-6 bg-[#030712]">
                <NoxEmptyState
                  icon={MessageSquare}
                  title="Nenhum atendimento em análise"
                  description="Selecione um atendimento para iniciar a análise operacional."
                  className="max-w-md p-10"
                />
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* COLUNA 3: INTELIGÊNCIA NOX (30% no desktop, drawer no tablet/mobile) */}
          {/* ============================================================== */}
          <div
            className={cn(
              'h-full shrink-0 transition-all duration-200',
              // Desktop: terceira coluna presente
              'hidden lg:flex lg:w-[32%] xl:w-[30%]',
              // Mobile conditional quando selecionada Tela 3
              mobileScreen === 'INTELIGENCIA' && 'flex w-full',
            )}
          >
            <IntelligencePanelPlaceholder
              conversation={selectedConversation}
              className="w-full"
              onCloseMobileDrawer={() => setMobileScreen('CHAT')}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CentralAtendimentoPage
