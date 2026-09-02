import React, { useState, useEffect, useMemo } from 'react'
import {
  Layers,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Filter,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
  Radio,
  BarChart3,
  Flame,
  FileCheck2,
  Lock,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Info,
  Calendar,
  AlertCircle,
  HelpCircle,
  X,
  User,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { dataStore } from '@/services/dataStore'
import {
  ProductionItem,
  ProductionStage,
  ProductionNivel,
  NoxClient,
  TriagemEvidenciasCamadas,
  StressTestValidation,
} from '@/types/nox'
import { SentinelaCommunication } from '@/types/sentinela'
import {
  DEFAULT_DOCUMENT_TEMPLATES,
  DocumentTemplateItem,
  documentTemplateService,
} from '@/services/documentTemplateService'
import { DocumentReviewEditorModal } from '@/components/DocumentReviewEditorModal'
import { TemplateManagerModal } from '@/components/TemplateManagerModal'
import { classificarNivelProducao } from '@/services/complexityService'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'

// 6 Estágios Fixos do Pipeline na ordem real do Oráculo NOX
export const PRODUCTION_STAGES: Array<{
  id: ProductionStage
  name: string
  shortName: string
  description: string
  maxDaysThreshold: number // Limite configurável de envelhecimento em dias
  badgeColor: string
}> = [
  {
    id: 'triagem_evidencias',
    name: 'Triagem de Evidências',
    shortName: 'Triagem (5 Camadas)',
    description: 'Fatos organizados em essencial, útil, neutro, perigoso e dispensável.',
    maxDaysThreshold: 3,
    badgeColor: 'border-blue-500/40 text-blue-300 bg-blue-950/40',
  },
  {
    id: 'tese_em_definicao',
    name: 'Tese em Definição',
    shortName: 'Tese em Definição',
    description:
      'Eixo narrativo (conflito central + violador + diligência + ruptura) sendo fechado.',
    maxDaysThreshold: 5, // 1 pessoa decidindo => mais de 5 dias é sinal crítico de travamento
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-950/40',
  },
  {
    id: 'em_redacao',
    name: 'Em Redação',
    shortName: 'Em Redação',
    description: 'Peça sendo escrita com rigor técnico e Nível já classificado.',
    maxDaysThreshold: 4,
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-950/40',
  },
  {
    id: 'stress_test_adversarial',
    name: 'Stress-Test Adversarial',
    shortName: 'Stress-Test (3 Camadas)',
    description: 'Checagem obrigatória: técnica jurídica, coerência narrativa e humanização.',
    maxDaysThreshold: 2,
    badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-950/40',
  },
  {
    id: 'pronto_protocolo',
    name: 'Pronto para Protocolo',
    shortName: 'Pronto p/ Protocolo',
    description: 'Aprovado em todas as camadas, aguardando ato de protocolo.',
    maxDaysThreshold: 2,
    badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40',
  },
  {
    id: 'protocolado',
    name: 'Protocolado',
    shortName: 'Protocolado',
    description: 'Concluído com sucesso — sai do radar ativo de produção.',
    maxDaysThreshold: 999,
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/40',
  },
]

export const ProducaoPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [items, setItems] = useState<ProductionItem[]>(dataStore.getProductionItems())
  const [clients, setClients] = useState<NoxClient[]>(dataStore.getClients())
  const [comms, setComms] = useState<SentinelaCommunication[]>(dataStore.getCommunications())
  const [auditLogs, setAuditLogs] = useState(dataStore.getAuditLogs())

  // View state: 'radar' | 'kanban' | 'analises'
  const [activeTab, setActiveTab] = useState<'radar' | 'kanban' | 'analises'>('radar')
  const [selectedItem, setSelectedItem] = useState<ProductionItem | null>(null)
  const [hoveredRadarItem, setHoveredRadarItem] = useState<ProductionItem | null>(null)
  const [isScanningActive, setIsScanningActive] = useState(true)

  // Filters
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [nivelFilter, setNivelFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false)
  const [targetAdvanceStage, setTargetAdvanceStage] =
    useState<ProductionStage>('triagem_evidencias')
  const [advanceJustification, setAdvanceJustification] = useState('')

  // Stress-test modal
  const [stressModalOpen, setStressModalOpen] = useState(false)
  const [stressForm, setStressForm] = useState({
    tecnicaJuridica: false,
    coerenciaNarrativa: false,
    humanizacao: false,
    observacoes: '',
    retornarParaRedacaoSeFalhar: true,
  })

  // Triagem modal
  const [triagemModalOpen, setTriagemModalOpen] = useState(false)
  const [triagemForm, setTriagemForm] = useState<TriagemEvidenciasCamadas>({
    essencial: 0,
    util: 0,
    neutro: 0,
    perigoso: 0,
    dispensavel: 0,
    completa: false,
  })

  // Gerador e Revisão de Documento Modal
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [templateManagerModalOpen, setTemplateManagerModalOpen] = useState(false)
  const [allTemplates, setAllTemplates] = useState<DocumentTemplateItem[]>(
    DEFAULT_DOCUMENT_TEMPLATES,
  )
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplateItem | null>(null)
  const [generatedHtml, setGeneratedHtml] = useState('')

  // Form de criação de novo item de produção
  const [newItemForm, setNewItemForm] = useState({
    clientId: '',
    tituloPeca: '',
    numeroProcesso: '',
    nivel: 3 as ProductionNivel,
    responsavel: 'Higor Utinoi de Oliveira',
    teseDominante: '',
    motivoTravamento: '',
  })

  // Sincronização reativa
  useEffect(() => {
    const sync = () => {
      setItems(dataStore.getProductionItems())
      setClients(dataStore.getClients())
      setComms(dataStore.getCommunications())
      setAuditLogs(dataStore.getAuditLogs())
    }
    sync()
    const unsub = dataStore.subscribe(sync)
    return unsub
  }, [])

  // Seleção via URL search param
  useEffect(() => {
    const selId = searchParams.get('selected')
    if (selId) {
      const found = items.find((i) => i.id === selId)
      if (found) setSelectedItem(found)
    }
  }, [searchParams, items])

  // Map de Prazos Fatais por Número de Processo (cruzado com Sentinela/Central de Prazos sem duplicar dado)
  const deadlinesMap = useMemo(() => {
    const map = new Map<
      string,
      { finalDate: string; legalRule: string; isUrgent: boolean; daysLeft: number }
    >()
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    for (const c of comms) {
      if (c.numeroProcesso && c.deadlineCalculated?.finalDeadlineDate) {
        const dDate = new Date(c.deadlineCalculated.finalDeadlineDate)
        dDate.setHours(0, 0, 0, 0)
        const diffDays = Math.round((dDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        map.set(c.numeroProcesso, {
          finalDate: c.deadlineCalculated.finalDeadlineDate,
          legalRule: c.deadlineCalculated.legalRuleName,
          isUrgent: diffDays <= 3,
          daysLeft: diffDays,
        })
      }
    }
    return map
  }, [comms])

  // Envelhecimento helper
  const getDaysInCurrentStage = (item: ProductionItem): number => {
    const entered = new Date(item.dataEntradaEstagioAtual)
    const now = new Date()
    return Math.max(0, Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const isItemAgingAlert = (
    item: ProductionItem,
  ): { isAging: boolean; days: number; maxAllowed: number } => {
    const cfg = PRODUCTION_STAGES.find((s) => s.id === item.estagio)
    const days = getDaysInCurrentStage(item)
    const maxAllowed = cfg?.maxDaysThreshold || 3
    const isAging = item.estagio !== 'protocolado' && days >= maxAllowed
    return { isAging, days, maxAllowed }
  }

  // Filtragem dos itens
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (stageFilter !== 'all' && item.estagio !== stageFilter) return false
      if (nivelFilter !== 'all' && item.nivel.toString() !== nivelFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = item.tituloPeca.toLowerCase().includes(q)
        const matchClient = item.clientName?.toLowerCase().includes(q) || false
        const matchProcess = item.numeroProcesso?.toLowerCase().includes(q) || false
        const matchTese = item.teseDominante?.toLowerCase().includes(q) || false
        const matchMotivo = item.motivoTravamento?.toLowerCase().includes(q) || false
        if (!matchTitle && !matchClient && !matchProcess && !matchTese && !matchMotivo) return false
      }
      return true
    })
  }, [items, stageFilter, nivelFilter, searchQuery])

  // Itens ativos (exclui protocolados para contagens de gargalo)
  const activeItems = useMemo(() => items.filter((i) => i.estagio !== 'protocolado'), [items])

  // Análises e Métricas de Produção
  const analytics = useMemo(() => {
    // 1. Volume por estágio
    const stageCounts: Record<ProductionStage, number> = {
      triagem_evidencias: 0,
      tese_em_definicao: 0,
      em_redacao: 0,
      stress_test_adversarial: 0,
      pronto_protocolo: 0,
      protocolado: 0,
    }
    for (const item of items) {
      stageCounts[item.estagio] = (stageCounts[item.estagio] || 0) + 1
    }

    // 2. Distribuição por Nível (1, 2 ou 3)
    const nivelCounts = {
      n1: items.filter((i) => i.nivel === 1).length,
      n2: items.filter((i) => i.nivel === 2).length,
      n3: items.filter((i) => i.nivel === 3).length,
    }

    // 3. Gargalo Dominante (estágio ativo com maior acúmulo e maior envelhecimento médio)
    const activeStages: ProductionStage[] = [
      'triagem_evidencias',
      'tese_em_definicao',
      'em_redacao',
      'stress_test_adversarial',
      'pronto_protocolo',
    ]

    let bottleneckStage: ProductionStage = 'tese_em_definicao'
    let maxBottleneckScore = -1

    const stageAvgDays: Record<string, { count: number; totalDays: number; avgDays: number }> = {}

    for (const stg of activeStages) {
      const inStage = items.filter((i) => i.estagio === stg)
      const count = inStage.length
      const totalDays = inStage.reduce((acc, it) => acc + getDaysInCurrentStage(it), 0)
      const avgDays = count > 0 ? totalDays / count : 0
      stageAvgDays[stg] = { count, totalDays, avgDays }

      // Score simples: volume * (dias médios + 1)
      const score = count * (avgDays + 1)
      if (score > maxBottleneckScore) {
        maxBottleneckScore = score
        bottleneckStage = stg
      }
    }

    const bottleneckConfig = PRODUCTION_STAGES.find((s) => s.id === bottleneckStage)

    // 4. Motivos de travamento mais comuns
    const motivosMap: Record<string, number> = {}
    for (const it of items) {
      if (it.motivoTravamento && it.motivoTravamento.trim()) {
        const normalized = it.motivoTravamento.trim()
        motivosMap[normalized] = (motivosMap[normalized] || 0) + 1
      }
    }
    const topMotivos = Object.entries(motivosMap)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)

    // 5. Histórico e Taxa de Aprovação no Stress-Test
    const totalWithStressDetails = items.filter((i) => i.stressTestDetalhes !== undefined).length
    const passedFirstTry = items.filter(
      (i) =>
        i.stressTestAprovado &&
        (!i.stressTestDetalhes?.reprovacoesHistorico ||
          i.stressTestDetalhes.reprovacoesHistorico.length === 0),
    ).length
    const returnedToRedaction = items.filter(
      (i) =>
        i.stressTestDetalhes?.reprovacoesHistorico &&
        i.stressTestDetalhes.reprovacoesHistorico.length > 0,
    ).length

    const stressApprovalRate =
      totalWithStressDetails > 0 ? Math.round((passedFirstTry / totalWithStressDetails) * 100) : 100

    // 6. Itens em alerta de envelhecimento
    const agingItemsCount = items.filter((i) => isItemAgingAlert(i).isAging).length

    return {
      stageCounts,
      nivelCounts,
      bottleneckStage,
      bottleneckConfig,
      stageAvgDays,
      topMotivos,
      passedFirstTry,
      returnedToRedaction,
      stressApprovalRate,
      agingItemsCount,
    }
  }, [items])

  // Coordinate mapping for SVG Radar de Produção (Reaproveitando topografia e visual do RadarPage.tsx)
  // Center: (250, 250), Radius: 210
  // Anéis representam a proximidade de conclusão do processo de produção:
  // Núcleo (r=50): Stress-Test Adversarial (Checagem crítica de risco)
  // Anel 2 (r=100): Em Redação
  // Anel 3 (r=150): Tese em Definição
  // Anel 4 (r=200): Triagem de Evidências (Início do fluxo)
  const radarPoints = useMemo(() => {
    const cx = 250
    const cy = 250

    // Itens ativos no radar
    const radarFiltered = filteredItems.filter((it) => it.estagio !== 'protocolado')

    return radarFiltered.map((item, i) => {
      let baseRadius = 200 // triagem_evidencias
      let ringLabel = 'Triagem de Evidências'
      let ringColor = '#3b82f6'

      if (item.estagio === 'stress_test_adversarial') {
        baseRadius = 50
        ringLabel = 'Stress-Test Adversarial (Núcleo)'
        ringColor = '#ef4444'
      } else if (item.estagio === 'em_redacao') {
        baseRadius = 100
        ringLabel = 'Em Redação'
        ringColor = '#f59e0b'
      } else if (item.estagio === 'tese_em_definicao') {
        baseRadius = 150
        ringLabel = 'Tese em Definição'
        ringColor = '#a855f7'
      } else if (item.estagio === 'pronto_protocolo') {
        baseRadius = 80
        ringLabel = 'Pronto para Protocolo'
        ringColor = '#06b6d4'
      }

      // Ângulo determinístico a partir do id e título
      const codeHash = item.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), i * 37)
      const angleDeg = (codeHash + i * 45) % 360
      const angleRad = (angleDeg * Math.PI) / 180

      const aging = isItemAgingAlert(item)
      const jitter = ((i * 17) % 16) - 8
      const finalRadius = Math.max(30, baseRadius + jitter)

      const x = cx + finalRadius * Math.cos(angleRad)
      const y = cy + finalRadius * Math.sin(angleRad)

      return {
        item,
        x,
        y,
        ringLabel,
        ringColor,
        isAging: aging.isAging,
        agingDays: aging.days,
        pointColor: aging.isAging
          ? '#ef4444' // Alerta vermelho de envelhecimento
          : item.nivel === 3
            ? '#ec4899' // Rosa para Nível 3 (Saturação Máxima)
            : item.nivel === 2
              ? '#06b6d4' // Ciano para Nível 2
              : '#10b981', // Verde para Nível 1
      }
    })
  }, [filteredItems])

  // Handler de Criação de Novo Item de Produção
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemForm.clientId) {
      toast.error('Selecione obrigatoriamente um cliente cadastrado.')
      return
    }
    if (!newItemForm.tituloPeca.trim()) {
      toast.error('Informe o título da peça jurídica.')
      return
    }

    const res = dataStore.addProductionItem({
      clientId: newItemForm.clientId,
      tituloPeca: newItemForm.tituloPeca,
      numeroProcesso: newItemForm.numeroProcesso || undefined,
      nivel: newItemForm.nivel,
      responsavel: newItemForm.responsavel,
      teseDominante: newItemForm.teseDominante || undefined,
      motivoTravamento: newItemForm.motivoTravamento || undefined,
    })

    if (!res.success) {
      toast.error(res.error || 'Erro ao criar item de produção.')
      return
    }

    toast.success(`Peça "${newItemForm.tituloPeca}" inserida na esteira de produção!`, {
      description: `Classificação: Nível ${res.item?.nivel}. Estágio: Triagem de Evidências.`,
    })

    setCreateModalOpen(false)
    setNewItemForm({
      clientId: '',
      tituloPeca: '',
      numeroProcesso: '',
      nivel: 3,
      responsavel: 'Higor Utinoi de Oliveira',
      teseDominante: '',
      motivoTravamento: '',
    })
  }

  // Handler de Avanço Manual de Estágio
  const handleOpenAdvanceModal = (item: ProductionItem, target: ProductionStage) => {
    setSelectedItem(item)
    setTargetAdvanceStage(target)
    setAdvanceJustification('')
    setAdvanceModalOpen(true)
  }

  const handleConfirmAdvanceStage = () => {
    if (!selectedItem) return
    const res = dataStore.advanceProductionStage(
      selectedItem.id,
      targetAdvanceStage,
      'Higor Utinoi de Oliveira',
      advanceJustification.trim() || undefined,
    )
    if (res.success) {
      const targetCfg = PRODUCTION_STAGES.find((s) => s.id === targetAdvanceStage)
      toast.success(`Peça avançada manualmente para "${targetCfg?.name}".`)
      setAdvanceModalOpen(false)
      const fresh = dataStore.getProductionItemById(selectedItem.id)
      if (fresh) setSelectedItem(fresh)
    } else {
      toast.error(res.error || 'Erro ao avançar estágio.')
    }
  }

  // Handler de Stress-Test
  const handleOpenStressModal = (item: ProductionItem) => {
    setSelectedItem(item)
    setStressForm({
      tecnicaJuridica: item.stressTestDetalhes?.tecnicaJuridica ?? false,
      coerenciaNarrativa: item.stressTestDetalhes?.coerenciaNarrativa ?? false,
      humanizacao: item.stressTestDetalhes?.humanizacao ?? false,
      observacoes: item.stressTestDetalhes?.observacoes || '',
      retornarParaRedacaoSeFalhar: true,
    })
    setStressModalOpen(true)
  }

  const handleSaveStressTest = () => {
    if (!selectedItem) return
    const result = dataStore.evaluateStressTest(
      selectedItem.id,
      stressForm,
      'Higor Utinoi de Oliveira (Revisor)',
    )

    if (result.aprovado) {
      toast.success('Stress-Test Adversarial APROVADO nas 3 camadas!', {
        description: 'Técnica jurídica, coerência narrativa e humanização validadas.',
      })
    } else {
      toast.error(`Stress-Test com ressalvas: ${result.camadasPendentes.join(', ')} pendente(s).`, {
        description: stressForm.retornarParaRedacaoSeFalhar
          ? 'Item retornado para Em Redação para correção técnica.'
          : 'Gravação mantida no estágio com anotações de pendência.',
      })
    }

    setStressModalOpen(false)
    const fresh = dataStore.getProductionItemById(selectedItem.id)
    if (fresh) setSelectedItem(fresh)
  }

  // Handler de Triagem de Evidências
  const handleOpenTriagemModal = (item: ProductionItem) => {
    setSelectedItem(item)
    setTriagemForm({
      essencial: item.triagemEvidencias.essencial,
      util: item.triagemEvidencias.util,
      neutro: item.triagemEvidencias.neutro,
      perigoso: item.triagemEvidencias.perigoso,
      dispensavel: item.triagemEvidencias.dispensavel,
      completa: item.triagemEvidencias.completa,
      itensDetalhados: item.triagemEvidencias.itensDetalhados || [],
    })
    setTriagemModalOpen(true)
  }

  const handleSaveTriagem = () => {
    if (!selectedItem) return
    dataStore.updateTriagemEvidencias(selectedItem.id, triagemForm, 'Higor Utinoi de Oliveira')
    toast.success('Triagem de Evidências atualizada com sucesso.')
    setTriagemModalOpen(false)
    const fresh = dataStore.getProductionItemById(selectedItem.id)
    if (fresh) setSelectedItem(fresh)
  }

  // Carregar todos os templates
  const refreshTemplates = React.useCallback(async () => {
    try {
      const list = await documentTemplateService.listTemplates()
      setAllTemplates(list)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    refreshTemplates()
    const unsub = documentTemplateService.subscribe(() => {
      refreshTemplates()
    })
    return unsub
  }, [refreshTemplates])

  // Handler de Geração de Documentos (Abre a Etapa de Revisão com Editor)
  const handleOpenDocGenerator = (item: ProductionItem, chosenTemplate?: DocumentTemplateItem) => {
    setSelectedItem(item)
    const cli = clients.find((c) => c.id === item.clientId)
    const tpl = chosenTemplate || allTemplates[0] || DEFAULT_DOCUMENT_TEMPLATES[0]
    setSelectedTemplate(tpl)
    if (cli) {
      const filled = documentTemplateService.fillTemplateWithClient(tpl.corpoHtml, {
        nome: cli.nome,
        cpf: cli.cpf,
        rg: cli.rg,
        telefone: cli.telefone,
        endereco: cli.endereco,
        profissao: cli.profissao,
        nacionalidade: cli.nacionalidade,
        estadoCivil: cli.estadoCivil,
        demanda: cli.demanda,
        descricaoCaso: cli.descricaoCaso,
      })
      setGeneratedHtml(filled)
    } else {
      setGeneratedHtml(tpl.corpoHtml)
    }
    setDocModalOpen(true)
  }

  // Regerar Documento no Modelo
  const handleRegenerateCurrentDoc = () => {
    if (!selectedItem || !selectedTemplate) return
    const cli = clients.find((c) => c.id === selectedItem.clientId)
    if (cli) {
      const filled = documentTemplateService.fillTemplateWithClient(selectedTemplate.corpoHtml, {
        nome: cli.nome,
        cpf: cli.cpf,
        rg: cli.rg,
        telefone: cli.telefone,
        endereco: cli.endereco,
        profissao: cli.profissao,
        nacionalidade: cli.nacionalidade,
        estadoCivil: cli.estadoCivil,
        demanda: cli.demanda,
        descricaoCaso: cli.descricaoCaso,
      })
      setGeneratedHtml(filled)
    }
  }

  // Salvar e Finalizar (grava o HTML exato editado pelo usuário)
  const handleConfirmSaveDoc = (finalEditedHtml: string) => {
    if (!selectedItem || !selectedTemplate) return
    const created = dataStore.addGeneratedDocToClient(
      selectedItem.clientId,
      {
        templateId: selectedTemplate.id,
        nomeModelo: `${selectedTemplate.nome} — ${selectedItem.tituloPeca}`,
        conteudoHtml: finalEditedHtml,
        status: 'gerado',
        autor: 'Higor Utinoi de Oliveira',
      },
      'Higor Utinoi de Oliveira',
    )
    if (created) {
      toast.success(`Documento "${created.nomeModelo}" salvo e finalizado na ficha do cliente!`)
      setDocModalOpen(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-cyan-400" />
              Controladoria de Produção Jurídica
            </h1>
            <Badge className="bg-purple-950/80 text-purple-300 border-purple-700 font-mono text-xs">
              Oráculo NOX
            </Badge>
            <Badge className="bg-slate-900 text-cyan-300 border-cyan-800/60 font-mono text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {activeItems.length} Peças Ativas
            </Badge>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Módulo de controladoria de produção — mapeia exatamente onde cada caso está travado no
            processo de virar peça protocolada e por quê. Mudanças de estágio são sempre manuais.
          </p>
        </div>

        {/* Actions & New Item */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTemplateManagerModalOpen(true)}
            className="h-8 border-cyan-800/80 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 font-semibold text-xs gap-1.5 font-mono"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            Biblioteca de Modelos (.docx)
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-8 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Peça em Produção
          </Button>
        </div>
      </div>

      {/* KPI Cards / Fast Production Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Total em Produção */}
        <div className="nox-glass-card p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
            <span>TOTAL EM PRODUÇÃO</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{activeItems.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {items.filter((i) => i.estagio === 'protocolado').length} já protocoladas no histórico
          </div>
        </div>

        {/* Gargalo Dominante */}
        <div className="nox-glass-card p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/10">
          <div className="flex items-center justify-between text-amber-300 font-mono text-[11px]">
            <span>GARGALO DOMINANTE</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-amber-200 mt-1 truncate">
            {analytics.bottleneckConfig?.name || 'Tese em Definição'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {analytics.stageCounts[analytics.bottleneckStage]} caso(s) acumulados
          </div>
        </div>

        {/* Alertas de Envelhecimento */}
        <div
          className={`nox-glass-card p-3.5 rounded-xl border ${
            analytics.agingItemsCount > 0
              ? 'border-rose-500/50 bg-rose-950/20'
              : 'border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
            <span className={analytics.agingItemsCount > 0 ? 'text-rose-400 font-bold' : ''}>
              ENVELHECIMENTO
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${analytics.agingItemsCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}
            />
          </div>
          <div
            className={`text-2xl font-black mt-1 font-mono ${
              analytics.agingItemsCount > 0 ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {analytics.agingItemsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Itens além do limite temporal configurado
          </div>
        </div>

        {/* Taxa de Aprovação Stress-Test */}
        <div className="nox-glass-card p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
            <span>STRESS-TEST 1ª ENTREGA</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 mt-1 font-mono">
            {analytics.stressApprovalRate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {analytics.passedFirstTry} aprovadas direto / {analytics.returnedToRedaction} retornadas
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Radar de Produção | Pipeline Kanban | Análises & Gargalos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <Button
            size="sm"
            variant={activeTab === 'radar' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('radar')}
            className={`h-8 px-3 text-xs font-mono font-medium ${
              activeTab === 'radar'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 mr-1.5" />
            Radar de Produção
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'kanban' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('kanban')}
            className={`h-8 px-3 text-xs font-mono font-medium ${
              activeTab === 'kanban'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Pipeline (6 Estágios)
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'analises' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('analises')}
            className={`h-8 px-3 text-xs font-mono font-medium ${
              activeTab === 'analises'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Análises &amp; Porquês
          </Button>
        </div>

        {/* Global Filter Bar */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <div className="relative min-w-[160px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar peças, teses, clientes..."
              className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Estágios</option>
            {PRODUCTION_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </select>

          <select
            value={nivelFilter}
            onChange={(e) => setNivelFilter(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Níveis</option>
            <option value="1">Nível 1 (Mero Expediente)</option>
            <option value="2">Nível 2 (Rito Padrão)</option>
            <option value="3">Nível 3 (Saturação Máxima)</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: RADAR DE PRODUÇÃO (Reaproveitando o motor visual) */}
      {/* ======================================================== */}
      {activeTab === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Radar Visual SVG */}
          <div
            className={`${
              selectedItem ? 'lg:col-span-7' : 'lg:col-span-12'
            } nox-glass-card rounded-2xl p-6 relative flex flex-col items-center justify-center min-h-[550px] transition-all`}
          >
            <div className="w-full flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-300 font-semibold uppercase tracking-wider">
                  Topografia da Esteira de Produção
                </span>
                <Badge className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border-cyan-800">
                  {filteredItems.length} peças mapeadas
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScanningActive(!isScanningActive)}
                className="h-7 text-[11px] bg-slate-900 border-slate-700 text-slate-300 font-mono"
              >
                {isScanningActive ? 'Varredura ON' : 'Varredura OFF'}
              </Button>
            </div>

            <div className="relative flex flex-col items-center">
              <svg
                width="500"
                height="500"
                viewBox="0 0 500 500"
                className="max-w-full h-auto select-none overflow-visible"
              >
                <defs>
                  <radialGradient id="prodRadarBackdrop" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#080d1a" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#030712" stopOpacity="1" />
                  </radialGradient>
                  <linearGradient id="prodSweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                    <stop offset="50%" stopColor="#818cf8" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Backdrop & Rings */}
                <circle cx="250" cy="250" r="230" fill="url(#prodRadarBackdrop)" />
                <circle cx="250" cy="250" r="230" fill="none" stroke="#1e293b" strokeWidth="2" />
                <circle
                  cx="250"
                  cy="250"
                  r="238"
                  fill="none"
                  stroke="#4f46e5"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                  strokeDasharray="4 8"
                />

                {/* Outer Ring: Triagem de Evidências (r=200) */}
                <circle
                  cx="250"
                  cy="250"
                  r="200"
                  fill="none"
                  stroke="#3b82f6"
                  strokeOpacity="0.25"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x="255"
                  y="60"
                  fill="#3b82f6"
                  opacity="0.7"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ANEL 4: TRIAGEM DE EVIDÊNCIAS
                </text>

                {/* Mid-Low: Tese em Definição (r=150) */}
                <circle
                  cx="250"
                  cy="250"
                  r="150"
                  fill="none"
                  stroke="#a855f7"
                  strokeOpacity="0.3"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x="255"
                  y="110"
                  fill="#a855f7"
                  opacity="0.7"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ANEL 3: TESE EM DEFINIÇÃO
                </text>

                {/* Mid-High: Em Redação (r=100) */}
                <circle
                  cx="250"
                  cy="250"
                  r="100"
                  fill="none"
                  stroke="#f59e0b"
                  strokeOpacity="0.4"
                  strokeWidth="1.5"
                />
                <text
                  x="255"
                  y="160"
                  fill="#f59e0b"
                  opacity="0.8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ANEL 2: EM REDAÇÃO
                </text>

                {/* Inner: Stress-Test Adversarial (r=50) */}
                <circle
                  cx="250"
                  cy="250"
                  r="50"
                  fill="none"
                  stroke="#ef4444"
                  strokeOpacity="0.6"
                  strokeWidth="2"
                />
                <text
                  x="255"
                  y="210"
                  fill="#ef4444"
                  opacity="0.9"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  NÚCLEO: STRESS-TEST (3 CAMADAS)
                </text>

                {/* Crosshairs */}
                <line x1="250" y1="20" x2="250" y2="480" stroke="#1e293b" strokeWidth="1" />
                <line x1="20" y1="250" x2="480" y2="250" stroke="#1e293b" strokeWidth="1" />
                <line
                  x1="87"
                  y1="87"
                  x2="413"
                  y2="413"
                  stroke="#1e293b"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                <line
                  x1="87"
                  y1="413"
                  x2="413"
                  y2="87"
                  stroke="#1e293b"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />

                {/* Sweeping Ray */}
                {isScanningActive && (
                  <g className="animate-radar-sweep origin-center">
                    <path
                      d="M 250 250 L 250 20 A 230 230 0 0 1 450 140 Z"
                      fill="url(#prodSweepGrad)"
                    />
                    <line
                      x1="250"
                      y1="250"
                      x2="250"
                      y2="20"
                      stroke="#818cf8"
                      strokeWidth="1.5"
                      strokeOpacity="0.8"
                    />
                  </g>
                )}

                {/* Points on Radar */}
                {radarPoints.map((pt) => {
                  const isSelected = selectedItem?.id === pt.item.id

                  return (
                    <g
                      key={pt.item.id}
                      onClick={() => setSelectedItem(pt.item)}
                      onMouseEnter={() => setHoveredRadarItem(pt.item)}
                      onMouseLeave={() => setHoveredRadarItem(null)}
                      className="cursor-pointer transition-transform group"
                      tabIndex={0}
                      role="button"
                    >
                      {/* Pulse when aging or in stress-test */}
                      {(pt.isAging || pt.item.estagio === 'stress_test_adversarial') && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="14"
                          fill={pt.pointColor}
                          opacity="0.3"
                          className="animate-ping"
                        />
                      )}

                      {/* Selected Halo */}
                      {isSelected && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="12"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="2 2"
                          className="animate-spin"
                        />
                      )}

                      {/* Point shape (Diamond for Level 3, Square for Level 2, Circle for Level 1) */}
                      {pt.item.nivel === 3 ? (
                        <polygon
                          points={`${pt.x},${pt.y - 7} ${pt.x + 7},${pt.y} ${pt.x},${pt.y + 7} ${pt.x - 7},${pt.y}`}
                          fill={pt.pointColor}
                          stroke="#030712"
                          strokeWidth="2"
                          className="group-hover:scale-150 transition-transform"
                        />
                      ) : pt.item.nivel === 2 ? (
                        <rect
                          x={pt.x - 5}
                          y={pt.y - 5}
                          width="10"
                          height="10"
                          fill={pt.pointColor}
                          stroke="#030712"
                          strokeWidth="2"
                          className="group-hover:scale-150 transition-transform"
                        />
                      ) : (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={5}
                          fill={pt.pointColor}
                          stroke="#030712"
                          strokeWidth="2"
                          className="group-hover:scale-150 transition-transform"
                        />
                      )}
                    </g>
                  )
                })}

                {/* Core center dot */}
                <circle cx="250" cy="250" r="5" fill="#818cf8" />
                <circle cx="250" cy="250" r="8" fill="none" stroke="#818cf8" strokeOpacity="0.5" />
              </svg>

              {/* Hover Tooltip */}
              {hoveredRadarItem && (
                <div className="absolute top-4 left-4 max-w-xs nox-glass p-3 rounded-lg text-xs pointer-events-none z-20 shadow-2xl border border-cyan-500/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-cyan-300">
                      Nível {hoveredRadarItem.nivel}
                    </span>
                    <Badge className="text-[9px] px-1 py-0">
                      {PRODUCTION_STAGES.find((s) => s.id === hoveredRadarItem.estagio)?.shortName}
                    </Badge>
                  </div>
                  <div className="font-medium text-slate-100 mt-1 line-clamp-1">
                    {hoveredRadarItem.tituloPeca}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    Cliente: {hoveredRadarItem.clientName}
                  </div>
                  {hoveredRadarItem.motivoTravamento && (
                    <div className="text-[10px] text-amber-300 mt-1 bg-amber-950/40 p-1 rounded border border-amber-800/40">
                      ⚠️ {hoveredRadarItem.motivoTravamento}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800 text-[10px] font-mono">
                    <span className="text-slate-400">
                      {getDaysInCurrentStage(hoveredRadarItem)} dias no estágio
                    </span>
                    <span className="text-cyan-400">Clique para inspecionar</span>
                  </div>
                </div>
              )}
            </div>

            {/* Radar Legend */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-slate-500 uppercase font-semibold">Legenda de Nível:</span>
                <div className="flex items-center gap-1.5 text-pink-400">
                  <span>◆ Nível 3 (Saturação Máxima)</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <span>■ Nível 2 (Rito Padrão)</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span>● Nível 1 (Mero Expediente)</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Ponto Vermelho: Travado / Envelhecido</span>
              </div>
            </div>
          </div>

          {/* Side Drawer: Selected Item Quick Management */}
          {selectedItem && (
            <div className="lg:col-span-5 nox-glass-card rounded-2xl p-5 space-y-4 border border-cyan-500/40 flex flex-col justify-between animate-fade-in">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs font-mono ${
                        selectedItem.nivel === 3
                          ? 'bg-pink-950 text-pink-300 border-pink-700'
                          : selectedItem.nivel === 2
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}
                    >
                      NÍVEL {selectedItem.nivel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs font-mono border-slate-700 text-slate-300"
                    >
                      {PRODUCTION_STAGES.find((s) => s.id === selectedItem.estagio)?.name}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedItem(null)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Peça Title & Client */}
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Peça Jurídica
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {selectedItem.tituloPeca}
                  </h3>
                  <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cliente: </span>
                    <strong className="text-white">{selectedItem.clientName}</strong>
                    <span className="text-slate-500 font-mono text-[10px]">
                      ({selectedItem.clientCode})
                    </span>
                  </div>
                </div>

                {/* Prazo Fatal Integrado (Cruzamento com Sentinela/Central de Prazos) */}
                {selectedItem.numeroProcesso && deadlinesMap.has(selectedItem.numeroProcesso) && (
                  <div className="bg-amber-950/30 border border-amber-800/60 p-2.5 rounded-lg text-xs">
                    <div className="flex items-center justify-between text-amber-300 font-mono text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        PRAZO FATAL NO RADAR (CPC)
                      </span>
                      <span>
                        {deadlinesMap.get(selectedItem.numeroProcesso!)?.daysLeft} dia(s)
                        restante(s)
                      </span>
                    </div>
                    <div className="text-slate-300 mt-1">
                      {deadlinesMap.get(selectedItem.numeroProcesso!)?.legalRule} — Vencimento em{' '}
                      <strong className="text-amber-200">
                        {new Date(
                          deadlinesMap.get(selectedItem.numeroProcesso!)!.finalDate,
                        ).toLocaleDateString('pt-BR')}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Envelhecimento & Motivo de Travamento */}
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Tempo no estágio atual:
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        isItemAgingAlert(selectedItem).isAging
                          ? 'text-rose-400 animate-pulse'
                          : 'text-cyan-400'
                      }`}
                    >
                      {getDaysInCurrentStage(selectedItem)} dias (Limite:{' '}
                      {isItemAgingAlert(selectedItem).maxAllowed} dias)
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">
                        Motivo de Travamento (Por que está parado?):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const suggested = `Interpretação de prazo requer revisão humana pelo LEX TEMPUS IA (amostra ambígua ou divergência de preset).`
                          setSelectedItem((prev) =>
                            prev ? { ...prev, motivoTravamento: suggested } : null,
                          )
                          dataStore.updateProductionItem(
                            selectedItem.id,
                            { motivoTravamento: suggested },
                            'LEX TEMPUS IA',
                          )
                          toast.info('Motivo de travamento preenchido a partir do LEX TEMPUS.')
                        }}
                        className="text-[10px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> Sugerir via LEX TEMPUS IA
                      </button>
                    </div>
                    <Input
                      value={selectedItem.motivoTravamento || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setSelectedItem((prev) =>
                          prev ? { ...prev, motivoTravamento: val } : null,
                        )
                      }}
                      onBlur={() => {
                        dataStore.updateProductionItem(
                          selectedItem.id,
                          { motivoTravamento: selectedItem.motivoTravamento },
                          'Higor Utinoi de Oliveira',
                        )
                        toast.success('Motivo de travamento atualizado.')
                      }}
                      placeholder="Ex: Aguardando documento complementar / Interpretação de prazo incerta pelo LEX TEMPUS..."
                      className="h-8 text-xs bg-slate-950 border-slate-700 text-slate-200"
                    />
                  </div>
                </div>

                {/* Triagem de Evidências Summary */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-300 font-bold uppercase">
                      Triagem de Evidências (5 Camadas)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenTriagemModal(selectedItem)}
                      className="h-6 text-[11px] text-cyan-400 hover:text-cyan-300 p-0"
                    >
                      Editar Fatos
                    </Button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono">
                    <div className="p-1 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300">
                      <div>Essencial</div>
                      <div className="font-bold text-xs">
                        {selectedItem.triagemEvidencias.essencial}
                      </div>
                    </div>
                    <div className="p-1 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
                      <div>Útil</div>
                      <div className="font-bold text-xs">{selectedItem.triagemEvidencias.util}</div>
                    </div>
                    <div className="p-1 rounded bg-slate-800/60 border border-slate-700 text-slate-300">
                      <div>Neutro</div>
                      <div className="font-bold text-xs">
                        {selectedItem.triagemEvidencias.neutro}
                      </div>
                    </div>
                    <div className="p-1 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300">
                      <div>Perigoso</div>
                      <div className="font-bold text-xs">
                        {selectedItem.triagemEvidencias.perigoso}
                      </div>
                    </div>
                    <div className="p-1 rounded bg-slate-900/60 border border-slate-800 text-slate-400">
                      <div>Dispens.</div>
                      <div className="font-bold text-xs">
                        {selectedItem.triagemEvidencias.dispensavel}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stress-Test Status */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-mono font-bold text-slate-300">
                      Stress-Test Adversarial (3 Camadas)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {selectedItem.stressTestAprovado ? (
                        <span className="text-emerald-400 font-bold">
                          ✓ Aprovado em todas as camadas
                        </span>
                      ) : (
                        <span className="text-amber-400">
                          Pendente ou com ressalvas bloqueantes
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenStressModal(selectedItem)}
                    className="h-7 text-xs border-slate-700 text-slate-200"
                  >
                    Avaliar
                  </Button>
                </div>
              </div>

              {/* Bottom Actions: Avanço Manual de Estágio ou Gerador de Documento */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  Avanço Manual de Estágio:
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedItem.estagio !== 'triagem_evidencias' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const idx = PRODUCTION_STAGES.findIndex(
                          (s) => s.id === selectedItem.estagio,
                        )
                        if (idx > 0)
                          handleOpenAdvanceModal(selectedItem, PRODUCTION_STAGES[idx - 1].id)
                      }}
                      className="h-7 text-xs text-slate-400"
                    >
                      ← Voltar Estágio
                    </Button>
                  )}

                  {selectedItem.estagio !== 'protocolado' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const idx = PRODUCTION_STAGES.findIndex(
                          (s) => s.id === selectedItem.estagio,
                        )
                        if (idx < PRODUCTION_STAGES.length - 1) {
                          handleOpenAdvanceModal(selectedItem, PRODUCTION_STAGES[idx + 1].id)
                        }
                      }}
                      className="h-7 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                    >
                      Avançar Estágio →
                    </Button>
                  )}

                  {selectedItem.estagio === 'pronto_protocolo' && (
                    <Button
                      size="sm"
                      onClick={() => handleOpenDocGenerator(selectedItem)}
                      className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 mr-1" />
                      Gerar Peça no Modelo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PIPELINE KANBAN (6 Estágios Fixos do Oráculo NOX) */}
      {/* ======================================================== */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
            {PRODUCTION_STAGES.map((stage) => {
              const stageItems = filteredItems.filter((it) => it.estagio === stage.id)

              return (
                <div
                  key={stage.id}
                  className="bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col min-w-[240px] max-h-[750px]"
                >
                  {/* Stage Header */}
                  <div className="p-3 border-b border-slate-800 bg-slate-950/40 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-200">
                        {stage.shortName}
                      </span>
                      <Badge className={`text-[10px] font-mono px-1.5 py-0 ${stage.badgeColor}`}>
                        {stageItems.length}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">
                      {stage.description}
                    </p>
                  </div>

                  {/* Stage Body / Cards */}
                  <div className="p-2.5 flex-1 overflow-y-auto space-y-2.5">
                    {stageItems.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-[11px] font-mono">
                        Nenhuma peça neste estágio
                      </div>
                    ) : (
                      stageItems.map((item) => {
                        const aging = isItemAgingAlert(item)
                        const hasDeadline =
                          item.numeroProcesso && deadlinesMap.has(item.numeroProcesso)
                        const deadlineInfo = item.numeroProcesso
                          ? deadlinesMap.get(item.numeroProcesso)
                          : null

                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className={`p-3 rounded-lg bg-slate-950/80 border transition-all cursor-pointer hover:border-cyan-500/50 relative group ${
                              selectedItem?.id === item.id
                                ? 'border-cyan-400 ring-1 ring-cyan-400/40'
                                : aging.isAging
                                  ? 'border-rose-500/60 bg-rose-950/10'
                                  : 'border-slate-800 hover:bg-slate-900/90'
                            }`}
                          >
                            {/* Nível Badge & Aging Indicator */}
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <Badge
                                className={`text-[9px] font-mono px-1.5 py-0 ${
                                  item.nivel === 3
                                    ? 'bg-pink-950/80 text-pink-300 border-pink-700'
                                    : item.nivel === 2
                                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                                }`}
                              >
                                NÍVEL {item.nivel}
                              </Badge>

                              {aging.isAging && (
                                <Badge className="text-[9px] font-mono bg-rose-950 text-rose-300 border-rose-800 animate-pulse px-1 py-0">
                                  {aging.days}d parados
                                </Badge>
                              )}
                            </div>

                            {/* Título da Peça */}
                            <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug">
                              {item.tituloPeca}
                            </h4>

                            {/* Cliente */}
                            <div className="text-[11px] text-slate-400 mt-1 truncate">
                              Cliente: <span className="text-slate-200">{item.clientName}</span>
                            </div>

                            {/* Tese Dominante ou Motivo de Travamento */}
                            {item.motivoTravamento ? (
                              <div className="text-[10px] text-amber-300 mt-1.5 bg-amber-950/30 p-1.5 rounded border border-amber-800/40 line-clamp-2">
                                ⚠️ {item.motivoTravamento}
                              </div>
                            ) : item.teseDominante ? (
                              <div className="text-[10px] text-slate-400 mt-1.5 italic line-clamp-1">
                                &quot;{item.teseDominante}&quot;
                              </div>
                            ) : null}

                            {/* Prazo Fatal Integrado */}
                            {hasDeadline && deadlineInfo && (
                              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-amber-300">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Prazo:
                                </span>
                                <span>{deadlineInfo.daysLeft}d restantes</span>
                              </div>
                            )}

                            {/* Manual Move Quick Actions on Hover */}
                            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 font-mono">
                                {getDaysInCurrentStage(item)}d no estágio
                              </span>
                              <div className="flex items-center gap-1">
                                {stage.id === 'pronto_protocolo' && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenDocGenerator(item)
                                    }}
                                    className="h-5 px-1.5 text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white font-mono"
                                  >
                                    Gerar Doc
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const idx = PRODUCTION_STAGES.findIndex(
                                      (s) => s.id === stage.id,
                                    )
                                    if (idx < PRODUCTION_STAGES.length - 1) {
                                      handleOpenAdvanceModal(item, PRODUCTION_STAGES[idx + 1].id)
                                    }
                                  }}
                                  className="h-5 px-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono"
                                >
                                  Mover →
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ANÁLISES & PORQUÊS (Motivos de Travamento e Gargalos) */}
      {/* ======================================================== */}
      {activeTab === 'analises' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Motivos de Travamento Mais Comuns */}
          <div className="lg:col-span-6 nox-glass-card rounded-2xl p-5 space-y-4 border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Motivos de Travamento Mais Comuns
                </h3>
              </div>
              <Badge className="text-[10px] font-mono bg-slate-800 text-slate-300">
                Padrões Operacionais
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Agregação dos motivos de travamento preenchidos para identificar problemas sistêmicos
              do escritório (ex: pendência recorrente de cliente vs. gargalo interno de tese).
            </p>

            <div className="space-y-2">
              {analytics.topMotivos.length === 0 ? (
                <div className="text-slate-500 text-xs py-6 text-center font-mono">
                  Nenhum travamento registrado no momento.
                </div>
              ) : (
                analytics.topMotivos.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                      <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                        {idx + 1}
                      </span>
                      <span className="text-slate-200 font-medium truncate">{m.motivo}</span>
                    </div>
                    <Badge className="bg-amber-950 text-amber-300 border-amber-800 font-mono text-[11px] shrink-0">
                      {m.count} caso(s)
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tempo Médio por Estágio & Stress-Test Quality */}
          <div className="lg:col-span-6 space-y-5">
            {/* Tempo Médio por Estágio */}
            <div className="nox-glass-card rounded-2xl p-5 space-y-3 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Tempo Médio de Permanência por Estágio
                  </h3>
                </div>
                <Badge className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border-cyan-800">
                  Histórico Auditado
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                {PRODUCTION_STAGES.filter((s) => s.id !== 'protocolado').map((stg) => {
                  const stat = analytics.stageAvgDays[stg.id] || { count: 0, avgDays: 0 }
                  const isOver = stat.avgDays > stg.maxDaysThreshold

                  return (
                    <div
                      key={stg.id}
                      className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{stg.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {stat.count} peça(s) no estágio | Limite de alerta: {stg.maxDaysThreshold}
                          d
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className={`font-bold ${isOver ? 'text-rose-400' : 'text-cyan-400'}`}>
                          {stat.avgDays.toFixed(1)} dias em média
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Taxa de Aprovação no Stress-Test */}
            <div className="nox-glass-card rounded-2xl p-5 space-y-3 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Qualidade na 1ª Entrega (Stress-Test)
                  </h3>
                </div>
                <Badge className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border-emerald-800">
                  {analytics.stressApprovalRate}% Aprovadas
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Mede quantas peças passam de primeira na checagem obrigatória das 3 camadas (técnica
                jurídica, coerência narrativa, humanização) vs. quantas retornam para ajuste na
                redação.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-xl text-center">
                  <div className="text-emerald-300 font-mono text-[11px] font-semibold">
                    PASSOU DE PRIMEIRA
                  </div>
                  <div className="text-xl font-bold text-emerald-200 mt-1 font-mono">
                    {analytics.passedFirstTry}
                  </div>
                </div>
                <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl text-center">
                  <div className="text-amber-300 font-mono text-[11px] font-semibold">
                    VOLTOU P/ REDAÇÃO
                  </div>
                  <div className="text-xl font-bold text-amber-200 mt-1 font-mono">
                    {analytics.returnedToRedaction}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CRIAR NOVA PEÇA EM PRODUÇÃO (Vínculo obrigatório) */}
      {/* ======================================================== */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-xl bg-slate-950 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-white">
              <Layers className="w-5 h-5 text-cyan-400" />
              Inserir Peça na Controladoria de Produção
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Todo item de produção nasce vinculado a um cliente cadastrado (Fluxo: Intake → Cliente
              → Produção → Documentos).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateItem} className="space-y-3.5 text-xs">
            {/* Cliente (Obrigatório) */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                Cliente Cadastrado * (Vínculo Obrigatório)
              </label>
              <select
                required
                value={newItemForm.clientId}
                onChange={(e) => {
                  const selId = e.target.value
                  const cli = clients.find((c) => c.id === selId)
                  setNewItemForm((prev) => ({
                    ...prev,
                    clientId: selId,
                    numeroProcesso: cli?.processosVinculados[0] || prev.numeroProcesso,
                    tituloPeca: prev.tituloPeca || (cli ? `Contestação — ${cli.nome}` : ''),
                  }))
                }}
                className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="">Selecione um cliente cadastrado...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.clientCode}) — {c.demanda}
                  </option>
                ))}
              </select>
            </div>

            {/* Título da Peça */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                Título da Peça Jurídica *
              </label>
              <Input
                required
                value={newItemForm.tituloPeca}
                onChange={(e) => setNewItemForm({ ...newItemForm, tituloPeca: e.target.value })}
                placeholder="Ex: Contestação — Rogelio Felix da Silva"
                className="bg-slate-900 border-slate-700 text-xs text-slate-100"
              />
            </div>

            {/* Processo CNJ e Nível */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                  Número do Processo (Opcional)
                </label>
                <Input
                  value={newItemForm.numeroProcesso}
                  onChange={(e) =>
                    setNewItemForm({ ...newItemForm, numeroProcesso: e.target.value })
                  }
                  placeholder="Ex: 1045230-89.2026.8.26.0100"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                  Classificação de Nível (Oráculo NOX)
                </label>
                <select
                  value={newItemForm.nivel}
                  onChange={(e) =>
                    setNewItemForm({
                      ...newItemForm,
                      nivel: Number(e.target.value) as ProductionNivel,
                    })
                  }
                  className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value={3}>Nível 3 (Padrão Absoluto / Grande Litigante)</option>
                  <option value={2}>Nível 2 (Rito Comum Padrão)</option>
                  <option value={1}>Nível 1 (Mero Expediente)</option>
                </select>
              </div>
            </div>

            {/* Tese Dominante Inicial */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                Tese Dominante (Texto Curto, se já definida)
              </label>
              <Input
                value={newItemForm.teseDominante}
                onChange={(e) => setNewItemForm({ ...newItemForm, teseDominante: e.target.value })}
                placeholder="Ex: Abusividade dos juros remuneratórios e repetição do indébito..."
                className="bg-slate-900 border-slate-700 text-xs text-slate-100"
              />
            </div>

            {/* Motivo de Travamento Inicial (se aplicável) */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                Motivo de Travamento Inicial (se já estiver parada)
              </label>
              <Input
                value={newItemForm.motivoTravamento}
                onChange={(e) =>
                  setNewItemForm({ ...newItemForm, motivoTravamento: e.target.value })
                }
                placeholder="Ex: Aguardando extratos bancários de 2025..."
                className="bg-slate-900 border-slate-700 text-xs text-slate-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="h-8 text-xs text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="h-8 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                Inserir na Produção
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: AVANÇO MANUAL DE ESTÁGIO NO PIPELINE             */}
      {/* ======================================================== */}
      <Dialog open={advanceModalOpen} onOpenChange={setAdvanceModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-white">
              <ArrowRight className="w-5 h-5 text-cyan-400" />
              Avanço Manual de Estágio
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              O sistema nunca avança itens sozinho. Confirme o avanço da peça no processo de
              produção.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                Peça Selecionada:
              </div>
              <div className="font-bold text-white mt-0.5">{selectedItem?.tituloPeca}</div>
              <div className="text-slate-400 text-[11px]">Cliente: {selectedItem?.clientName}</div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                Destino do Estágio:
              </label>
              <select
                value={targetAdvanceStage}
                onChange={(e) => setTargetAdvanceStage(e.target.value as ProductionStage)}
                className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              >
                {PRODUCTION_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                Justificativa / Nota de Auditoria (Opcional):
              </label>
              <Input
                value={advanceJustification}
                onChange={(e) => setAdvanceJustification(e.target.value)}
                placeholder="Ex: Triagem concluída e tese aprovada pelo titular..."
                className="bg-slate-900 border-slate-700 text-xs text-slate-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAdvanceModalOpen(false)}
                className="h-8 text-xs text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAdvanceStage}
                className="h-8 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                Confirmar Mudança de Estágio
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 3: STRESS-TEST ADVERSARIAL (3 Camadas Obrigatórias) */}
      {/* ======================================================== */}
      <Dialog open={stressModalOpen} onOpenChange={setStressModalOpen}>
        <DialogContent className="max-w-lg bg-slate-950 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-white">
              <ShieldCheck className="w-5 h-5 text-rose-400" />
              Stress-Test Adversarial — 3 Camadas Bloqueantes
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Checagem obrigatória antes de qualquer protocolo. Nenhuma peça pode ser protocolada
              sem aprovação integral nas 3 camadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Camada 1: Técnica Jurídica */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="st-tec"
                checked={stressForm.tecnicaJuridica}
                onChange={(e) =>
                  setStressForm({ ...stressForm, tecnicaJuridica: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <div>
                <label htmlFor="st-tec" className="font-bold text-white cursor-pointer">
                  1. Técnica Jurídica (Adequação, Prazos e Rito Processual)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Verificação de legitimidade ativa/passiva, competência do juízo, pedidos certos e
                  determinados, e fundamentação legal estrita (CPC/CLT/CDC).
                </p>
              </div>
            </div>

            {/* Camada 2: Coerência Narrativa */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="st-coe"
                checked={stressForm.coerenciaNarrativa}
                onChange={(e) =>
                  setStressForm({ ...stressForm, coerenciaNarrativa: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <div>
                <label htmlFor="st-coe" className="font-bold text-white cursor-pointer">
                  2. Coerência Narrativa (Eixo Fático sem Contradição)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Encaixe perfeito entre fatos, provas documentais e pedidos. Ausência de lacunas
                  exploráveis pela parte adversária.
                </p>
              </div>
            </div>

            {/* Camada 3: Humanização */}
            <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="st-hum"
                checked={stressForm.humanizacao}
                onChange={(e) => setStressForm({ ...stressForm, humanizacao: e.target.checked })}
                className="mt-1 h-4 w-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <div>
                <label htmlFor="st-hum" className="font-bold text-white cursor-pointer">
                  3. Humanização (Voz do Cliente e Linguagem Clara)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  A peça reflete a realidade humana do cliente sem juridiquês estéril, tornando o
                  dano compreensível e palpável ao magistrado.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-300 font-semibold uppercase block mb-1">
                Anotações do Revisor Adversarial:
              </label>
              <Textarea
                value={stressForm.observacoes}
                onChange={(e) => setStressForm({ ...stressForm, observacoes: e.target.value })}
                placeholder="Descreva pontos fracos encontrados, contra-argumentos previstos da parte contrária ou correções necessárias..."
                className="bg-slate-900 border-slate-700 text-xs text-slate-100 min-h-[70px]"
              />
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                id="st-ret"
                checked={stressForm.retornarParaRedacaoSeFalhar}
                onChange={(e) =>
                  setStressForm({ ...stressForm, retornarParaRedacaoSeFalhar: e.target.checked })
                }
                className="h-3.5 w-3.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <label htmlFor="st-ret" className="text-[11px] cursor-pointer">
                Se houver reprovação, retornar automaticamente para o estágio &quot;Em Redação&quot;
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStressModalOpen(false)}
                className="h-8 text-xs text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveStressTest}
                className="h-8 text-xs bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold"
              >
                Salvar Validação
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 4: TRIAGEM DE EVIDÊNCIAS (5 Camadas)                */}
      {/* ======================================================== */}
      <Dialog open={triagemModalOpen} onOpenChange={setTriagemModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-white">
              <Layers className="w-5 h-5 text-blue-400" />
              Triagem de Evidências — 5 Camadas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Contagem de evidências organizadas nas 5 camadas antes de qualquer redação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-blue-400 font-semibold block mb-1">
                  1. Essencial (Provas chave)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={triagemForm.essencial}
                  onChange={(e) =>
                    setTriagemForm({ ...triagemForm, essencial: parseInt(e.target.value) || 0 })
                  }
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-cyan-400 font-semibold block mb-1">
                  2. Útil (Fortalece a tese)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={triagemForm.util}
                  onChange={(e) =>
                    setTriagemForm({ ...triagemForm, util: parseInt(e.target.value) || 0 })
                  }
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 font-semibold block mb-1">
                  3. Neutro (Sem impacto)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={triagemForm.neutro}
                  onChange={(e) =>
                    setTriagemForm({ ...triagemForm, neutro: parseInt(e.target.value) || 0 })
                  }
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-rose-400 font-semibold block mb-1">
                  4. Perigoso (Exige blindagem)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={triagemForm.perigoso}
                  onChange={(e) =>
                    setTriagemForm({ ...triagemForm, perigoso: parseInt(e.target.value) || 0 })
                  }
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 font-semibold block mb-1">
                5. Dispensável (Ruído documental descartado)
              </label>
              <Input
                type="number"
                min={0}
                value={triagemForm.dispensavel}
                onChange={(e) =>
                  setTriagemForm({ ...triagemForm, dispensavel: parseInt(e.target.value) || 0 })
                }
                className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded bg-slate-900 border border-slate-800">
              <input
                type="checkbox"
                id="tri-comp"
                checked={triagemForm.completa}
                onChange={(e) => setTriagemForm({ ...triagemForm, completa: e.target.checked })}
                className="h-4 w-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <label
                htmlFor="tri-comp"
                className="text-xs text-slate-200 font-medium cursor-pointer"
              >
                Triagem de Evidências marcada como COMPLETA
              </label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTriagemModalOpen(false)}
                className="h-8 text-xs text-slate-400"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveTriagem}
                className="h-8 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                Salvar Triagem
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 5: ETAPA DE REVISÃO E EDITOR (Ao gerar peça no modelo) */}
      {/* ======================================================== */}
      <DocumentReviewEditorModal
        open={docModalOpen}
        onOpenChange={setDocModalOpen}
        initialHtml={generatedHtml}
        documentTitle={selectedItem?.tituloPeca || selectedTemplate?.nome || 'Minuta Jurídica'}
        clientName={selectedItem?.clientName}
        templateName={selectedTemplate?.nome}
        onSaveAndFinalize={handleConfirmSaveDoc}
        onRegenerate={handleRegenerateCurrentDoc}
        onDiscard={() => setDocModalOpen(false)}
      />

      {/* MODAL: BIBLIOTECA DE MODELOS (.DOCX / TEXTO) */}
      <TemplateManagerModal
        open={templateManagerModalOpen}
        onOpenChange={setTemplateManagerModalOpen}
        onSelectTemplateToUse={(template) => {
          if (selectedItem) {
            handleOpenDocGenerator(selectedItem, template)
          } else {
            toast.info(
              `Modelo "${template.nome}" selecionado. Escolha uma peça em produção para gerar.`,
            )
          }
        }}
      />
    </div>
  )
}

export default ProducaoPage
