import React, { useState } from 'react'
import {
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Lock,
  Eye,
  Copy,
  Edit3,
  Save,
  Video,
  MapPin,
  Building,
  RefreshCw,
} from 'lucide-react'
import { AgendaEvent } from '@/types/sentinela'
import { NoxClient } from '@/types/nox'
import { dataStore } from '@/services/dataStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface PreparacaoAudienciaControlProps {
  /**
   * Audiência específica para abrir o modal de edição imediatamente (opcional).
   */
  selectedAgendaId?: string
  /**
   * Cliente específico para filtrar audiências (opcional).
   */
  clientId?: string
  /**
   * Número de processo específico para filtrar (opcional).
   */
  processNumber?: string
  /**
   * Título customizado para o cabeçalho.
   */
  title?: string
  /**
   * Callback quando houver alteração
   */
  onChanged?: () => void
}

export const PreparacaoAudienciaControl: React.FC<PreparacaoAudienciaControlProps> = ({
  selectedAgendaId,
  clientId,
  processNumber,
  title,
  onChanged,
}) => {
  const [events, setEvents] = useState<AgendaEvent[]>(dataStore.getAgendaEvents())
  const [clients, setClients] = useState<NoxClient[]>(dataStore.getClients())
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(() => {
    if (selectedAgendaId) {
      return dataStore.getAgendaEvents().find((e) => e.id === selectedAgendaId) || null
    }
    return null
  })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [filterOnlyEnabled, setFilterOnlyEnabled] = useState(false)

  // Form State para Edição de Alegações e Metadados
  const [formData, setFormData] = useState({
    tipoAudiencia: 'CONCILIACAO',
    preparacaoHabilitada: false,
    aprovadoParaCliente: false,
    revisadoPor: '',
    oQueVoceContou: '',
    oQueOutraParteRespondeu: '',
    oQueEstaEmAberto: '',
    selectedClientId: '',
  })

  // Sincronização com o dataStore
  React.useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      const updatedEvents = dataStore.getAgendaEvents()
      const updatedClients = dataStore.getClients()
      setEvents(updatedEvents)
      setClients(updatedClients)
      if (editingEvent) {
        const fresh = updatedEvents.find((e) => e.id === editingEvent.id)
        if (fresh) {
          setEditingEvent(fresh)
        }
      }
    })
    return unsub
  }, [editingEvent])

  // Abre modal de edição se selectedAgendaId mudar externamente
  React.useEffect(() => {
    if (selectedAgendaId) {
      const ev = events.find((e) => e.id === selectedAgendaId)
      if (ev) {
        openEditModal(ev)
      }
    }
  }, [selectedAgendaId])

  // Audiências filtradas (tipo AUDIENCIA ou que contenham 'audiência' no título)
  const audienciasList = events.filter((ev) => {
    const isAud =
      ev.eventType === 'AUDIENCIA' ||
      ev.title.toLowerCase().includes('audiência') ||
      ev.title.toLowerCase().includes('audiencia')

    if (!isAud) return false
    if (clientId && ev.clientId && ev.clientId !== clientId) return false
    if (processNumber && ev.processNumber && ev.processNumber !== processNumber) return false
    if (filterOnlyEnabled && !ev.preparacaoHabilitada) return false

    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      const match =
        ev.title.toLowerCase().includes(q) ||
        (ev.clientName && ev.clientName.toLowerCase().includes(q)) ||
        (ev.processNumber && ev.processNumber.includes(q)) ||
        (ev.tribunal && ev.tribunal.toLowerCase().includes(q))
      if (!match) return false
    }

    return true
  })

  const openEditModal = (ev: AgendaEvent) => {
    setEditingEvent(ev)

    // Tenta encontrar cliente vinculado
    const matchedClient =
      clients.find(
        (c) =>
          c.id === ev.clientId ||
          (ev.clientCpf &&
            (c.cpf === ev.clientCpf ||
              c.cpf.replace(/\D/g, '') === ev.clientCpf.replace(/\D/g, ''))) ||
          (ev.processNumber && c.processosVinculados.includes(ev.processNumber)) ||
          (ev.clientName && c.nome.toLowerCase() === ev.clientName.toLowerCase()),
      ) || null

    const currentLawyer = dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira'

    setFormData({
      tipoAudiencia:
        ev.tipoAudiencia ||
        (ev.title.toLowerCase().includes('instru') ? 'INSTRUCAO_E_JULGAMENTO' : 'CONCILIACAO'),
      preparacaoHabilitada: !!ev.preparacaoHabilitada,
      aprovadoParaCliente: !!ev.aprovadoParaCliente,
      revisadoPor:
        ev.alegacoesProcesso?.revisado_por ||
        matchedClient?.alegacoesProcesso?.revisado_por ||
        currentLawyer,
      oQueVoceContou:
        ev.alegacoesProcesso?.o_que_voce_contou ||
        matchedClient?.alegacoesProcesso?.o_que_voce_contou ||
        matchedClient?.descricaoCaso ||
        '',
      oQueOutraParteRespondeu:
        ev.alegacoesProcesso?.o_que_outra_parte_respondeu ||
        matchedClient?.alegacoesProcesso?.o_que_outra_parte_respondeu ||
        '',
      oQueEstaEmAberto:
        ev.alegacoesProcesso?.o_que_esta_em_aberto ||
        matchedClient?.alegacoesProcesso?.o_que_esta_em_aberto ||
        '',
      selectedClientId: ev.clientId || matchedClient?.id || '',
    })

    setIsEditModalOpen(true)
  }

  const handleTogglePreparacao = (ev: AgendaEvent, newStatus?: boolean) => {
    const actor = dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira'
    const targetStatus = newStatus !== undefined ? newStatus : !ev.preparacaoHabilitada
    const success = dataStore.togglePreparacaoAudiencia(ev.id, targetStatus, actor)

    if (success) {
      toast.success(
        targetStatus
          ? `Preparação HABILITADA para a audiência "${ev.title}".`
          : `Preparação DESABILITADA para a audiência "${ev.title}".`,
      )
      onChanged?.()
    } else {
      toast.error('Não foi possível alterar a preparação desta audiência.')
    }
  }

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return

    const actor = dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira'
    const nowIso = new Date().toISOString()

    // 1. Atualiza metadados do evento na agenda
    const matchedClient = clients.find((c) => c.id === formData.selectedClientId)
    const clientCpfClean = matchedClient?.cpf || editingEvent.clientCpf || ''
    const clientNameFinal = matchedClient?.nome || editingEvent.clientName || 'Cliente'

    const alegacoesObj = {
      revisado_por: formData.revisadoPor || actor,
      data_revisao: nowIso,
      o_que_voce_contou: formData.oQueVoceContou.trim(),
      o_que_outra_parte_respondeu: formData.oQueOutraParteRespondeu.trim(),
      o_que_esta_em_aberto: formData.oQueEstaEmAberto.trim(),
    }

    dataStore.updateAgendaEvent(editingEvent.id, {
      preparacaoHabilitada: formData.preparacaoHabilitada,
      aprovadoParaCliente: formData.aprovadoParaCliente,
      tipoAudiencia: formData.tipoAudiencia,
      clientId: formData.selectedClientId || editingEvent.clientId,
      clientName: clientNameFinal,
      clientCpf: clientCpfClean,
      alegacoesProcesso: alegacoesObj,
    })

    // 2. Chama updateAlegacoesProcesso para persistir e registrar log
    dataStore.updateAlegacoesProcesso(
      editingEvent.id,
      alegacoesObj,
      formData.aprovadoParaCliente,
      actor,
    )

    // Se houver cliente selecionado, atualiza também no cadastro do cliente
    if (formData.selectedClientId) {
      dataStore.updateAlegacoesProcesso(
        formData.selectedClientId,
        alegacoesObj,
        formData.aprovadoParaCliente,
        actor,
      )
    }

    // 3. Garante sincronização do status de preparação
    dataStore.togglePreparacaoAudiencia(editingEvent.id, formData.preparacaoHabilitada, actor)

    // 4. Se o processo do evento não estava nos processos vinculados do cliente, vincula
    if (formData.selectedClientId && editingEvent.processNumber) {
      const cl = dataStore.getClientById(formData.selectedClientId)
      if (cl && !cl.processosVinculados.includes(editingEvent.processNumber)) {
        dataStore.linkProcessToClient(cl.id, editingEvent.processNumber, actor)
      }
    }

    setIsEditModalOpen(false)
    toast.success('Controle de Preparação de Audiência atualizado e homologado com sucesso!')
    onChanged?.()
  }

  const copyPublicLink = (cpf?: string) => {
    const url = `${window.location.origin}/preparacao/`
    navigator.clipboard.writeText(url)
    toast.success('Link do portal do cliente copiado: /preparacao/', {
      description: cpf
        ? `O cliente deve autenticar com o CPF: ${cpf}`
        : 'O cliente deve informar o CPF cadastrado.',
    })
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-950 border border-amber-500/30 shadow-lg space-y-3 nox-glass-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                {title || 'Controle Interno: Preparação para Audiência'}
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-amber-500/60 text-amber-300 bg-amber-950/50"
                >
                  PORTAL DO CLIENTE (/preparacao)
                </Badge>
              </h3>
              <p className="text-xs text-slate-400">
                Habilite o acesso do cliente à experiência imersiva de preparação de audiência
                (Conciliação ou Instrução), revise as alegações e aprove a liberação segura.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open('/preparacao/', '_blank')}
              className="h-8 text-xs border-amber-700/60 text-amber-300 hover:bg-amber-950/40 font-mono"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Abrir Portal Público
            </Button>
          </div>
        </div>

        {/* Status Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Audiências na Pauta:</span>
            <span className="font-bold text-slate-100">{audienciasList.length}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Preparação Habilitada:</span>
            <span className="font-bold text-emerald-400">
              {audienciasList.filter((a) => a.preparacaoHabilitada).length}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Alegações Aprovadas:</span>
            <span className="font-bold text-cyan-400">
              {audienciasList.filter((a) => a.aprovadoParaCliente).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Input
            placeholder="Buscar por cliente, processo, título ou tribunal..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-slate-950 border-slate-800 h-8 text-xs text-slate-200"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs font-mono">
            <input
              type="checkbox"
              checked={filterOnlyEnabled}
              onChange={(e) => setFilterOnlyEnabled(e.target.checked)}
              className="accent-amber-400 rounded"
            />
            <span>Apenas com preparação ativada</span>
          </label>
        </div>
      </div>

      {/* List of Audiences with Controls */}
      {audienciasList.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-semibold text-slate-400">
            Nenhuma audiência cadastrada ou encontrada para o filtro.
          </p>
          <p className="text-[11px] text-slate-500">
            Você pode homologar uma nova audiência a partir do Sentinela NOX / DJEN ou cadastrar na
            Agenda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {audienciasList.map((aud) => {
            const startD = new Date(aud.startDate)
            const isInstrucao =
              aud.tipoAudiencia?.includes('INSTRUCAO') ||
              aud.title.toLowerCase().includes('instrução') ||
              aud.title.toLowerCase().includes('instrucao') ||
              aud.title.toLowerCase().includes('julgamento')

            // Encontrar cliente vinculado
            const clientMatch = clients.find(
              (c) =>
                c.id === aud.clientId ||
                (aud.clientCpf &&
                  (c.cpf === aud.clientCpf ||
                    c.cpf.replace(/\D/g, '') === aud.clientCpf.replace(/\D/g, ''))) ||
                (aud.processNumber && c.processosVinculados.includes(aud.processNumber)),
            )

            const clientCpfDisplay = clientMatch?.cpf || aud.clientCpf || 'Sem CPF vinculado'

            return (
              <div
                key={aud.id}
                className={`p-4 rounded-xl border transition-all space-y-3 nox-glass-card ${
                  aud.preparacaoHabilitada
                    ? 'bg-slate-900/90 border-amber-500/40 shadow-md shadow-amber-950/30'
                    : 'bg-slate-900/60 border-slate-800 opacity-90'
                }`}
              >
                {/* Header Row: Title, Date, Badges and Toggles */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Date Block */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 text-center shrink-0">
                      <span className="text-[10px] font-mono text-amber-400 uppercase">
                        {startD.toLocaleString('pt-BR', { month: 'short' })}
                      </span>
                      <span className="text-base font-extrabold text-slate-100 font-mono leading-none">
                        {startD.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-[9px] font-mono uppercase ${
                            isInstrucao
                              ? 'bg-purple-950 text-purple-300 border-purple-700'
                              : 'bg-amber-950 text-amber-300 border-amber-700'
                          }`}
                        >
                          {isInstrucao ? 'Instrução & Julgamento' : 'Conciliação / Mediação'}
                        </Badge>

                        <span className="text-sm font-bold text-slate-100">{aud.title}</span>

                        {aud.isVirtual ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] text-cyan-400 border-cyan-800 bg-cyan-950/30 flex items-center gap-1"
                          >
                            <Video className="w-2.5 h-2.5" /> Virtual
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] text-slate-300 border-slate-700 bg-slate-950 flex items-center gap-1"
                          >
                            <MapPin className="w-2.5 h-2.5" /> Presencial
                          </Badge>
                        )}

                        {aud.preparacaoHabilitada ? (
                          <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            PREPARAÇÃO ATIVA
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-slate-500 border-slate-700 text-[10px] font-mono flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" />
                            DESATIVADA
                          </Badge>
                        )}
                      </div>

                      {/* Metadata Row */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
                        <span className="text-cyan-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {startD.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span className="text-slate-200 font-semibold flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          Cliente: {clientMatch?.nome || aud.clientName || 'Não especificado'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">CPF: {clientCpfDisplay}</span>
                        {aud.processNumber && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400/90 font-bold">{aud.processNumber}</span>
                          </>
                        )}
                        {aud.tribunal && (
                          <>
                            <span>•</span>
                            <span className="text-purple-300">{aud.tribunal}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Toggle */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[11px] font-mono text-slate-300">
                        {aud.preparacaoHabilitada ? 'Habilitada' : 'Desabilitada'}
                      </span>
                      <Switch
                        checked={!!aud.preparacaoHabilitada}
                        onCheckedChange={(checked) => handleTogglePreparacao(aud, checked)}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>

                    <Button
                      size="sm"
                      onClick={() => openEditModal(aud)}
                      className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Gerenciar Preparação
                    </Button>
                  </div>
                </div>

                {/* Sub-card: Alegações e Vínculo */}
                <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Alegações do Processo (Versão do Cliente / Contestação / Foco):
                    </span>
                    <div className="flex items-center gap-2">
                      {aud.aprovadoParaCliente ? (
                        <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[9px] font-mono flex items-center gap-1">
                          <Eye className="w-3 h-3" /> APROVADO PARA VISUALIZAÇÃO DO CLIENTE
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-950/40 text-amber-300 border-amber-800 text-[9px] font-mono flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" /> APENAS USO INTERNO (NÃO EXIBIDO AO CLIENTE)
                        </Badge>
                      )}
                    </div>
                  </div>

                  {aud.alegacoesProcesso?.o_que_voce_contou ||
                  aud.alegacoesProcesso?.o_que_esta_em_aberto ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block mb-1">
                          O que o cliente contou:
                        </span>
                        <p className="text-slate-300 line-clamp-2">
                          {aud.alegacoesProcesso.o_que_voce_contou}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                          O que a outra parte respondeu:
                        </span>
                        <p className="text-slate-300 line-clamp-2">
                          {aud.alegacoesProcesso.o_que_outra_parte_respondeu ||
                            'Sem resposta cadastrada.'}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                        <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold block mb-1">
                          Foco em aberto da audiência:
                        </span>
                        <p className="text-slate-300 line-clamp-2">
                          {aud.alegacoesProcesso.o_que_esta_em_aberto || 'Sem foco específico.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic text-[11px] flex items-center justify-between">
                      <span>Nenhuma alegação formatada cadastrada para esta audiência.</span>
                      <button
                        onClick={() => openEditModal(aud)}
                        className="text-amber-400 hover:underline font-mono text-[10px]"
                      >
                        + Redigir alegações agora
                      </button>
                    </div>
                  )}

                  {/* Public Link Shortcut */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-500 truncate max-w-md">
                      Portal: {window.location.origin}/preparacao/ (Autenticação via CPF)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPublicLink(clientCpfDisplay)}
                      className="h-6 px-2 text-[10px] text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copiar Link com Instrução
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* DIALOG DE EDIÇÃO E HOMOLOGAÇÃO DA PREPARAÇÃO */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-slate-950 border-amber-500/40 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-amber-950/50">
          {editingEvent && (
            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-mono">
                    HOMOLOGAÇÃO DA PREPARAÇÃO
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">ID: {editingEvent.id}</span>
                </div>
                <DialogTitle className="text-base font-bold text-slate-100 mt-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  {editingEvent.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-mono">
                  {editingEvent.processNumber || 'Sem processo'} •{' '}
                  {editingEvent.tribunal || 'Tribunal Geral'}
                </DialogDescription>
              </DialogHeader>

              {/* Seção 1: Metadados Reais e Vínculo de Cliente */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  1. Vínculo de Cliente e Metadados da Audiência
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-300">
                      Cliente Vinculado (Obrigatório para login por CPF)
                    </Label>
                    <select
                      value={formData.selectedClientId}
                      onChange={(e) => {
                        const cid = e.target.value
                        setFormData({ ...formData, selectedClientId: cid })
                        const c = clients.find((item) => item.id === cid)
                        if (c && !formData.oQueVoceContou && c.descricaoCaso) {
                          setFormData((prev) => ({
                            ...prev,
                            selectedClientId: cid,
                            oQueVoceContou: c.descricaoCaso,
                          }))
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    >
                      <option value="">-- Selecione o cliente cadastrado --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clientCode} — {c.nome} (CPF: {c.cpf})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-300">Rito / Tipo da Audiência</Label>
                    <select
                      value={formData.tipoAudiencia}
                      onChange={(e) => setFormData({ ...formData, tipoAudiencia: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="CONCILIACAO">Conciliação / Mediação (Foco em Acordo)</option>
                      <option value="INSTRUCAO_E_JULGAMENTO">
                        Instrução e Julgamento (Oitiva de Testemunhas e Partes)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] font-mono text-slate-400">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block">Data e Hora:</span>
                    <span className="text-cyan-300 font-bold">
                      {new Date(editingEvent.startDate).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block">Tribunal / Vara:</span>
                    <span className="text-slate-200">
                      {editingEvent.tribunal || 'Não informado'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block">Modalidade:</span>
                    <span className="text-slate-200">
                      {editingEvent.isVirtual ? 'Virtual (Zoom/Teams)' : 'Presencial'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção 2: Habilitação de Acesso e Regras de Segurança */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-3">
                <div className="text-xs font-bold text-amber-300 uppercase font-mono flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  2. Chaves de Liberação e Acesso do Cliente
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label className="text-slate-200 font-bold block">
                        Preparação Habilitada (Geral)
                      </Label>
                      <p className="text-[11px] text-slate-400">
                        Permite que o cliente faça login com seu CPF na rota pública /preparacao.
                      </p>
                    </div>
                    <Switch
                      checked={formData.preparacaoHabilitada}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, preparacaoHabilitada: checked })
                      }
                      className="data-[state=checked]:bg-emerald-500 shrink-0"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <Label className="text-slate-200 font-bold block">
                        Aprovado para o Cliente (Alegações)
                      </Label>
                      <p className="text-[11px] text-slate-400">
                        Exibe o resumo das alegações (O que você contou / Outra parte / Em aberto)
                        na tela do cliente. Desligado por padrão para segurança.
                      </p>
                    </div>
                    <Switch
                      checked={formData.aprovadoParaCliente}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, aprovadoParaCliente: checked })
                      }
                      className="data-[state=checked]:bg-cyan-500 shrink-0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-300">Advogado Revisor Responsável</Label>
                  <Input
                    value={formData.revisadoPor}
                    onChange={(e) => setFormData({ ...formData, revisadoPor: e.target.value })}
                    placeholder="Ex: Dr. Higor Utinoi de Oliveira (OAB/MS 15.400)"
                    className="bg-slate-950 border-slate-800 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* Seção 3: Redação / Revisão das Alegações do Processo */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                    3. Alegações do Processo (Linguagem Acessível ao Cliente)
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Revisão Humana Obrigatória
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-amber-300 text-[11px] font-mono uppercase">
                      • O que você (cliente) contou nos autos:
                    </Label>
                    <Textarea
                      rows={3}
                      value={formData.oQueVoceContou}
                      onChange={(e) => setFormData({ ...formData, oQueVoceContou: e.target.value })}
                      placeholder="Resumo claro dos fatos alegados pela nossa petição inicial..."
                      className="bg-slate-950 border-slate-800 text-xs text-slate-200 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-slate-400 text-[11px] font-mono uppercase">
                      • O que a outra parte respondeu (defesa/contestação):
                    </Label>
                    <Textarea
                      rows={3}
                      value={formData.oQueOutraParteRespondeu}
                      onChange={(e) =>
                        setFormData({ ...formData, oQueOutraParteRespondeu: e.target.value })
                      }
                      placeholder="Principais argumentos trazidos pelo réu na contestação..."
                      className="bg-slate-950 border-slate-800 text-xs text-slate-200 leading-relaxed"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-cyan-300 text-[11px] font-mono uppercase">
                      • O que ainda está em aberto (O que o juiz precisa esclarecer):
                    </Label>
                    <Textarea
                      rows={3}
                      value={formData.oQueEstaEmAberto}
                      onChange={(e) =>
                        setFormData({ ...formData, oQueEstaEmAberto: e.target.value })
                      }
                      placeholder="Pontos controvertidos que serão esclarecidos nesta audiência..."
                      className="bg-slate-950 border-slate-800 text-xs text-slate-200 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-xs text-slate-400"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar e Homologar Preparação
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PreparacaoAudienciaControl
