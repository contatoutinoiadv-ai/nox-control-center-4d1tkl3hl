import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  Clock,
  CalendarCheck,
  FileText,
  History,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Plus,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Layers,
  ArrowUpRight,
  Printer,
  FileDown,
  Trash2,
  Edit3,
  X,
  Link as LinkIcon,
  Unlink,
  Check,
  Globe,
  MessageSquare,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { dataStore } from '@/services/dataStore'
import {
  NoxClient,
  ClientStage,
  ClientOrigin,
  ClientDemandArea,
  NoxRecord,
  AuditLogEntry,
  ClientGeneratedDoc,
} from '@/types/nox'
import { SentinelaCommunication, AgendaEvent, SentinelaTask } from '@/types/sentinela'
import { toast } from 'sonner'

// Modelos padrão pré-carregados para o gerador de documentos
export const DEFAULT_DOCUMENT_TEMPLATES = [
  {
    id: 'tpl-proc-01',
    nome: 'Procuração Ad Judicia et Extra',
    icone: '⚖️',
    area: 'todos, civel, trabalhista, consumidor, bancario',
    descricao: 'Poderes gerais para o foro e cláusula específica de representação',
    corpoHtml: `
      <h1 style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:20px;text-transform:uppercase;">PROCURAÇÃO AD JUDICIA ET EXTRA</h1>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>OUTORGANTE:</strong> [NOME_UPPER], [NACIONALIDADE], [ESTADO_CIVIL], [PROFISSAO], portador(a) da cédula de identidade RG nº [RG] e inscrito(a) no CPF/MF sob o nº [CPF], residente e domiciliado(a) na [ENDERECO], telefone de contato [TELEFONE].
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>OUTORGADO:</strong> <strong>HIGOR UTINOI DE OLIVEIRA</strong>, brasileiro, advogado regularmente inscrito nos quadros da Ordem dos Advogados do Brasil, Seccional de Mato Grosso do Sul sob o nº <strong>OAB/MS 15.400</strong>, com escritório profissional sediado em Campo Grande/MS.
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>PODERES:</strong> Por este instrumento particular de procuração, o(a) OUTORGANTE confere ao OUTORGADO amplos, gerais e ilimitados poderes para o foro em geral, conferidos pela cláusula <em>"ad judicia et extra"</em>, em qualquer Juízo, Instância ou Tribunal, bem como perante órgãos públicos e entidades privadas, especialmente para ajuizar ações e prestar assessoria jurídica referente à demanda de [DEMANDA].
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>PODERES ESPECÍFICOS:</strong> Conferem-se ainda poderes especiais para confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber, dar quitação, firmar compromissos e substabelecer esta a outrem, com ou sem reserva de poderes.
      </p>
      <div style="margin-top:40px;text-align:right;">
        <p>Campo Grande/MS, [DATA].</p>
      </div>
      <div style="margin-top:60px;text-align:center;">
        <div style="border-top:1px solid #000;display:inline-block;width:320px;padding-top:6px;font-weight:bold;">
          [NOME_UPPER]<br/>
          <span style="font-weight:normal;font-size:11px;">CPF: [CPF]</span>
        </div>
      </div>
    `,
  },
  {
    id: 'tpl-contrato-02',
    nome: 'Contrato de Honorários e Prestação de Serviços',
    icone: '📝',
    area: 'todos, civel, trabalhista, consumidor, bancario',
    descricao: 'Contrato de prestação de serviços advocatícios com cláusula quota litis',
    corpoHtml: `
      <h1 style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:20px;text-transform:uppercase;">CONTRATO DE HONORÁRIOS ADVOCATÍCIOS</h1>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        Pelo presente instrumento particular, de um lado <strong>[NOME_UPPER]</strong>, inscrito(a) no CPF nº [CPF], residente na [ENDERECO], doravante denominado(a) <strong>CONTRATANTE</strong>; e de outro lado <strong>HIGOR UTINOI DE OLIVEIRA</strong>, Advogado OAB/MS 15.400, doravante denominado <strong>CONTRATADO</strong>, celebram o presente contrato com as cláusulas a seguir:
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>CLÁUSULA 1ª — DO OBJETO:</strong> O presente contrato tem por objeto a prestação de serviços profissionais advocatícios em prol do CONTRATANTE, consistente na assessoria, ajuizamento e acompanhamento judicial integral de demanda na área de [DEMANDA].
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>CLÁUSULA 2ª — DAS OBRIGAÇÕES:</strong> O CONTRATADO se compromete a zelar pelos interesses do CONTRATANTE com dedicação, presteza e o rigor ético aplicável à advocacia, mantendo-o informado sobre os andamentos relevantes.
      </p>
      <p style="margin-bottom:12px;line-height:1.8;text-align:justify;">
        <strong>CLÁUSULA 3ª — DOS HONORÁRIOS:</strong> Em remuneração pelos serviços contratados, o CONTRATANTE pagará os honorários estipulados conforme êxito e tabela da OAB.
      </p>
      <div style="margin-top:40px;text-align:right;">
        <p>Campo Grande/MS, [DATA].</p>
      </div>
      <div style="margin-top:50px;display:flex;justify-content:space-between;padding:0 30px;">
        <div style="border-top:1px solid #000;width:240px;text-align:center;padding-top:6px;font-size:11px;">
          <strong>[NOME_UPPER]</strong><br/>CONTRATANTE
        </div>
        <div style="border-top:1px solid #000;width:240px;text-align:center;padding-top:6px;font-size:11px;">
          <strong>HIGOR UTINOI DE OLIVEIRA</strong><br/>OAB/MS 15.400 - CONTRATADO
        </div>
      </div>
    `,
  },
  {
    id: 'tpl-hipo-03',
    nome: 'Declaração de Hipossuficiência (Justiça Gratuita)',
    icone: '📑',
    area: 'todos, civel, consumidor, trabalhista',
    descricao: 'Declaração de impossibilidade de arcar com custas sem prejuízo do sustento',
    corpoHtml: `
      <h1 style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:20px;text-transform:uppercase;">DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA</h1>
      <p style="margin-bottom:14px;line-height:1.9;text-align:justify;">
        Eu, <strong>[NOME_UPPER]</strong>, [NACIONALIDADE], [ESTADO_CIVIL], [PROFISSAO], portador(a) do RG [RG] e inscrito(a) no CPF [CPF], residente e domiciliado(a) na [ENDERECO], DECLARO, para todos os fins de direito e sob as penas da lei, em especial nos termos do artigo 98 e seguintes do Código de Processo Civil e artigo 5º, inciso LXXIV da Constituição Federal, que:
      </p>
      <p style="margin-bottom:14px;line-height:1.9;text-align:justify;">
        Não possuo condições financeiras de arcar com as custas processuais, taxas judiciárias, despesas com perícias e honorários advocatícios sucumbenciais sem prejuízo do meu próprio sustento e de minha família, fazendo jus aos benefícios da <strong>JUSTIÇA GRATUITA</strong>.
      </p>
      <p style="margin-bottom:14px;line-height:1.9;text-align:justify;">
        Por ser a mais límpida expressão da verdade, firmo a presente declaração.
      </p>
      <div style="margin-top:40px;text-align:right;">
        <p>Campo Grande/MS, [DATA].</p>
      </div>
      <div style="margin-top:60px;text-align:center;">
        <div style="border-top:1px solid #000;display:inline-block;width:320px;padding-top:6px;font-weight:bold;">
          [NOME_UPPER]<br/>
          <span style="font-weight:normal;font-size:11px;">CPF: [CPF]</span>
        </div>
      </div>
    `,
  },
]

