import React, { useState, useEffect, useRef } from 'react'
import {
  Send,
  Loader2,
  HelpCircle,
  Clock,
  MapPin,
  Video,
  FileText,
  User,
  Users,
  Shield,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  ArrowRight,
  Gavel,
  Scale,
  Calendar,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pocketbase/client'

// Tipagens do Módulo Preparação
interface PreparacaoPayload {
  clientId: string
  modo: 'conciliacao' | 'instrucao'
  client: {
    nome: string
    descricaoCaso?: string
    demanda?: string
  }
  agenda: {
    id: string
    title: string
    description?: string
    startDate: string
    endDate?: string
    isVirtual: boolean
    locationOrLink?: string
    processNumber?: string
    tribunal?: string
    responsible: string
    participants?: string[]
  }
  alegacoes?: {
    revisado_por?: string
    data_revisao?: string
    o_que_voce_contou?: string
    o_que_outra_parte_respondeu?: string
    o_que_esta_em_aberto?: string
  } | null
  aprovadoParaCliente?: boolean
}

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  isFronteiraMerito?: boolean
  timestamp: string
}

// Hook para Reveal suave com IntersectionObserver
const useScrollReveal = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

const RevealSection: React.FC<{
  id: string
  children: React.ReactNode
  className?: string
}> = ({ id, children, className = '' }) => {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </section>
  )
}