const STAGE_CONFIG: Record<
  ClientStage,
  { label: string; bg: string; text: string; border: string }
> = {
  novo: {
    label: 'Novo',
    bg: 'bg-amber-950/40',
    text: 'text-amber-300',
    border: 'border-amber-800/60',
  },
  em_atendimento: {
    label: 'Em Atendimento',
    bg: 'bg-blue-950/40',
    text: 'text-blue-300',
    border: 'border-blue-800/60',
  },
  aguardando_documentos: {
    label: 'Aguardando Documentos',
    bg: 'bg-purple-950/40',
    text: 'text-purple-300',
    border: 'border-purple-800/60',
  },
  ativo: {
    label: 'Ativo (Processo em Curso)',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-300',
    border: 'border-emerald-800/60',
  },
  concluido: {
    label: 'Concluído',
    bg: 'bg-slate-800/40',
    text: 'text-slate-300',
    border: 'border-slate-700',
  },
  inativo: {
    label: 'Inativo',
    bg: 'bg-rose-950/30',
    text: 'text-rose-400',
    border: 'border-rose-900/50',
  },
}

const ORIGIN_CONFIG: Record<
  ClientOrigin,
  { label: string; icon: typeof Globe; badgeClass: string }
> = {
  intake_site: {
    label: 'via Intake',
    icon: Globe,
    badgeClass: 'bg-cyan-950/70 text-cyan-300 border-cyan-800',
  },
  manual: {
    label: 'Cadastro Manual',
    icon: UserCheck,
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    badgeClass: 'bg-emerald-950/70 text-emerald-300 border-emerald-800',
  },
  indicacao: {
    label: 'Indicação',
    icon: Users,
    badgeClass: 'bg-purple-950/70 text-purple-300 border-purple-800',
  },
  presencial: {
    label: 'Presencial',
    icon: MapPin,
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800',
  },
}

export const ClientesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedParam = searchParams.get('selected')

  // Estado sincronizado com o dataStore
  const [clients, setClients] = useState<NoxClient[]>(dataStore.getClients())
  const [records, setRecords] = useState<NoxRecord[]>(dataStore.getRecords())
  const [comms, setComms] = useState<SentinelaCommunication[]>(dataStore.getCommunications())
  const [agenda, setAgenda] = useState<AgendaEvent[]>(dataStore.getAgendaEvents())
  const [tasks, setTasks] = useState<SentinelaTask[]>(dataStore.getTasks())
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(dataStore.getAuditLogs())

  // Filtros da lista
  const [searchTerm, setSearchTerm] = useState('')
  const [originFilter, setOriginFilter] = useState<'ALL' | ClientOrigin>('ALL')
  const [stageFilter, setStageFilter] = useState<'ALL' | ClientStage>('ALL')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  // Cliente Selecionado para Ficha 360º
  const [selectedClient, setSelectedClient] = useState<NoxClient | null>(null)

  // Modais de Ação
  const [newClientModalOpen, setNewClientModalOpen] = useState(false)
  const [docGeneratorModalOpen, setDocGeneratorModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<
    (typeof DEFAULT_DOCUMENT_TEMPLATES)[0] | null
  >(null)
  const [docEditorHtml, setDocEditorHtml] = useState('')
  const [linkProcessModalOpen, setLinkProcessModalOpen] = useState(false)
  const [selectedProcessToLink, setSelectedProcessToLink] = useState('')

  // Formulário de Novo Cadastro Manual
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    rg: '',
    telefone: '',
    email: '',
    endereco: '',
    profissao: '',
    nacionalidade: 'brasileiro(a)',
    estadoCivil: 'solteiro(a)',
    demanda: 'consumidor' as ClientDemandArea,
    descricaoCaso: '',
    origem: 'manual' as ClientOrigin,
    estagio: 'novo' as ClientStage,
    obs: '',
  })

  // Sincronização reativa com dataStore
  useEffect(() => {
    const syncAll = () => {
      const currentClients = dataStore.getClients()
      setClients(currentClients)
      setRecords(dataStore.getRecords())
      setComms(dataStore.getCommunications())
      setAgenda(dataStore.getAgendaEvents())
      setTasks(dataStore.getTasks())
      setAuditLogs(dataStore.getAuditLogs())

      if (selectedClient) {
        const fresh = currentClients.find((c) => c.id === selectedClient.id)
        if (fresh) setSelectedClient(fresh)
      }
    }

    syncAll()
    const unsub = dataStore.subscribe(syncAll)
    return unsub
  }, [selectedClient])

  // Tratar seleção inicial por URL param (?selected=ID)
  useEffect(() => {
    if (selectedParam) {
      const target = clients.find((c) => c.id === selectedParam || c.clientCode === selectedParam)
      if (target) {
        setSelectedClient(target)
      }
    }
  }, [selectedParam, clients])

  // Indicadores de Atenção Rápida por Cliente (sem estado próprio, calculados das fontes reais)
  const attentionMap = useMemo(() => {
    const map = new Map<
      string,
      { fatalDeadlines: number; pendingAudiences: number; pendingDocs: boolean }
    >()
    const now = new Date()
    const in3Days = new Date(now.getTime() + 3 * 86400000)

    for (const cli of clients) {
      let fatalCount = 0
      let pendingAudCount = 0

      // 1. Processos vinculados ao cliente
      const clientProcesses = new Set(cli.processosVinculados)

      // 2. Checar prazos fatais nos próximos 3 dias em Sentinela/Central de Prazos
      for (const comm of comms) {
        const matchesClient =
          (comm.clientId && comm.clientId === cli.id) ||
          clientProcesses.has(comm.numeroProcesso) ||
          (comm.destinatario &&
            cli.nome &&
            comm.destinatario.toLowerCase().includes(cli.nome.toLowerCase()))

        if (matchesClient && comm.deadlineCalculated) {
          const finalDate = new Date(comm.deadlineCalculated.finalDeadlineDate)
          if (finalDate >= now && finalDate <= in3Days) {
            fatalCount++
          }
        }
      }

      // 3. Checar audiências em Compromissos/Agenda
      for (const ev of agenda) {
        const matchesClient =
          (ev.clientName &&
            cli.nome &&
            ev.clientName.toLowerCase().includes(cli.nome.toLowerCase())) ||
          (ev.processNumber && clientProcesses.has(ev.processNumber))

        if (
          matchesClient &&
          (ev.eventType === 'AUDIENCIA' || ev.title.toLowerCase().includes('audiência'))
        ) {
          if (ev.status !== 'CONFIRMADO' && ev.status !== 'CONCLUIDO') {
            pendingAudCount++
          }
        }
      }

      // 4. Checar se documentos estão pendentes de geração
      const pendingDocs =
        cli.docsGerados.length === 0 && cli.estagio !== 'concluido' && cli.estagio !== 'inativo'

      if (fatalCount > 0 || pendingAudCount > 0 || pendingDocs) {
        map.set(cli.id, {
          fatalDeadlines: fatalCount,
          pendingAudiences: pendingAudCount,
          pendingDocs,
        })
      }
    }

    return map
  }, [clients, comms, agenda])

  // Filtragem
  const filteredClients = useMemo(() => {
    return clients.filter((cli) => {
      if (originFilter !== 'ALL' && cli.origem !== originFilter) return false
      if (stageFilter !== 'ALL' && cli.estagio !== stageFilter) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = cli.nome.toLowerCase().includes(q)
        const matchCode = cli.clientCode.toLowerCase().includes(q)
        const matchCpf = cli.cpf ? cli.cpf.includes(q) : false
        const matchPhone = cli.telefone ? cli.telefone.includes(q) : false
        const matchDemanda = cli.demanda.toLowerCase().includes(q)
        const matchDesc = cli.descricaoCaso ? cli.descricaoCaso.toLowerCase().includes(q) : false

        return matchName || matchCode || matchCpf || matchPhone || matchDemanda || matchDesc
      }

      return true
    })
  }, [clients, originFilter, stageFilter, searchTerm])

  // Contadores por Origem
  const originCounts = useMemo(() => {
    return {
      all: clients.length,
      intake_site: clients.filter((c) => c.origem === 'intake_site').length,
      manual: clients.filter((c) => c.origem === 'manual').length,
      whatsapp: clients.filter((c) => c.origem === 'whatsapp').length,
      indicacao: clients.filter((c) => c.origem === 'indicacao').length,
      presencial: clients.filter((c) => c.origem === 'presencial').length,
    }
  }, [clients])

  // Criar Cliente Manualmente
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      toast.error('Informe o nome do cliente.')
      return
    }

    const created = dataStore.addClient({
      nome: formData.nome.trim(),
      cpf: formData.cpf.trim() || undefined,
      rg: formData.rg.trim() || undefined,
      telefone: formData.telefone.trim() || undefined,
      email: formData.email.trim() || undefined,
      endereco: formData.endereco.trim() || undefined,
      profissao: formData.profissao.trim() || undefined,
      nacionalidade: formData.nacionalidade.trim() || 'brasileiro(a)',
      estadoCivil: formData.estadoCivil.trim() || 'solteiro(a)',
      demanda: formData.demanda,
      descricaoCaso: formData.descricaoCaso.trim() || undefined,
      origem: formData.origem,
      estagio: formData.estagio,
      obs: formData.obs.trim() || undefined,
    })

    toast.success(`Cliente ${created.nome} cadastrado com sucesso!`, {
      description: `Código atribuído: ${created.clientCode}`,
    })

    setNewClientModalOpen(false)
    setFormData({
      nome: '',
      cpf: '',
      rg: '',
      telefone: '',
      email: '',
      endereco: '',
      profissao: '',
      nacionalidade: 'brasileiro(a)',
      estadoCivil: 'solteiro(a)',
      demanda: 'consumidor',
      descricaoCaso: '',
      origem: 'manual',
      estagio: 'novo',
      obs: '',
    })

    setSelectedClient(created)
  }

  // Alterar Estágio Manualmente
  const handleStageChange = (clientId: string, newStage: ClientStage) => {
    dataStore.updateClientStage(clientId, newStage, 'Operador NOX')
    toast.success(`Estágio alterado para "${STAGE_CONFIG[newStage].label}".`)
  }

  // Abrir Gerador de Documento
  const handleOpenDocGenerator = (template: (typeof DEFAULT_DOCUMENT_TEMPLATES)[0]) => {
    if (!selectedClient) return
    setSelectedTemplate(template)

    // Preencher variáveis
    const hoje = new Date().toLocaleDateString('pt-BR')
    const nm = (selectedClient.nome || '').toUpperCase()
    const rgStr = selectedClient.rg ? `RG nº ${selectedClient.rg}, ` : ''
    const map: Record<string, string> = {
      '[NOME]': selectedClient.nome || '',
      '[NOME_UPPER]': nm,
      '[CPF]': selectedClient.cpf || '—',
      '[RG]': rgStr,
      '[TELEFONE]': selectedClient.telefone || '—',
      '[ENDERECO]': selectedClient.endereco || '—',
      '[PROFISSAO]': selectedClient.profissao || 'autônomo(a)',
      '[NACIONALIDADE]': selectedClient.nacionalidade || 'brasileiro(a)',
      '[ESTADO_CIVIL]': selectedClient.estadoCivil || 'solteiro(a)',
      '[DEMANDA]': (selectedClient.demanda || 'Direito').toUpperCase(),
      '[DATA]': hoje,
    }

    let html = template.corpoHtml
    Object.entries(map).forEach(([k, v]) => {
      html = html.split(k).join(v)
    })

    setDocEditorHtml(html)
    setDocGeneratorModalOpen(true)
  }

  // Salvar Documento Gerado na Ficha
  const handleSaveGeneratedDoc = () => {
    if (!selectedClient || !selectedTemplate) return

    dataStore.addGeneratedDocToClient(
      selectedClient.id,
      {
        templateId: selectedTemplate.id,
        nomeModelo: selectedTemplate.nome,
        autor: 'Higor Utinoi de Oliveira',
        conteudoHtml: docEditorHtml,
        status: 'gerado',
      },
      'Operador NOX',
    )

    toast.success(`Documento "${selectedTemplate.nome}" registrado na ficha do cliente!`)
    setDocGeneratorModalOpen(false)
  }

  // Imprimir / Baixar PDF do Documento
  const handlePrintDocument = () => {
    if (!selectedClient || !selectedTemplate) return
    const win = window.open('', '_blank', 'width=850,height=750')
    if (!win) {
      toast.error('Pop-up bloqueado pelo navegador. Permita pop-ups para imprimir.')
      return
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${selectedTemplate.nome} - ${selectedClient.nome}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', serif; background: #fff; color: #000; padding: 48px 56px; line-height: 1.8; }
            h1 { font-size: 15px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px; border-bottom: 1.5px solid #000; padding-bottom: 10px; }
            p { font-size: 12px; text-align: justify; margin-bottom: 14px; text-indent: 36px; }
            .btn-print { position: fixed; top: 16px; right: 16px; background: #06b6d4; color: #000; border: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; z-index: 99; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            @media print { .btn-print { display: none; } body { padding: 20px; } }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
          ${docEditorHtml}
        </body>
      </html>
    `)
    win.document.close()

    // Registrar o doc na ficha se ainda não registrado
    handleSaveGeneratedDoc()
  }

  // Vincular Processo ao Cliente
  const handleLinkProcess = () => {
    if (!selectedClient || !selectedProcessToLink.trim()) return

    dataStore.linkProcessToClient(selectedClient.id, selectedProcessToLink.trim(), 'Operador NOX')
    toast.success(
      `Processo ${selectedProcessToLink.trim()} vinculado à ficha de ${selectedClient.nome}.`,
    )
    setSelectedProcessToLink('')
    setLinkProcessModalOpen(false)
  }

  // Desvincular Processo
  const handleUnlinkProcess = (procNumber: string) => {
    if (!selectedClient) return
    dataStore.unlinkProcessFromClient(selectedClient.id, procNumber, 'Operador NOX')
    toast.success(`Processo ${procNumber} desvinculado.`)
  }

  // Processos, Prazos, Compromissos e Timeline para a Ficha 360º do Cliente Selecionado
  const clientProcessesData = useMemo(() => {
    if (!selectedClient) return []
    const set = new Set(selectedClient.processosVinculados)

    // Unir da tabela records e sentinela_communications
    const matchedRecords = records.filter(
      (r) =>
        set.has(r.numeroProcesso) ||
        set.has(r.recordCode) ||
        r.clientId === selectedClient.id ||
        (selectedClient.cpf && r.partes && r.partes.includes(selectedClient.cpf)),
    )

    const matchedComms = comms.filter(
      (c) =>
        set.has(c.numeroProcesso) ||
        c.clientId === selectedClient.id ||
        (selectedClient.nome &&
          c.destinatario &&
          c.destinatario.toLowerCase().includes(selectedClient.nome.toLowerCase())),
    )

    // Agrupar por numeroProcesso
    const processMap = new Map<
      string,
      {
        numeroProcesso: string
        tribunal: string
        orgao: string
        classe: string
        status: string
        severity: string
        assunto: string
        recordId?: string
      }
    >()

    for (const r of matchedRecords) {
      processMap.set(r.numeroProcesso, {
        numeroProcesso: r.numeroProcesso,
        tribunal: r.tribunal,
        orgao: r.orgaoJulgador,
        classe: r.classeJudicial,
        status: r.status,
        severity: r.severity,
        assunto: r.assunto,
        recordId: r.id,
      })
    }

    for (const c of matchedComms) {
      if (!processMap.has(c.numeroProcesso)) {
        processMap.set(c.numeroProcesso, {
          numeroProcesso: c.numeroProcesso,
          tribunal: c.tribunal,
          orgao: c.orgaoJulgador,
          classe: c.classeJudicial || 'Processo Judicial',
          status: c.status,
          severity: c.urgencyLevel,
          assunto: c.teorResumido,
        })
      }
    }

    // Processos adicionados manualmente que ainda não têm dados no Sentinela
    for (const p of selectedClient.processosVinculados) {
      if (!processMap.has(p)) {
        processMap.set(p, {
          numeroProcesso: p,
          tribunal: 'Em monitoramento',
          orgao: 'Vara Judicial',
          classe: 'Processo Vinculado',
          status: 'ativo',
          severity: 'informativo',
          assunto: 'Vínculo cadastral direto',
        })
      }
    }

    return Array.from(processMap.values())
  }, [selectedClient, records, comms])

  // Prazos e Compromissos filtrados para a Ficha
  const clientAgendaDeadlines = useMemo(() => {
    if (!selectedClient) return { events: [], deadlines: [], tasks: [] }
    const set = new Set(selectedClient.processosVinculados)

    const matchedEvents = agenda.filter((ev) => {
      const matchProc = ev.processNumber && set.has(ev.processNumber)
      const matchClientName =
        ev.clientName &&
        selectedClient.nome &&
        ev.clientName.toLowerCase().includes(selectedClient.nome.toLowerCase())
      return matchProc || matchClientName
    })

    const matchedDeadlines = comms
      .filter((c) => {
        const matchProc = set.has(c.numeroProcesso)
        const matchClient =
          c.clientId === selectedClient.id ||
          (c.destinatario &&
            selectedClient.nome &&
            c.destinatario.toLowerCase().includes(selectedClient.nome.toLowerCase()))
        return (matchProc || matchClient) && c.deadlineCalculated
      })
      .map((c) => c.deadlineCalculated!)

    const matchedTasks = tasks.filter((t) => {
      const matchProc = t.processNumber && set.has(t.processNumber)
      const matchClient =
        t.clientName &&
        selectedClient.nome &&
        t.clientName.toLowerCase().includes(selectedClient.nome.toLowerCase())
      return matchProc || matchClient
    })

    return {
      events: matchedEvents,
      deadlines: matchedDeadlines,
      tasks: matchedTasks,
    }
  }, [selectedClient, agenda, comms, tasks])

  // Linha do tempo auditada (audit_logs filtrada pelo cliente, ordenada com INTAKE_RECEBIDO em destaque)
  const clientTimeline = useMemo(() => {
    if (!selectedClient) return []

    const logs = auditLogs.filter((log) => {
      const matchTarget =
        log.targetId === selectedClient.id ||
        log.targetId === selectedClient.clientCode ||
        log.targetId === selectedClient.protocolo

      const matchDetails =
        log.details &&
        (log.details.client_code === selectedClient.clientCode ||
          log.details.cliente === selectedClient.nome ||
          (typeof log.details.nome === 'string' &&
            log.details.nome.toLowerCase() === selectedClient.nome.toLowerCase()) ||
          (typeof log.details.cpf === 'string' &&
            selectedClient.cpf &&
            log.details.cpf === selectedClient.cpf))

      const matchProcess =
        log.details &&
        typeof log.details.numero_processo === 'string' &&
        selectedClient.processosVinculados.includes(log.details.numero_processo)

      return matchTarget || matchDetails || matchProcess
    })

    // Ordenar: eventos mais antigos primeiro (linha do tempo progressiva) ou mais recentes primeiro
    return logs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [selectedClient, auditLogs])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Chain Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#0a152e] via-[#09142b] to-[#0d1c3a] border border-cyan-500/20 shadow-xl shadow-cyan-950/30">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge className="bg-cyan-950 text-cyan-300 border-cyan-500/50 text-[10px] uppercase font-mono px-2 py-0.5 shadow-sm">
              <Sparkles className="w-3 h-3 mr-1 text-cyan-400 inline" /> Elo Central de
              Controladoria
            </Badge>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-300 text-xs font-mono">
              Intake → Clientes 360º → Processos → Prazos → Documentos
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            Módulo Clientes & Atendimentos
          </h1>
          <p className="text-xs text-slate-300/90 mt-1 max-w-2xl leading-relaxed">
            Visão unificada 360º de cada cliente da advocacia. Conexão direta com entradas do
            Intake, monitoramento Sentinela, prazos da controladoria e emissão de peças com dados
            preenchidos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setNewClientModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-9 px-4 gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <UserPlus className="w-4 h-4" />+ Novo Cliente Manual
          </Button>
          <a
            href="/intake/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Formulário /intake/</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
          </a>
        </div>
      </div>

      {/* Origin Quick Filter Pills */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Origem:
          </span>

          <button
            onClick={() => setOriginFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
              originFilter === 'ALL'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Todos ({originCounts.all})
          </button>

          <button
            onClick={() => setOriginFilter('intake_site')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
              originFilter === 'intake_site'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/40'
                : 'bg-slate-900 text-cyan-300/80 hover:text-cyan-300 border border-cyan-900/50'
            }`}
          >
            <Globe className="w-3 h-3" />
            via Intake ({originCounts.intake_site})
          </button>

          <button
            onClick={() => setOriginFilter('manual')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
              originFilter === 'manual'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            Manual ({originCounts.manual})
          </button>

          <button
            onClick={() => setOriginFilter('whatsapp')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 ${
              originFilter === 'whatsapp'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/40'
                : 'bg-slate-900 text-emerald-400/80 hover:text-emerald-300 border border-emerald-900/50'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            WhatsApp ({originCounts.whatsapp})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CPF, código, caso..."
              className="h-8 pl-8 pr-3 w-56 md:w-72 bg-slate-900/90 border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus-visible:ring-cyan-500"
            />
          </div>

          <div className="flex rounded-lg border border-slate-800 overflow-hidden bg-slate-900">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 text-xs font-mono ${
                viewMode === 'kanban'
                  ? 'bg-cyan-950 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-mono ${
                viewMode === 'list'
                  ? 'bg-cyan-950 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Pipeline View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-2">
          {(
            [
              'novo',
              'em_atendimento',
              'aguardando_documentos',
              'ativo',
              'concluido',
              'inativo',
            ] as ClientStage[]
          ).map((stageKey) => {
            const stageClients = filteredClients.filter((c) => c.estagio === stageKey)
            const cfg = STAGE_CONFIG[stageKey]

            return (
              <div
                key={stageKey}
                className="flex flex-col rounded-xl bg-[#070d1d] border border-slate-800/90 min-w-[240px] max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-800 bg-slate-950/60 rounded-t-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        stageKey === 'novo'
                          ? 'bg-amber-400 animate-pulse'
                          : stageKey === 'ativo'
                            ? 'bg-emerald-400'
                            : stageKey === 'em_atendimento'
                              ? 'bg-blue-400'
                              : stageKey === 'aguardando_documentos'
                                ? 'bg-purple-400'
                                : 'bg-slate-500'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-200 uppercase font-mono tracking-tight">
                      {cfg.label}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono border-slate-700 text-slate-300 px-1.5 py-0"
                  >
                    {stageClients.length}
                  </Badge>
                </div>

                {/* Column Content */}
                <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                  {stageClients.length === 0 ? (
                    <div className="py-8 text-center text-slate-600 text-[11px] font-mono italic">
                      Nenhum cliente neste estágio
                    </div>
                  ) : (
                    stageClients.map((client) => {
                      const attention = attentionMap.get(client.id)
                      const originCfg = ORIGIN_CONFIG[client.origem]
                      const OriginIcon = originCfg?.icon || Globe

                      return (
                        <div
                          key={client.id}
                          onClick={() => {
                            setSelectedClient(client)
                            setSearchParams({ selected: client.id })
                          }}
                          className={`p-3 rounded-lg bg-slate-900/90 border hover:border-cyan-500/60 transition-all cursor-pointer group shadow-sm hover:shadow-cyan-950/40 relative ${
                            selectedClient?.id === client.id
                              ? 'border-cyan-400 ring-1 ring-cyan-500/50 bg-slate-900'
                              : 'border-slate-800/80 hover:bg-slate-850'
                          }`}
                        >
                          {/* Indicator de Atenção Necessária (Discreto) */}
                          {attention && (
                            <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                              {attention.fatalDeadlines > 0 && (
                                <Badge className="bg-rose-950/90 text-rose-300 border-rose-800 text-[9px] font-mono px-1.5 py-0">
                                  <AlertTriangle className="w-2.5 h-2.5 mr-1 inline text-rose-400" />
                                  Prazo em 3d ({attention.fatalDeadlines})
                                </Badge>
                              )}
                              {attention.pendingAudiences > 0 && (
                                <Badge className="bg-amber-950/90 text-amber-300 border-amber-800 text-[9px] font-mono px-1.5 py-0">
                                  <CalendarCheck className="w-2.5 h-2.5 mr-1 inline text-amber-400" />
                                  Audiência s/ confirmação
                                </Badge>
                              )}
                              {attention.pendingDocs && (
                                <Badge className="bg-purple-950/90 text-purple-300 border-purple-800 text-[9px] font-mono px-1.5 py-0">
                                  <FileText className="w-2.5 h-2.5 mr-1 inline text-purple-400" />
                                  Sem docs gerados
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Code & Origin Badge */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="font-mono text-[10px] text-cyan-400 font-semibold">
                              {client.clientCode}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] font-mono px-1.5 py-0 flex items-center gap-1 ${
                                originCfg?.badgeClass || 'border-slate-700 text-slate-400'
                              }`}
                            >
                              <OriginIcon className="w-2.5 h-2.5" />
                              {originCfg?.label || client.origem}
                            </Badge>
                          </div>

                          {/* Client Name */}
                          <div className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                            {client.nome}
                          </div>

                          {/* Demand Badge */}
                          <div className="mt-1.5 flex items-center justify-between gap-1">
                            <Badge className="bg-slate-800/90 text-slate-300 border-slate-700 text-[9px] uppercase font-mono px-1.5 py-0">
                              {client.demanda}
                            </Badge>

                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          {/* Case snippet */}
                          {client.descricaoCaso && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-2 leading-relaxed bg-slate-950/40 p-1.5 rounded border border-slate-800/50">
                              {client.descricaoCaso}
                            </p>
                          )}

                          {/* Connected Items Count Footer */}
                          <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>{client.processosVinculados.length} proc.</span>
                            <span>
                              {client.docsGerados.length} doc
                              {client.docsGerados.length !== 1 ? 's' : ''}
                            </span>
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
      ) : (
        /* List View */
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80">
          <div className="divide-y divide-slate-800/80">
            {filteredClients.map((client) => {
              const attention = attentionMap.get(client.id)
              const originCfg = ORIGIN_CONFIG[client.origem]
              const OriginIcon = originCfg?.icon || Globe

              return (
                <div
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client)
                    setSearchParams({ selected: client.id })
                  }}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 group-hover:border-cyan-500/40 transition-colors shrink-0">
                      <Users className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {client.clientCode}
                        </span>
                        <span className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                          {client.nome}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono px-1.5 py-0 flex items-center gap-1 ${
                            originCfg?.badgeClass || 'border-slate-700 text-slate-400'
                          }`}
                        >
                          <OriginIcon className="w-2.5 h-2.5" />
                          {originCfg?.label || client.origem}
                        </Badge>
                        <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] uppercase font-mono">
                          {client.demanda}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                        {client.telefone && <span>📞 {client.telefone}</span>}
                        {client.cpf && <span>CPF {client.cpf}</span>}
                        <span>
                          Cadastrado em {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {attention && (
                        <div className="mt-1.5 flex items-center gap-2">
                          {attention.fatalDeadlines > 0 && (
                            <Badge className="bg-rose-950/90 text-rose-300 border-rose-800 text-[9px] font-mono">
                              Prazo Fatal Próximo ({attention.fatalDeadlines})
                            </Badge>
                          )}
                          {attention.pendingAudiences > 0 && (
                            <Badge className="bg-amber-950/90 text-amber-300 border-amber-800 text-[9px] font-mono">
                              Audiência Pendente
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <select
                      value={client.estagio}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStageChange(client.id, e.target.value as ClientStage)}
                      className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                    >
                      {Object.entries(STAGE_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300 hover:text-cyan-300"
                    >
                      Abrir Ficha 360º <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL DA FICHA DO CLIENTE — VISÃO 360º */}
      {/* ========================================================================= */}
      {selectedClient && (
        <Dialog
          open={Boolean(selectedClient)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedClient(null)
              setSearchParams({})
            }
          }}
        >
          <DialogContent className="max-w-4xl bg-slate-950 border border-slate-800 text-slate-100 max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl shadow-cyan-950/60 rounded-2xl">
            {/* Header da Ficha */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 font-mono text-xs">
                    {selectedClient.clientCode}
                  </Badge>
                  {selectedClient.protocolo && (
                    <Badge
                      variant="outline"
                      className="text-slate-400 border-slate-700 text-xs font-mono"
                    >
                      Protocolo: {selectedClient.protocolo}
                    </Badge>
                  )}
                  <Badge
                    className={`text-xs uppercase font-mono ${
                      STAGE_CONFIG[selectedClient.estagio]?.bg || 'bg-slate-800'
                    } ${STAGE_CONFIG[selectedClient.estagio]?.text || 'text-slate-300'} border ${
                      STAGE_CONFIG[selectedClient.estagio]?.border || 'border-slate-700'
                    }`}
                  >
                    {STAGE_CONFIG[selectedClient.estagio]?.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs font-mono ${
                      ORIGIN_CONFIG[selectedClient.origem]?.badgeClass || 'text-slate-400'
                    }`}
                  >
                    {ORIGIN_CONFIG[selectedClient.origem]?.label}
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-white mt-1.5 truncate flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400 shrink-0" />
                  {selectedClient.nome}
                </h2>
              </div>

              {/* Seletor Manual de Estágio na Header */}
              <div className="flex items-center gap-2 mr-6 shrink-0">
                <span className="text-[11px] font-mono text-slate-400">Estágio:</span>
                <select
                  value={selectedClient.estagio}
                  onChange={(e) =>
                    handleStageChange(selectedClient.id, e.target.value as ClientStage)
                  }
                  className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                >
                  {Object.entries(STAGE_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Abas da Ficha 360º */}
            <Tabs defaultValue="cadastrais" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 border-b border-slate-800 bg-slate-900/30">
                <TabsList className="bg-transparent border-none p-0 h-11 gap-2 flex-wrap">
                  <TabsTrigger
                    value="cadastrais"
                    className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Dados Cadastrais
                  </TabsTrigger>
                  <TabsTrigger
                    value="processos"
                    className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
                  >
                    <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Processos (
                    {clientProcessesData.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="prazos"
                    className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5" /> Prazos & Compromissos (
                    {clientAgendaDeadlines.events.length + clientAgendaDeadlines.deadlines.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="documentos"
                    className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Documentos (
                    {selectedClient.docsGerados.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
                  >
                    <History className="w-3.5 h-3.5 mr-1.5" /> Linha do Tempo & Intake (
                    {clientTimeline.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ============================================================== */}
              {/* TAB 1: DADOS CADASTRAIS */}
              {/* ============================================================== */}
              <TabsContent value="cadastrais" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Nome Completo
                    </span>
                    <div className="text-slate-100 font-semibold mt-1">{selectedClient.nome}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      CPF / CNPJ
                    </span>
                    <div className="text-slate-200 font-mono mt-1">{selectedClient.cpf || '—'}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      RG / Inscrição
                    </span>
                    <div className="text-slate-200 font-mono mt-1">{selectedClient.rg || '—'}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Telefone / WhatsApp
                    </span>
                    <div className="text-slate-200 font-mono mt-1 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {selectedClient.telefone || '—'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">E-mail</span>
                    <div className="text-slate-200 mt-1 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-cyan-400" />
                      {selectedClient.email || '—'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Profissão
                    </span>
                    <div className="text-slate-200 mt-1">{selectedClient.profissao || '—'}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Nacionalidade / Estado Civil
                    </span>
                    <div className="text-slate-200 mt-1">
                      {selectedClient.nacionalidade || 'brasileiro(a)'} •{' '}
                      {selectedClient.estadoCivil || 'solteiro(a)'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Área da Demanda
                    </span>
                    <div className="mt-1">
                      <Badge className="text-[10px] uppercase font-mono bg-cyan-950 text-cyan-300 border-cyan-800">
                        {selectedClient.demanda}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Endereço Completo
                  </span>
                  <div className="text-slate-200 mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{selectedClient.endereco || 'Endereço não informado'}</span>
                  </div>
                </div>

                {/* Descrição do Caso vinda do Intake */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Descrição do Caso / Narrativa do Cliente (Passo 3 do Intake)
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] font-mono text-slate-400 border-slate-700"
                    >
                      Entrada Original
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                    {selectedClient.descricaoCaso || 'Nenhuma descrição detalhada registrada.'}
                  </p>
                </div>

                {selectedClient.obs && (
                  <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Observações Internas
                    </span>
                    <div className="text-slate-300 mt-1">{selectedClient.obs}</div>
                  </div>
                )}
              </TabsContent>

              {/* ============================================================== */}
              {/* TAB 2: PROCESSOS VINCULADOS */}
              {/* ============================================================== */}
              <TabsContent value="processos" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-200 uppercase">
                      Processos e Comunicações Vinculados ao Cliente
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Vínculo unificado por CNJ ou ID cadastral. Nenhum dado é duplicado.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setLinkProcessModalOpen(true)}
                    className="h-8 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />+ Vincular Processo
                  </Button>
                </div>

                {clientProcessesData.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-xs text-slate-400 space-y-2">
                    <Briefcase className="w-8 h-8 mx-auto text-slate-600" />
                    <p>Nenhum processo formal vinculado a este cliente no momento.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLinkProcessModalOpen(true)}
                      className="text-xs border-slate-700 text-cyan-400 hover:bg-slate-800"
                    >
                      Vincular processo agora
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientProcessesData.map((proc, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2 hover:border-cyan-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-300">
                              {proc.numeroProcesso}
                            </span>
                            <Badge className="text-[10px] bg-slate-800 text-slate-300 border-slate-700">
                              {proc.tribunal}
                            </Badge>
                            <Badge
                              className={`text-[10px] uppercase font-mono ${
                                proc.severity === 'critico' || proc.severity === 'critica'
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : proc.severity === 'alto' || proc.severity === 'alta'
                                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                                    : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                              }`}
                            >
                              {proc.severity}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlinkProcess(proc.numeroProcesso)}
                              title="Desvincular processo deste cliente"
                              className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 text-[11px]"
                            >
                              <Unlink className="w-3.5 h-3.5 mr-1" />
                              Desvincular
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                          <div>
                            <span className="text-[10px] font-mono text-slate-500">
                              Órgão Julgador:{' '}
                            </span>
                            <span className="text-slate-200">{proc.orgao}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-slate-500">
                              Classe / Assunto:{' '}
                            </span>
                            <span className="text-slate-200">{proc.classe}</span>
                          </div>
                        </div>

                        {proc.assunto && (
                          <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80 leading-relaxed">
                            {proc.assunto}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ============================================================== */}
              {/* TAB 3: PRAZOS E COMPROMISSOS */}
              {/* ============================================================== */}
              <TabsContent value="prazos" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-200 uppercase">
                    Prazos Fatais e Compromissos da Agenda
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Consultado diretamente na Central de Prazos e Módulo Compromissos para este
                    cliente.
                  </p>
                </div>

                {/* Prazos Fatais */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Prazos Jurídicos Homologados ({clientAgendaDeadlines.deadlines.length})
                  </div>

                  {clientAgendaDeadlines.deadlines.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-500 italic">
                      Nenhum prazo judicial pendente para os processos deste cliente.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clientAgendaDeadlines.deadlines.map((mem) => (
                        <div
                          key={mem.id}
                          className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-2">
                              <span>{mem.legalRuleName}</span>
                              <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px] font-mono">
                                Fatal: {mem.finalDeadlineDate}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Proc. {mem.numeroProcesso} • {mem.daysCount} dias {mem.daysType} (
                              {mem.legalRuleArticle})
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono text-emerald-400 border-emerald-800"
                          >
                            Homologado
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Compromissos e Audiências */}
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Audiências e Atendimentos Agendados ({clientAgendaDeadlines.events.length})
                  </div>

                  {clientAgendaDeadlines.events.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-500 italic">
                      Nenhum compromisso agendado com este cliente.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clientAgendaDeadlines.events.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-2">
                              <span>{ev.title}</span>
                              <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px] uppercase font-mono">
                                {ev.eventType}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Data: {new Date(ev.startDate).toLocaleString('pt-BR')} • Resp:{' '}
                              {ev.responsible}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              ev.status === 'CONFIRMADO'
                                ? 'text-emerald-400 border-emerald-800'
                                : 'text-amber-400 border-amber-800'
                            }`}
                          >
                            {ev.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ============================================================== */}
              {/* TAB 4: DOCUMENTOS GERADOS */}
              {/* ============================================================== */}
              <TabsContent value="documentos" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-200 uppercase">
                      Documentos e Minutas da Ficha
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Geração de procurações, contratos e declarações com substituição automática de
                      dados.
                    </p>
                  </div>
                </div>

                {/* Templates Rápidos para Gerar */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                    Gerar Novo Documento com Dados deste Cliente:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {DEFAULT_DOCUMENT_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => handleOpenDocGenerator(tpl)}
                        className="p-3 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group flex items-start gap-2.5"
                      >
                        <span className="text-xl shrink-0">{tpl.icone}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 line-clamp-1">
                            {tpl.nome}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {tpl.descricao}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de Documentos já gerados */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-cyan-400 uppercase font-semibold">
                    Documentos Emitidos ({selectedClient.docsGerados.length})
                  </div>

                  {selectedClient.docsGerados.length === 0 ? (
                    <div className="p-6 text-center rounded-lg border border-dashed border-slate-800 text-xs text-slate-500 italic">
                      Nenhum documento gerado para este cliente ainda. Clique em um dos modelos
                      acima.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedClient.docsGerados.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-200">{doc.nomeModelo}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                Gerado em {new Date(doc.criadoEm).toLocaleString('pt-BR')} por{' '}
                                {doc.autor}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono text-emerald-400 border-emerald-800"
                            >
                              ✓ {doc.status}
                            </Badge>

                            {doc.conteudoHtml && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const tpl = DEFAULT_DOCUMENT_TEMPLATES.find(
                                    (t) => t.id === doc.templateId,
                                  ) || {
                                    id: doc.templateId || 'tpl-custom',
                                    nome: doc.nomeModelo,
                                    icone: '📄',
                                    area: 'todos',
                                    descricao: '',
                                    corpoHtml: doc.conteudoHtml || '',
                                  }
                                  setSelectedTemplate(tpl)
                                  setDocEditorHtml(doc.conteudoHtml || '')
                                  setDocGeneratorModalOpen(true)
                                }}
                                className="h-7 text-xs border-slate-700 text-cyan-300 hover:bg-slate-800"
                              >
                                Visualizar / Imprimir
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ============================================================== */}
              {/* TAB 5: LINHA DO TEMPO & AUDITORIA INTAKE */}
              {/* ============================================================== */}
              <TabsContent value="timeline" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-400" />
                    Ciclo de Vida Auditado (Cadeia de Custódia)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Registro imutável em audit_logs desde a captação no /intake/ até a conclusão do
                    processo.
                  </p>
                </div>

                {clientTimeline.length === 0 ? (
                  <div className="p-6 text-center rounded-lg border border-slate-800 text-xs text-slate-500 italic">
                    Nenhum registro de auditoria encontrado para este cliente.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {clientTimeline.map((item, idx) => {
                      const isIntake = item.action === 'INTAKE_RECEBIDO'
                      const isStageChange = item.action === 'STATUS_CLIENTE_ALTERADO'
                      const isDocGen = item.action === 'DOCUMENTO_GERADO_CLIENTE'
                      const isProcLink = item.action === 'PROCESSO_VINCULADO_AO_CLIENTE'

                      return (
                        <div key={item.id} className="relative group">
                          {/* Dot */}
                          <div
                            className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ring-4 ring-slate-950 ${
                              isIntake
                                ? 'bg-cyan-400 shadow-md shadow-cyan-500/50'
                                : isStageChange
                                  ? 'bg-amber-400'
                                  : isDocGen
                                    ? 'bg-purple-400'
                                    : isProcLink
                                      ? 'bg-emerald-400'
                                      : 'bg-slate-600'
                            }`}
                          />

                          <div
                            className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                              isIntake
                                ? 'bg-cyan-950/30 border-cyan-500/40'
                                : 'bg-slate-900/70 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span className="font-bold text-cyan-300 uppercase">
                                {item.action}
                              </span>
                              <span>{new Date(item.createdAt).toLocaleString('pt-BR')}</span>
                            </div>

                            <div className="text-slate-200 font-medium">
                              {isIntake ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-cyan-900/80 text-cyan-200 text-[10px] font-mono">
                                      Origem: {String(item.details?.origem || 'intake_site')}
                                    </Badge>
                                    <span className="text-slate-400 text-xs">
                                      Ator: {item.actor} (IP: {item.ipAddress})
                                    </span>
                                  </div>
                                  {typeof item.details?.descricao_caso === 'string' && (
                                    <div className="bg-slate-950/80 p-2.5 rounded-lg border border-cyan-800/40 text-slate-300 text-[11px] leading-relaxed">
                                      <strong>Narrativa do Cliente:</strong>
                                      <p className="mt-1">{String(item.details.descricao_caso)}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <span className="text-slate-400 text-xs">
                                    Ator: {item.actor} •{' '}
                                  </span>
                                  <span>{JSON.stringify(item.details)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NOVO CLIENTE MANUAL (CADASTRO DIRETO NO PAINEL) */}
      {/* ========================================================================= */}
      <Dialog open={newClientModalOpen} onOpenChange={setNewClientModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 border border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              Cadastro Manual de Cliente (Atendimento Direto)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-mono">
              Para atendimentos presenciais, telefone, indicação ou WhatsApp institucional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClient} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-slate-300 font-semibold">Nome Completo *</Label>
                <Input
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: João da Silva Souza"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">CPF ou CNPJ</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">RG / Órgão Emissor</Label>
                <Input
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  placeholder="00.000.000-0 SSP/MS"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Telefone / WhatsApp</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  placeholder="(67) 90000-0000"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">E-mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-slate-300 font-semibold">Endereço Completo</Label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Profissão</Label>
                <Input
                  value={formData.profissao}
                  onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                  placeholder="Ex: Engenheiro civil"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Área da Demanda</Label>
                <select
                  value={formData.demanda}
                  onChange={(e) =>
                    setFormData({ ...formData, demanda: e.target.value as ClientDemandArea })
                  }
                  className="w-full h-9 bg-slate-900 border border-slate-700 rounded-md px-3 text-xs text-slate-200"
                >
                  <option value="consumidor">Consumidor</option>
                  <option value="trabalhista">Trabalhista</option>
                  <option value="civel">Cível</option>
                  <option value="criminal">Criminal</option>
                  <option value="bancario">Bancário</option>
                  <option value="imobiliario">Imobiliário</option>
                  <option value="tributario">Tributário</option>
                  <option value="familia">Família e Sucessões</option>
                  <option value="previdenciario">Previdenciário</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Origem do Cadastro</Label>
                <select
                  value={formData.origem}
                  onChange={(e) =>
                    setFormData({ ...formData, origem: e.target.value as ClientOrigin })
                  }
                  className="w-full h-9 bg-slate-900 border border-slate-700 rounded-md px-3 text-xs text-slate-200"
                >
                  <option value="manual">Cadastro Manual / Telefone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="indicacao">Indicação</option>
                  <option value="presencial">Presencial no Escritório</option>
                  <option value="intake_site">Intake Site (Teste)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Estágio Inicial</Label>
                <select
                  value={formData.estagio}
                  onChange={(e) =>
                    setFormData({ ...formData, estagio: e.target.value as ClientStage })
                  }
                  className="w-full h-9 bg-slate-900 border border-slate-700 rounded-md px-3 text-xs text-slate-200"
                >
                  <option value="novo">Novo</option>
                  <option value="em_atendimento">Em Atendimento</option>
                  <option value="aguardando_documentos">Aguardando Documentos</option>
                  <option value="ativo">Ativo (Processo em Curso)</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-slate-300 font-semibold">
                  Descrição do Caso / Objeto
                </Label>
                <textarea
                  rows={3}
                  value={formData.descricaoCaso}
                  onChange={(e) => setFormData({ ...formData, descricaoCaso: e.target.value })}
                  placeholder="Relato dos fatos e pretensão jurídica..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewClientModalOpen(false)}
                className="text-xs border-slate-700 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Salvar Cadastro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: GERADOR / VISUALIZADOR DE DOCUMENTOS */}
      {/* ========================================================================= */}
      <Dialog open={docGeneratorModalOpen} onOpenChange={setDocGeneratorModalOpen}>
        <DialogContent className="max-w-4xl bg-slate-950 border border-slate-800 text-slate-100 max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/60">
            <DialogTitle className="text-sm font-bold text-white flex items-center justify-between">
              <span>
                Gerar: {selectedTemplate?.nome} — {selectedClient?.nome}
              </span>
              <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 font-mono text-[10px]">
                Dados Injetados
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Editor/Visualizador de Documento */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30">
            <div className="max-w-2xl mx-auto bg-white text-slate-950 p-8 rounded-lg shadow-xl font-serif text-xs leading-relaxed">
              <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setDocEditorHtml(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: docEditorHtml }}
                className="focus:outline-none min-h-[400px]"
              />
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="text-[11px] font-mono text-slate-400">
              * Você pode editar o texto acima diretamente antes de salvar ou imprimir.
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDocGeneratorModalOpen(false)}
                className="text-xs border-slate-700 text-slate-300"
              >
                Fechar
              </Button>

              <Button
                size="sm"
                onClick={handlePrintDocument}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir / PDF & Salvar na Ficha
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: VINCULAR PROCESSO */}
      {/* ========================================================================= */}
      <Dialog open={linkProcessModalOpen} onOpenChange={setLinkProcessModalOpen}>
        <DialogContent className="max-w-lg bg-slate-950 border border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-cyan-400" />
              Vincular Processo a {selectedClient?.nome}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-mono">
              Digite o número do processo (CNJ) ou selecione um processo monitorado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Número do Processo (CNJ)</Label>
              <Input
                value={selectedProcessToLink}
                onChange={(e) => setSelectedProcessToLink(e.target.value)}
                placeholder="Ex: 1045230-89.2026.8.26.0100"
                className="bg-slate-900 border-slate-700 text-xs text-slate-100 font-mono"
              />
            </div>

            {/* Sugestões de Processos Não Vinculados */}
            {records.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Processos do Lote Sentinela Disponíveis:
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-800 rounded-lg p-1 bg-slate-900/60">
                  {records.slice(0, 8).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedProcessToLink(r.numeroProcesso)}
                      className="w-full text-left p-1.5 rounded hover:bg-slate-800/80 text-xs font-mono text-slate-300 flex items-center justify-between transition-colors"
                    >
                      <span className="truncate text-cyan-300">{r.numeroProcesso}</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-slate-700 text-slate-400"
                      >
                        {r.tribunal}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLinkProcessModalOpen(false)}
              className="text-xs border-slate-700 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleLinkProcess}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              Confirmar Vínculo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ClientesPage