export const PreparacaoPublicPage: React.FC = () => {
  // Estado de Autenticação / Acesso por CPF
  const [cpf, setCpf] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [prepData, setPrepData] = useState<PreparacaoPayload | null>(null)

  // Barra de progresso de leitura no topo
  const [readingProgress, setReadingProgress] = useState(0)
  const [activeSection, setActiveSection] = useState('')

  // Checklist do Módulo 1
  const [checklist, setChecklist] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  })

  // Timeline interativa do Módulo 1 (qual etapa expandida)
  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(0)

  // Acordeão de perguntas (Módulo 1 e 2)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Chat de dúvidas
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Olá! Sou o assistente de preparação para audiência. Posso tirar dúvidas sobre o procedimento, tempo de fala, ordem das perguntas ou como funciona a sala. Como posso ajudar?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Contagem regressiva ao vivo
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isPast: boolean
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false })

  // Formatador de CPF no input
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
    }
    setCpf(v)
    if (authError) setAuthError('')
  }

  // Submissão do CPF para login / validação
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = cpf.replace(/\D/g, '')
    if (!clean || clean.length !== 11) {
      setAuthError('Informe um CPF válido com 11 dígitos.')
      return
    }

    setAuthLoading(true)
    setAuthError('')

    try {
      const baseUrl = pb.baseUrl || ''
      const res = await fetch(`${baseUrl}/api/preparacao/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      })

      const data = await res.json()
      if (data && data.ok) {
        setPrepData(data)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setAuthError(data?.error || 'Não encontramos nenhuma preparação disponível para esse CPF.')
      }
    } catch (err: any) {
      console.warn('Erro ao consultar preparação:', err)
      setAuthError('Não encontramos nenhuma preparação disponível para esse CPF.')
    } finally {
      setAuthLoading(false)
    }
  }

  // Atualização da barra de scroll e navegação lateral
  useEffect(() => {
    if (!prepData) return

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop || document.body.scrollTop
      const windowHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight
      const progress = windowHeight > 0 ? (totalScroll / windowHeight) * 100 : 0
      setReadingProgress(Math.min(100, Math.max(0, progress)))

      // Seção ativa
      const sections = [
        'sec-card',
        'sec-historia',
        'sec-participantes',
        'sec-dinamica',
        'sec-faq',
        'sec-alegacoes',
        'sec-checklist',
        'sec-chat',
      ]
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i])
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 200) {
            setActiveSection(sections[i])
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [prepData])

  // Contagem regressiva para a audiência
  useEffect(() => {
    if (!prepData?.agenda?.startDate) return

    const targetTime = new Date(prepData.agenda.startDate).getTime()

    const updateCountdown = () => {
      const now = new Date().getTime()
      const diff = targetTime - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isPast: false })
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [prepData?.agenda?.startDate])

  // Rolar chat para a última mensagem
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, chatLoading])

  // Enviar mensagem no chat
  const handleSendChat = async (textToSend?: string) => {
    const question = (textToSend || chatInput).trim()
    if (!question || chatLoading) return

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setChatMessages((prev) => [...prev, userMsg])
    if (!textToSend) setChatInput('')
    setChatLoading(true)

    try {
      const baseUrl = pb.baseUrl || ''
      const res = await fetch(`${baseUrl}/api/preparacao/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: prepData?.clientId || '',
          pergunta: question,
          modo: prepData?.modo || 'conciliacao',
          nomeCliente: prepData?.client?.nome || 'Cliente',
          nomeAdvogado: prepData?.agenda?.responsible || 'Dr. Higor Utinoi de Oliveira',
        }),
      })

      const data = await res.json()
      if (data && data.ok) {
        const assistantMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: data.resposta,
          isFronteiraMerito: data.tipo === 'fronteira_merito',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setChatMessages((prev) => [...prev, assistantMsg])
      } else {
        const errorMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: 'Essa é uma pergunta sobre o mérito do seu caso ou sobre o que falar sobre os fatos — isso é conversa só com o seu advogado. Posso te ajudar a entender como a audiência funciona, se quiser.',
          isFronteiraMerito: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setChatMessages((prev) => [...prev, errorMsg])
      }
    } catch (err) {
      console.warn('Erro ao chamar chat:', err)
      const fallbackMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: 'Não consegui conectar ao servidor neste instante, mas lembre-se: durante a audiência você estará acompanhado do seu advogado o tempo todo e não precisa ter pressa para falar.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setChatMessages((prev) => [...prev, fallbackMsg])
    } finally {
      setChatLoading(false)
    }
  }

  // Navegação lateral por pontos (Desktop)
  const navItems = [
    { id: 'sec-card', label: 'Sua Audiência' },
    { id: 'sec-historia', label: 'O que é este dia' },
    { id: 'sec-participantes', label: 'Quem vai estar na sala' },
    {
      id: 'sec-dinamica',
      label:
        prepData?.modo === 'conciliacao' ? 'Passo a passo da sessão' : 'Como a sala vai funcionar',
    },
    ...(prepData?.modo === 'instrucao' && prepData.alegacoes
      ? [{ id: 'sec-alegacoes', label: 'O que já foi dito' }]
      : []),
    { id: 'sec-faq', label: 'Perguntas e Dúvidas' },
    ...(prepData?.modo === 'conciliacao' ? [{ id: 'sec-checklist', label: 'Antes do dia' }] : []),
    { id: 'sec-chat', label: 'Chat de Dúvidas' },
  ]

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 40
      window.scrollTo({ top: topOffset, behavior: 'smooth' })
    }
  }

  // =========================================================================
  // TELA DE ENTRADA (COMPARTILHADA)
  // =========================================================================
  if (!prepData) {
    return (
      <div className="min-h-screen bg-prep-root text-slate-200 font-inter flex flex-col justify-between selection:bg-[#d4af6e]/30 selection:text-white">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md mx-auto">
            {/* Brasão / Identificador sutil */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-prep-card border border-prep-gold/40 shadow-xl mb-4">
                <Scale className="w-6 h-6 text-prep-gold" />
              </div>
              <p className="text-xs font-semibold tracking-widest text-[#d4af6e] uppercase">
                Utinoi Advogados • Orientação ao Cliente
              </p>
            </div>

            <Card className="bg-prep-card border border-prep-gold/30 shadow-2xl overflow-hidden rounded-xl">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-3 text-center">
                  <h1 className="font-playfair text-3xl md:text-4xl italic text-prep-gold font-normal leading-tight">
                    Antes do dia, vamos conversar.
                  </h1>
                  <p className="text-sm text-slate-300 leading-relaxed font-light">
                    Este espaço foi preparado só para você entender o que vai acontecer na sua
                    audiência. Digite seu CPF para continuar.
                  </p>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-5 pt-2">
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-medium text-slate-400 tracking-wide uppercase">
                      Seu CPF
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={cpf}
                        onChange={handleCpfChange}
                        placeholder="000.000.000-00"
                        className="bg-prep-card-alt border-prep-gold/30 focus:border-prep-gold text-slate-100 placeholder:text-slate-600 h-12 text-base font-mono tracking-wider pl-4 pr-10 rounded-lg"
                        autoFocus
                        disabled={authLoading}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3.5 bg-amber-950/40 border border-amber-800/50 rounded-lg text-amber-200 text-xs flex items-start space-x-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#d4af6e] shrink-0 mt-0.5" />
                      <span className="leading-snug">{authError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={authLoading}
                    className="w-full h-12 bg-[#d4af6e] hover:bg-[#c39e5d] text-[#07070a] font-semibold text-sm tracking-wide rounded-lg transition-all duration-200 shadow-lg shadow-[#d4af6e]/10 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verificando preparação...</span>
                      </>
                    ) : (
                      <>
                        <span>Entrar</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>

                  <div className="pt-2 text-center">
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      Seus dados são usados apenas para esta orientação.
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>

            <div className="mt-8 text-center text-[11px] text-slate-600">
              NOX Control Center &bull; Ambiente Seguro e Confidencial
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // MODOS DE AUDIÊNCIA (1 - CONCILIAÇÃO / 2 - INSTRUÇÃO E JULGAMENTO)
  // =========================================================================
  const isConciliacao = prepData.modo === 'conciliacao'
  const isInstrucao = prepData.modo === 'instrucao'
  const lawyerName = prepData.agenda.responsible || 'Dr. Higor Utinoi de Oliveira'

  const formattedDate = prepData.agenda.startDate
    ? new Date(prepData.agenda.startDate).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''
  const formattedTime = prepData.agenda.startDate
    ? new Date(prepData.agenda.startDate).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  // Checklist handler
  const toggleChecklistItem = (id: number) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }))
  }
  const completedChecklistCount = Object.values(checklist).filter(Boolean).length
  const checklistPercentage = (completedChecklistCount / 4) * 100

  // Quick Chips para o chat
  const quickChips = isConciliacao
    ? [
        'Como funciona a sala virtual?',
        'O que fazer se o sinal de internet cair?',
        'Sou obrigado a fechar acordo se a proposta for ruim?',
        'Posso pedir um momento para falar a sós com meu advogado?',
      ]
    : [
        'Em que ordem as pessoas vão falar?',
        'O que fazer se eu não lembrar de uma data?',
        'O juiz costuma fazer perguntas difíceis?',
        'Como devo me dirigir ao juiz durante o depoimento?',
      ]

  return (
    <div className="min-h-screen bg-prep-root text-slate-200 font-inter selection:bg-[#d4af6e]/30 selection:text-white pb-28 relative">
      {/* 1. Barra de progresso de leitura fixa no topo (linha dourada de 2px) */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-[#d4af6e] z-50 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(212,175,110,0.6)]"
        style={{ width: `${readingProgress}%` }}
      />

      {/* 2. Navegação lateral por pontos (desktop, oculta em mobile) */}
      <aside className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 flex-col space-y-4 z-40">
        {navItems.map((item) => {
          const isActive = activeSection === item.id
          return (
            <div key={item.id} className="relative group flex items-center">
              <button
                onClick={() => scrollToSection(item.id)}
                className={`w-3 h-3 rounded-full transition-all duration-300 border ${
                  isActive
                    ? 'bg-[#d4af6e] border-[#d4af6e] scale-125 shadow-[0_0_8px_rgba(212,175,110,0.5)]'
                    : 'bg-transparent border-slate-600 hover:border-[#d4af6e]/70'
                }`}
                aria-label={item.label}
              />
              <div className="absolute left-6 whitespace-nowrap px-2.5 py-1 rounded bg-[#0f0f14] border border-[#d4af6e]/20 text-[11px] text-slate-300 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl">
                {item.label}
              </div>
            </div>
          )
        })}
      </aside>

      {/* Header discreto com identificação do cliente */}
      <header className="border-b border-prep-gold/20 bg-[#07070a]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Scale className="w-5 h-5 text-prep-gold" />
            <span className="text-xs uppercase tracking-widest text-[#d4af6e] font-semibold">
              Orientação Jurídica • {prepData.client.nome}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPrepData(null)
              setCpf('')
            }}
            className="text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 h-8 px-3 rounded"
          >
            Sair
          </Button>
        </div>
      </header>

      {/* Container Principal */}
      <main className="max-w-3xl mx-auto px-4 pt-10 pb-16 space-y-16">
        {/* ===================================================================
            SEÇÃO 1: CARD DA AUDIÊNCIA
           =================================================================== */}
        <RevealSection id="sec-card">
          <Card className="bg-prep-card border border-prep-gold/40 shadow-2xl rounded-xl overflow-hidden relative">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Badge className="bg-[#d4af6e]/15 text-[#d4af6e] border border-prep-gold-strong text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                  Sua audiência
                </Badge>
                {prepData.agenda.processNumber && (
                  <span className="text-xs font-mono text-slate-400">
                    Processo nº {prepData.agenda.processNumber}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <h2 className="font-playfair text-2xl md:text-3xl text-prep-gold italic font-normal">
                  {isConciliacao
                    ? 'Audiência de Conciliação'
                    : 'Audiência de Instrução e Julgamento'}
                </h2>
                <p className="text-sm text-slate-300 font-light">
                  {prepData.agenda.description ||
                    (isConciliacao
                      ? 'Sessão com tentativa de diálogo amigável mediada por conciliador.'
                      : 'Sessão solene para depoimento pessoal das partes e oitiva de testemunhas.')}
                </p>
              </div>

              {/* Metadados Reais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-prep-gold/20">
                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <Calendar className="w-4 h-4 text-prep-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider">
                      Data e Horário
                    </span>
                    <span className="font-medium capitalize">
                      {formattedDate || 'Data a confirmar'}
                    </span>
                    {formattedTime && (
                      <span className="block text-slate-400 font-mono">às {formattedTime}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-prep-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider">
                      Órgão / Tribunal
                    </span>
                    <span className="font-medium">
                      {prepData.agenda.tribunal || 'Poder Judiciário'}
                    </span>
                    <span className="block text-slate-400">
                      {prepData.agenda.isVirtual
                        ? 'Formato Virtual (Telepresencial)'
                        : 'Presencial no Fórum'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 text-xs text-slate-300">
                  <User className="w-4 h-4 text-prep-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-[11px] uppercase tracking-wider">
                      Advogado Responsável
                    </span>
                    <span className="font-medium text-slate-200">{lawyerName}</span>
                  </div>
                </div>

                {prepData.agenda.isVirtual && prepData.agenda.locationOrLink && (
                  <div className="flex items-start space-x-3 text-xs text-slate-300">
                    <Video className="w-4 h-4 text-prep-gold shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 block text-[11px] uppercase tracking-wider">
                        Acesso à Sala
                      </span>
                      <a
                        href={prepData.agenda.locationOrLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#d4af6e] hover:underline break-all"
                      >
                        Clique para acessar o link oficial
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Contagem regressiva ao vivo (obrigatória para Conciliação) */}
              {isConciliacao && (
                <div className="p-4 rounded-lg bg-prep-card-alt border border-prep-gold/30 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 text-prep-gold">
                      <Clock className="w-3.5 h-3.5" />
                      Tempo restante até a audiência
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      Horário de Brasília
                    </span>
                  </div>
                  {timeLeft.isPast ? (
                    <div className="text-sm font-medium text-amber-300">
                      Horário da audiência atingido ou sessão em andamento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 text-center pt-1 font-mono">
                      <div className="bg-[#07070a] p-2 rounded border border-prep-gold/20">
                        <span className="block text-xl md:text-2xl font-bold text-slate-100">
                          {timeLeft.days}
                        </span>
                        <span className="text-[10px] uppercase text-slate-400">Dias</span>
                      </div>
                      <div className="bg-[#07070a] p-2 rounded border border-prep-gold/20">
                        <span className="block text-xl md:text-2xl font-bold text-slate-100">
                          {timeLeft.hours}
                        </span>
                        <span className="text-[10px] uppercase text-slate-400">Horas</span>
                      </div>
                      <div className="bg-[#07070a] p-2 rounded border border-prep-gold/20">
                        <span className="block text-xl md:text-2xl font-bold text-slate-100">
                          {timeLeft.minutes}
                        </span>
                        <span className="text-[10px] uppercase text-slate-400">Minutos</span>
                      </div>
                      <div className="bg-[#07070a] p-2 rounded border border-prep-gold/20">
                        <span className="block text-xl md:text-2xl font-bold text-prep-gold">
                          {timeLeft.seconds}
                        </span>
                        <span className="text-[10px] uppercase text-slate-400">Segundos</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </RevealSection>

        {/* ===================================================================
            SEÇÃO 2: BLOCO DE HISTÓRIA DE ABERTURA (Citação itálico dourado)
           =================================================================== */}
        <RevealSection id="sec-historia">
          <div className="space-y-6">
            <div className="border-l-2 border-prep-gold-strong pl-6 py-2 space-y-4">
              {isConciliacao ? (
                <>
                  <p className="font-playfair italic text-lg md:text-xl text-prep-gold leading-relaxed font-normal">
                    &ldquo;Imagina uma mesa redonda. De um lado, você. Do outro, a pessoa ou empresa
                    com quem você está em conflito. No meio da mesa, sentada, tem uma pessoa que não
                    é dona de nada disso, não vai te julgar, e cujo único trabalho é uma coisa:
                    ajudar os dois lados a encontrar um jeito de resolver isso sem precisar
                    continuar brigando.&rdquo;
                  </p>
                  <p className="font-playfair italic text-lg md:text-xl text-prep-gold leading-relaxed font-normal">
                    &ldquo;Ela não vai dizer quem tem razão. Ela não é juíza de novela, não bate
                    martelo, não condena ninguém ali. Ela é uma ponte. E o resultado dessa conversa
                    pode ser: vocês chegam a um acordo, assinam, e tudo termina naquele instante —
                    ou não chegam, e nesse caso simplesmente nada muda: o processo segue exatamente
                    o caminho que já estava seguindo, sem nenhum prejuízo pra você.&rdquo;
                  </p>
                  <p className="font-playfair italic text-lg md:text-xl text-prep-gold leading-relaxed font-normal">
                    &ldquo;O nome disso é conciliação. E o motivo de existir é simples: às vezes,
                    duas pessoas conseguem resolver uma briga muito mais rápido conversando do que
                    esperando anos por uma decisão de outra pessoa sobre a vida delas.&rdquo;
                  </p>
                </>
              ) : (
                <>
                  <p className="font-playfair italic text-lg md:text-xl text-prep-gold leading-relaxed font-normal">
                    &ldquo;Essa é a audiência em que o juiz quer te ouvir de verdade — não a sua
                    versão escrita no papel, a sua voz, contando o que você viveu. Pensa assim: até
                    agora, o processo é feito de documentos e petições, coisas frias, escritas por
                    advogados. Essa audiência é o único momento em que você mesmo vai falar, com
                    suas próprias palavras.&rdquo;
                  </p>
                  <p className="font-playfair italic text-lg md:text-xl text-prep-gold leading-relaxed font-normal">
                    &ldquo;Não é uma prova de escola, com resposta certa pra decorar antes. É contar
                    a verdade, com calma, do jeito que você se lembra. Se em algum momento você não
                    lembrar de um detalhe, tudo bem — dizer &apos;não lembro&apos; também é uma
                    resposta honesta, e honesta é a única coisa que importa nesse dia.&rdquo;
                  </p>
                  <p className="font-playfair italic text-lg md:text-xl text-prep-gold leading-relaxed font-normal">
                    &ldquo;O juiz não está ali pra te pegar em contradição. Ele está tentando
                    entender uma história de verdade, e a melhor forma de contar uma história de
                    verdade é contando ela como ela aconteceu — sem enfeitar, sem ensaiar.&rdquo;
                  </p>
                </>
              )}
            </div>
          </div>
        </RevealSection>

        {/* ===================================================================
            SEÇÃO 3: QUEM VAI ESTAR NA SALA (Visual com 4 participantes)
           =================================================================== */}
        <RevealSection id="sec-participantes">
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-prep-gold">
                Composição do ambiente
              </h3>
              <h2 className="font-playfair text-2xl text-slate-100 font-normal">
                Quem vai estar na sala
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Participante 1: Você */}
              <div className="p-5 rounded-xl bg-prep-card border border-prep-gold/20 hover:border-prep-gold/40 transition-colors duration-200 space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#d4af6e]/15 border border-prep-gold/40 flex items-center justify-center text-prep-gold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-100">Você</h4>
                    <span className="text-[11px] text-[#d4af6e]">{prepData.client.nome}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  {isConciliacao
                    ? 'Está ali para ouvir as possibilidades e falar com suas próprias palavras, com tranquilidade e sem pressão.'
                    : 'Vai contar com sinceridade e calma o que vivenciou no seu dia a dia.'}
                </p>
              </div>

              {/* Participante 2: Conciliador ou Juiz */}
              <div className="p-5 rounded-xl bg-prep-card border border-prep-gold/20 hover:border-prep-gold/40 transition-colors duration-200 space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#d4af6e]/15 border border-prep-gold/40 flex items-center justify-center text-prep-gold">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-100">
                      {isConciliacao ? 'Conciliador Judicial' : 'Juiz(a) de Direito'}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {isConciliacao ? 'Facilitador do diálogo' : 'Magistrado condutor'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  {isConciliacao
                    ? 'Não julga nem condena. Apenas auxilia a conversa para verificar se há acordo satisfatório para você.'
                    : 'Dirige a audiência, faz perguntas para esclarecer os fatos e garante a ordem dos depoimentos.'}
                </p>
              </div>

              {/* Participante 3: A outra parte */}
              <div className="p-5 rounded-xl bg-prep-card border border-prep-gold/20 hover:border-prep-gold/40 transition-colors duration-200 space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#d4af6e]/15 border border-prep-gold/40 flex items-center justify-center text-prep-gold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-100">A Outra Parte</h4>
                    <span className="text-[11px] text-slate-400">
                      Pessoa ou preposto da empresa
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  {isConciliacao
                    ? 'Estará presente (ou com representante) para apresentar a visão deles e analisar propostas.'
                    : 'Prestará depoimento sobre o caso no momento oportuno determinado pelo juiz.'}
                </p>
              </div>

              {/* Participante 4: Advogados */}
              <div className="p-5 rounded-xl bg-prep-card border border-prep-gold/20 hover:border-prep-gold/40 transition-colors duration-200 space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-[#d4af6e]/15 border border-prep-gold/40 flex items-center justify-center text-prep-gold">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-100">Advogados de cada lado</h4>
                    <span className="text-[11px] text-[#d4af6e]">{lawyerName} com você</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  Seu advogado estará conectado com você o tempo todo, garantindo seus direitos e
                  orientando cada etapa.
                </p>
              </div>
            </div>
          </div>
        </RevealSection>

        {/* ===================================================================
            SEÇÃO 4: DINÂMICA DA SESSÃO
            MODO 1: TIMELINE INTERATIVA CLICÁVEL (5 ETAPAS)
            MODO 2: "COMO A SALA VAI FUNCIONAR" (4 BLOCOS) + "4 REGRAS"
           =================================================================== */}
        <RevealSection id="sec-dinamica">
          {isConciliacao ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-prep-gold">
                  O passo a passo
                </h3>
                <h2 className="font-playfair text-2xl text-slate-100 font-normal">
                  Como funciona a audiência de conciliação
                </h2>
                <p className="text-xs text-slate-400">
                  Clique em cada etapa para entender exatamente o que acontece:
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    title: 'Entrada',
                    summary: 'Chegada antecipada e teste de conexão',
                    fullText:
                      'Alguns minutos antes do horário, você recebe (ou já tem) o link da sala virtual. Entra, e alguém confirma que todo mundo que precisa estar ali, está. Pense nisso como chegar um pouco antes numa reunião importante — só pra garantir que o áudio e a câmera estão funcionando, sem pressa nenhuma.',
                  },
                  {
                    step: 2,
                    title: 'Abertura',
                    summary: 'Apresentação do conciliador e regras de respeito',
                    fullText:
                      'O conciliador se apresenta e explica, com as próprias palavras dele, como a sessão vai funcionar. Ele deixa claro que aquilo não é um julgamento — é uma tentativa de conversa. É normal essa parte parecer meio formal no começo. Isso passa rápido assim que a conversa de verdade começa.',
                  },
                  {
                    step: 3,
                    title: 'Sua fala',
                    summary: 'Seu momento de relatar sem interrupções',
                    fullText:
                      "Chega a sua vez de contar o que aconteceu, com suas próprias palavras. Ninguém vai te interromper, corrigir seu jeito de falar, ou apressar você. Não existe 'forma certa' de contar. O importante é que seja a sua versão, verdadeira, do jeito que você se lembra.",
                  },
                  {
                    step: 4,
                    title: 'Proposta',
                    summary: 'Debate de alternativas sem pressão de resposta imediata',
                    fullText:
                      'Em algum momento, pode surgir uma proposta de acordo — de um lado, do outro, ou sugerida pelo próprio conciliador. Você não é obrigado a decidir ali, na hora, sob pressão. Pode pedir um tempo, ou dizer que quer conversar com seu advogado antes de topar qualquer coisa. Isso é normal e ninguém vai estranhar.',
                  },
                  {
                    step: 5,
                    title: 'Encerramento',
                    summary: 'Acordo formalizado ou prosseguimento normal do processo',
                    fullText:
                      'A sessão termina de dois jeitos: com acordo fechado (e registrado por escrito ali mesmo) ou sem acordo — e nesse caso, o processo simplesmente segue o caminho normal dele, sem nenhuma penalidade por você não ter aceitado uma proposta que não fez sentido pra você.',
                  },
                ].map((item, index) => {
                  const isOpen = activeTimelineStep === index
                  return (
                    <div
                      key={item.step}
                      onClick={() => setActiveTimelineStep(isOpen ? -1 : index)}
                      className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isOpen
                          ? 'bg-prep-card-alt border-prep-gold-strong shadow-lg'
                          : 'bg-prep-card border-prep-gold/20 hover:border-prep-gold/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3.5">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold ${
                              isOpen
                                ? 'bg-[#d4af6e] text-[#07070a]'
                                : 'bg-prep-card-alt text-[#d4af6e] border border-prep-gold/30'
                            }`}
                          >
                            {item.step}
                          </span>
                          <div>
                            <h4 className="font-medium text-sm text-slate-100">{item.title}</h4>
                            <p className="text-xs text-slate-400 font-light">{item.summary}</p>
                          </div>
                        </div>
                        <div className="text-slate-400 text-xs">
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-prep-gold" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-prep-gold/20 text-xs text-slate-300 font-light leading-relaxed">
                          {item.fullText}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* MODO 2 - INSTRUÇÃO E JULGAMENTO */
            <div className="space-y-12">
              {/* Como a sala vai funcionar (4 blocos) */}
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-prep-gold">
                    Rito processual
                  </h3>
                  <h2 className="font-playfair text-2xl text-slate-100 font-normal">
                    Como a sala vai funcionar
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-prep-card border border-prep-gold/20 space-y-2">
                    <h4 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af6e]" />
                      Quem pergunta e em que ordem
                    </h4>
                    <p className="text-xs text-slate-400 font-light leading-relaxed">
                      Primeiro o juiz costuma fazer perguntas gerais, pra entender o caso. Depois, o
                      advogado de cada lado tem sua vez de perguntar — sempre um de cada vez, nunca
                      duas pessoas falando ao mesmo tempo.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-prep-card border border-prep-gold/20 space-y-2">
                    <h4 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af6e]" />
                      Seu advogado está com você
                    </h4>
                    <p className="text-xs text-slate-400 font-light leading-relaxed">
                      Ele está ali, na sala, o tempo todo. Se alguma pergunta for feita de um jeito
                      injusto ou fora do lugar, ele pode intervir — você não está sozinho nesse
                      momento.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-prep-card border border-prep-gold/20 space-y-2">
                    <h4 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af6e]" />
                      Tudo é gravado
                    </h4>
                    <p className="text-xs text-slate-400 font-light leading-relaxed">
                      A sessão inteira fica registrada em áudio (às vezes vídeo). Isso é bom pra
                      você: não existe depois um &apos;ele disse, ela disse&apos; sobre o que foi
                      dito ali — está tudo guardado exatamente como aconteceu.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl bg-prep-card border border-prep-gold/20 space-y-2">
                    <h4 className="text-sm font-medium text-slate-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af6e]" />
                      Ninguém está com pressa
                    </h4>
                    <p className="text-xs text-slate-400 font-light leading-relaxed">
                      Se você precisar de um instante pra organizar o pensamento antes de responder,
                      pode pedir. Isso não muda em nada como sua fala é recebida.
                    </p>
                  </div>
                </div>
              </div>

              {/* As únicas 4 regras que valem pra qualquer caso */}
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-prep-gold">
                    Orientações essenciais
                  </h3>
                  <h2 className="font-playfair text-2xl text-slate-100 font-normal">
                    As únicas 4 regras que valem pra qualquer caso
                  </h2>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      num: '1',
                      rule: 'Respire e responda com calma',
                      why: 'Ninguém está cronometrando você. Um silêncio de alguns segundos pra pensar é normal e não passa má impressão nenhuma.',
                    },
                    {
                      num: '2',
                      rule: 'Escute a pergunta inteira antes de responder',
                      why: 'É bem comum alguém começar a responder no meio da pergunta e acabar respondendo outra coisa. Deixar a pergunta terminar evita confusão.',
                    },
                    {
                      num: '3',
                      rule: 'Diga a verdade',
                      why: "Não porque 'é a lei que manda' — mas porque a verdade é a única versão que você não precisa se esforçar pra sustentar depois. É a coisa mais simples de fazer ali dentro.",
                    },
                    {
                      num: '4',
                      rule: '"Não sei" e "não lembro" são respostas válidas',
                      why: 'Tentar inventar um detalhe que você não tem certeza costuma causar mais problema do que admitir que não lembra. Ninguém espera memória perfeita de nada.',
                    },
                  ].map((item) => (
                    <div
                      key={item.num}
                      className="p-5 rounded-xl bg-prep-card border border-prep-gold/25 space-y-2"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-[#d4af6e] text-[#07070a] text-xs font-bold font-mono flex items-center justify-center">
                          {item.num}
                        </span>
                        <h4 className="font-medium text-sm text-slate-100">{item.rule}</h4>
                      </div>
                      <p className="text-xs text-slate-300 font-light pl-9 leading-relaxed">
                        <strong className="text-[#d4af6e] font-medium">Por quê: </strong>
                        {item.why}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </RevealSection>

        {/* ===================================================================
            SEÇÃO 5 (EXCLUSIVA MODO 2): O QUE JÁ FOI DITO NO SEU PROCESSO
            Timeline vertical com selo "✓ revisado por [advogado]"
           =================================================================== */}
        {isInstrucao && prepData.alegacoes && prepData.aprovadoParaCliente && (
          <RevealSection id="sec-alegacoes">
            <div className="space-y-5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[11px] font-normal px-2.5 py-0.5 rounded">
                    ✓ revisado por {prepData.alegacoes.revisado_por || lawyerName}
                  </Badge>
                  {prepData.alegacoes.data_revisao && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      em {new Date(prepData.alegacoes.data_revisao).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <h2 className="font-playfair text-2xl text-slate-100 font-normal">
                  O que já foi dito no seu processo
                </h2>
                <p className="text-xs text-slate-400 font-light">
                  Resumo aprovado pelo seu advogado para você relembrar os pontos principais:
                </p>
              </div>

              <div className="space-y-4 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-[1px] before:bg-prep-gold/30">
                {/* O que você contou */}
                <div className="relative pl-10">
                  <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-[#d4af6e] -translate-x-1/2" />
                  <Card className="bg-prep-card border border-prep-gold/30 rounded-xl">
                    <CardContent className="p-5 space-y-2">
                      <span className="text-[11px] uppercase tracking-wider text-prep-gold font-semibold block">
                        O que você contou
                      </span>
                      <p className="text-xs text-slate-200 font-light leading-relaxed">
                        {prepData.alegacoes.o_que_voce_contou ||
                          prepData.client.descricaoCaso ||
                          'Relato dos fatos conforme as informações iniciais prestadas ao escritório.'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* O que a outra parte respondeu */}
                <div className="relative pl-10">
                  <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-slate-500 -translate-x-1/2" />
                  <Card className="bg-prep-card border border-prep-gold/30 rounded-xl">
                    <CardContent className="p-5 space-y-2">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                        O que a outra parte respondeu
                      </span>
                      <p className="text-xs text-slate-200 font-light leading-relaxed">
                        {prepData.alegacoes.o_que_outra_parte_respondeu ||
                          'A outra parte apresentou contestação formal nos autos com as alegações de defesa.'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* O que ainda está em aberto */}
                <div className="relative pl-10">
                  <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-amber-400 -translate-x-1/2" />
                  <Card className="bg-prep-card border border-prep-gold/45 rounded-xl shadow-lg">
                    <CardContent className="p-5 space-y-2">
                      <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold block">
                        O que ainda está em aberto (Foco da audiência)
                      </span>
                      <p className="text-xs text-slate-200 font-light leading-relaxed">
                        {prepData.alegacoes.o_que_esta_em_aberto ||
                          'O que o juiz deseja esclarecer ouvindo os depoimentos nesta data.'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </RevealSection>
        )}

        {/* ===================================================================
            SEÇÃO 6: PERGUNTAS QUE NINGUÉM FAZ EM VOZ ALTA (ACORDEÃO COM 6 ITENS)
           =================================================================== */}
        <RevealSection id="sec-faq">
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-prep-gold">
                Dúvidas comuns
              </h3>
              <h2 className="font-playfair text-2xl text-slate-100 font-normal">
                {isConciliacao
                  ? 'As perguntas que ninguém faz em voz alta'
                  : 'O medo que ninguém fala em voz alta'}
              </h2>
            </div>

            <div className="space-y-3">
              {(isConciliacao
                ? [
                    {
                      q: 'E se eu ficar tão nervoso que esquecer o que ia dizer?',
                      a: "É mais comum do que parece. Ninguém vai te apressar — você pode fazer uma pausa, respirar, e retomar de onde parou. Não existe um 'tempo limite' pra pensar antes de responder.",
                    },
                    {
                      q: 'E se a outra parte disser algo que eu sei que não é verdade?',
                      a: 'Você não precisa discutir ali na hora. Anote mentalmente (ou peça uma pausa e anote de verdade) e conte pro seu advogado depois — ele sabe como tratar isso da forma certa.',
                    },
                    {
                      q: 'E se eu não entender uma pergunta que fizerem?',
                      a: 'Pedir pra repetir ou explicar de outro jeito é completamente normal e esperado. Ninguém vai achar estranho.',
                    },
                    {
                      q: 'Vou ter que ficar cara a cara com a outra pessoa o tempo todo?',
                      a: 'Sim, geralmente as duas partes participam da mesma sessão — mas o conciliador está ali justamente pra manter a conversa respeitosa. Se sentir desconforto sério, pode dizer isso ao conciliador.',
                    },
                    {
                      q: 'E se eu chorar ou ficar emocionado durante a fala?',
                      a: 'Não tem problema nenhum. É um momento carregado, e mostrar isso não passa impressão nenhuma ruim — é humano.',
                    },
                    {
                      q: 'Posso desistir da audiência depois de já ter começado?',
                      a: 'A qualquer momento você pode dizer que não deseja continuar negociando ali — isso não é obrigação, é uma tentativa. O processo segue seu curso normal.',
                    },
                  ]
                : [
                    {
                      q: 'E se eu ficar tão nervoso que gaguejar ou travar?',
                      a: 'É muito comum, e ninguém vai estranhar. Você pode parar, respirar, e recomeçar a resposta. Não existe punição nenhuma por estar nervoso — é um momento importante da sua vida, é esperado sentir isso.',
                    },
                    {
                      q: 'E se eu não lembrar de uma data ou detalhe exato?',
                      a: "Diga exatamente isso: 'não me lembro com exatidão, mas foi mais ou menos nessa época'. Tentar acertar um número de cabeça e errar é pior do que admitir a incerteza.",
                    },
                    {
                      q: 'E se a pergunta parecer confusa ou eu não entender o que estão perguntando?',
                      a: 'Pedir pra repetir ou explicar de outro jeito é normal e esperado — ninguém vai te julgar por isso.',
                    },
                    {
                      q: 'E se eu perceber que errei em algo que já respondi?',
                      a: "Pode dizer isso na hora: 'posso corrigir uma coisa que falei antes?' — isso é visto como honestidade, não como fraqueza.",
                    },
                    {
                      q: 'Vou ter que olhar pra outra parte durante toda a audiência?',
                      a: 'Não necessariamente — você pode se dirigir ao juiz enquanto fala, que é o mais comum.',
                    },
                    {
                      q: 'E se a pergunta do advogado da outra parte parecer uma armadilha?',
                      a: 'Seu advogado está ali pra intervir se uma pergunta for feita de forma abusiva ou fora do lugar. Você não está desprotegido.',
                    },
                  ]
              ).map((item, idx) => {
                const isOpen = openFaq === idx
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      isOpen
                        ? 'bg-prep-card-alt border-prep-gold-strong shadow-lg'
                        : 'bg-prep-card border-prep-gold/20 hover:border-prep-gold/40'
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4"
                    >
                      <span className="font-medium text-sm text-slate-100 font-inter">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-prep-gold shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs text-slate-300 font-light leading-relaxed border-t border-prep-gold/15">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </RevealSection>

        {/* ===================================================================
            SEÇÃO 7: BLOCO DE FECHAMENTO (MENSAGEM DE CONFIANÇA)
           =================================================================== */}
        <RevealSection id="sec-fechamento">
          <div className="p-6 md:p-8 rounded-xl bg-prep-card border border-prep-gold-strong text-center space-y-3 shadow-xl">
            <h3 className="font-playfair text-xl md:text-2xl italic text-prep-gold font-normal">
              {isConciliacao
                ? 'Você não vai estar sozinho nessa sala.'
                : `${lawyerName} vai estar do seu lado a audiência inteira.`}
            </h3>
            <p className="text-xs md:text-sm text-slate-300 font-light max-w-xl mx-auto leading-relaxed">
              {isConciliacao
                ? 'E não existe resposta errada em contar a verdade, com calma, do seu jeito.'
                : 'Você não precisa se lembrar de tudo perfeitamente — precisa só contar o que viveu, com verdade.'}
            </p>
          </div>
        </RevealSection>

        {/* ===================================================================
            SEÇÃO 8: CHECKLIST "ANTES DO DIA" (EXCLUSIVO MODO 1)
           =================================================================== */}
        {isConciliacao && (
          <RevealSection id="sec-checklist">
            <Card className="bg-prep-card border border-prep-gold/30 rounded-xl overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-prep-gold">
                      Preparação prática
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      {completedChecklistCount} de 4 itens concluídos
                    </span>
                  </div>
                  <h2 className="font-playfair text-2xl text-slate-100 font-normal">
                    Checklist antes do dia
                  </h2>
                </div>

                {/* Barra de progresso do checklist */}
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-prep-gold/20">
                  <div
                    className="h-full bg-[#d4af6e] transition-all duration-300 ease-out"
                    style={{ width: `${checklistPercentage}%` }}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { id: 1, text: 'Testei o link e minha conexão de internet' },
                    { id: 2, text: 'Separei um documento de identificação com foto' },
                    { id: 3, text: 'Escolhi um ambiente silencioso para a hora da audiência' },
                    {
                      id: 4,
                      text: 'Anotei as dúvidas que quero esclarecer com meu advogado antes',
                    },
                  ].map((item) => {
                    const isChecked = !!checklist[item.id]
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`p-4 rounded-lg border flex items-center space-x-3.5 cursor-pointer transition-colors duration-150 ${
                          isChecked
                            ? 'bg-prep-card-alt border-prep-gold/50 text-slate-200'
                            : 'bg-prep-card border-prep-gold/20 text-slate-400 hover:border-prep-gold/40'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[#d4af6e] border-[#d4af6e] text-[#07070a]'
                              : 'border-slate-600 bg-transparent'
                          }`}
                        >
                          {isChecked && (
                            <CheckCircle2 className="w-4 h-4 fill-current stroke-[#07070a]" />
                          )}
                        </div>
                        <span
                          className={`text-xs ${isChecked ? 'line-through text-slate-400' : 'text-slate-200'}`}
                        >
                          {item.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </RevealSection>
        )}

        {/* ===================================================================
            SEÇÃO 9: CHAT DE DÚVIDAS (COMPARTILHADO)
            Regra de Ouro: responde sobre o rito, nunca sobre o mérito
           =================================================================== */}
        <RevealSection id="sec-chat">
          <Card className="bg-prep-card border border-prep-gold/40 rounded-xl shadow-2xl overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-prep-gold" />
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-prep-gold">
                    Assistente do Rito
                  </h3>
                </div>
                <h2 className="font-playfair text-2xl text-slate-100 font-normal">
                  Ficou com alguma dúvida sobre a audiência?
                </h2>
                <p className="text-xs text-slate-400 font-light">
                  Pergunte como funciona o procedimento. (Lembre-se: dúvidas sobre valores ou o que
                  falar sobre os fatos são tratadas exclusivamente com seu advogado).
                </p>
              </div>

              {/* Chips de perguntas rápidas */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                  Sugestões rápidas:
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChat(chip)}
                      disabled={chatLoading}
                      className="text-left text-xs bg-prep-card-alt border border-prep-gold/25 hover:border-prep-gold/60 text-slate-300 hover:text-prep-gold px-3 py-2 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Histórico de Mensagens */}
              <div className="space-y-4 max-h-[380px] overflow-y-auto p-4 rounded-xl bg-prep-card-alt border border-prep-gold/20">
                {chatMessages.map((msg) => {
                  const isUser = msg.sender === 'user'
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
                          isUser
                            ? 'bg-[#d4af6e] text-[#07070a] font-medium'
                            : msg.isFronteiraMerito
                              ? 'bg-amber-950/60 border border-amber-500/60 text-amber-100 italic shadow-md'
                              : 'bg-prep-card border border-prep-gold/20 text-slate-200'
                        }`}
                      >
                        {msg.isFronteiraMerito && (
                          <div className="flex items-center gap-1.5 text-amber-300 font-semibold uppercase text-[10px] tracking-wider mb-2 not-italic">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Aviso de Mérito / Orientação do Advogado
                          </div>
                        )}
                        <p>{msg.text}</p>
                        <span
                          className={`block text-[10px] mt-1.5 font-mono ${
                            isUser ? 'text-[#07070a]/70 text-right' : 'text-slate-500 text-left'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-prep-card border border-prep-gold/20 rounded-xl p-3 text-xs text-slate-400 flex items-center space-x-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-prep-gold" />
                      <span>Consultando rito processual...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Campo de Input Livre */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendChat()
                }}
                className="flex items-center space-x-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Digite sua dúvida sobre o funcionamento da audiência..."
                  className="bg-prep-card-alt border-prep-gold/30 focus:border-prep-gold text-slate-100 placeholder:text-slate-600 h-11 text-xs rounded-lg"
                  disabled={chatLoading}
                />
                <Button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="h-11 px-5 bg-[#d4af6e] hover:bg-[#c39e5d] text-[#07070a] font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Enviar
                </Button>
              </form>
            </CardContent>
          </Card>
        </RevealSection>
      </main>

      {/* =====================================================================
          3. AVISO FIXO NO RODAPÉ (STICKY BOTTOM DISCLAIMER)
         ===================================================================== */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#07070a]/95 backdrop-blur-md border-t border-prep-gold/30 px-4 py-3 text-center shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2 text-slate-400 text-xs font-light">
          <Shield className="w-4 h-4 text-prep-gold shrink-0" />
          <p className="leading-tight">
            {isConciliacao
              ? 'Esta ferramenta ajuda você a entender o que vai acontecer — ela não decide, não avalia seu caso e não substitui a orientação do seu advogado.'
              : 'Esta ferramenta explica como funciona a audiência — ela nunca sugere o que você deve responder sobre os fatos do seu caso. Isso é conversa que você tem com seu advogado, antes do dia.'}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default PreparacaoPublicPage
