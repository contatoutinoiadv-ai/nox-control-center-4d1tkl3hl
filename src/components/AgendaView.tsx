import React, { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Video,
  MapPin,
  FileText,
  Download,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react'
import { AgendaEvent, AgendaEventType } from '@/types/sentinela'
import { dataStore } from '@/services/dataStore'
import { safeCalendarAdapter } from '@/services/adapters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const EVENT_TYPE_COLORS: Record<AgendaEventType, { bg: string; text: string; border: string }> = {
  AUDIENCIA: { bg: 'bg-purple-950/70', text: 'text-purple-300', border: 'border-purple-800' },
  ATENDIMENTO: { bg: 'bg-emerald-950/70', text: 'text-emerald-300', border: 'border-emerald-800' },
  COMPROMISSO: { bg: 'bg-blue-950/70', text: 'text-blue-300', border: 'border-blue-800' },
  REUNIAO: { bg: 'bg-cyan-950/70', text: 'text-cyan-300', border: 'border-cyan-800' },
  DILIGENCIA: { bg: 'bg-amber-950/70', text: 'text-amber-300', border: 'border-amber-800' },
  VENCIMENTO_PRAZO: { bg: 'bg-rose-950/70', text: 'text-rose-300', border: 'border-rose-800' },
  SUSTENTACAO_ORAL: {
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-300',
    border: 'border-emerald-800',
  },
  PERICIA: { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-700' },
}

export const AgendaView: React.FC = () => {
  const [events, setEvents] = useState<AgendaEvent[]>(dataStore.getAgendaEvents())
  const [viewMode, setViewMode] = useState<'lista' | 'mes' | 'semana' | 'dia' | 'timeline'>('lista')
  const [searchFilter, setSearchFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('TODOS')
  const [responsibleFilter, setResponsibleFilter] = useState<string>('TODOS')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setEvents(dataStore.getAgendaEvents())
    })
    return unsub
  }, [])

  // New Event Form State
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<AgendaEventType>('AUDIENCIA')
  const [newStartDate, setNewStartDate] = useState(
    new Date().toISOString().split('T')[0] + 'T14:00',
  )
  const [newEndDate, setNewEndDate] = useState(new Date().toISOString().split('T')[0] + 'T15:30')
  const [newResponsible, setNewResponsible] = useState(
    dataStore.getLawyerProfile().nome || 'Higor Utinoi de Oliveira',
  )
  const [newProcess, setNewProcess] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newIsVirtual, setNewIsVirtual] = useState(true)

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) {
      toast.error('Informe o título do compromisso')
      return
    }

    const event: AgendaEvent = {
      id: `agenda_${Date.now()}`,
      title: newTitle,
      eventType: newType,
      startDate: newStartDate + ':00Z',
      endDate: newEndDate + ':00Z',
      isAllDay: false,
      locationOrLink: newLocation,
      isVirtual: newIsVirtual,
      processNumber: newProcess || undefined,
      responsible: newResponsible,
      participants: [newResponsible],
      status: 'CONFIRMADO',
      remindersMinutesBefore: [1440, 60],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    dataStore.addAgendaEvent(event)
    setEvents(dataStore.getAgendaEvents())
    setCreateModalOpen(false)
    setNewTitle('')
    toast.success('Compromisso agendado com sucesso e integrado ao sistema!')
  }

  const handleExportIcs = (event: AgendaEvent) => {
    const icsContent = safeCalendarAdapter.exportToIcs({
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.locationOrLink,
    })

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `evento_${event.id}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Arquivo .ICS exportado para Google Calendar / Outlook / Apple!')
  }

  const filteredEvents = events.filter((ev) => {
    if (typeFilter !== 'TODOS' && ev.eventType !== typeFilter) return false
    if (responsibleFilter !== 'TODOS' && ev.responsible !== responsibleFilter) return false
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      const match =
        ev.title.toLowerCase().includes(q) ||
        (ev.processNumber && ev.processNumber.includes(q)) ||
        ev.responsible.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            Agenda Operacional & Jurídica Sincronizada
          </h2>
          <p className="text-xs text-slate-400">
            Compromissos, audiências e vencimentos com prevenção de conflitos e exportação .ICS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-8 shadow-md shadow-cyan-950 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Compromisso / Audiência
          </Button>
        </div>
      </div>

      {/* View Switcher & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <Input
            placeholder="Filtrar por processo, cliente, responsável..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-slate-950 border-slate-800 pl-8 h-8 text-xs text-slate-200"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-[11px]">Tipo:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filtrar por tipo de evento"
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 text-xs font-mono"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="AUDIENCIA">Audiência</option>
            <option value="VENCIMENTO_PRAZO">Vencimento de Prazo</option>
            <option value="REUNIAO">Reunião</option>
            <option value="COMPROMISSO">Compromisso</option>
            <option value="DILIGENCIA">Diligência</option>
          </select>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['lista', 'semana', 'mes', 'timeline'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono capitalize transition-all ${
                viewMode === mode
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Events List / Cards */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
            Nenhum compromisso encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const colors = EVENT_TYPE_COLORS[ev.eventType] || {
              bg: 'bg-slate-900',
              text: 'text-slate-300',
              border: 'border-slate-800',
            }
            const startD = new Date(ev.startDate)

            return (
              <div
                key={ev.id}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 nox-glass-card"
              >
                <div className="flex items-start gap-3">
                  {/* Date Block */}
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 text-center shrink-0">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">
                      {startD.toLocaleString('pt-BR', { month: 'short' })}
                    </span>
                    <span className="text-base font-extrabold text-slate-100 font-mono leading-none">
                      {startD.getDate()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono px-2 py-0.5 ${colors.bg} ${colors.text} ${colors.border}`}
                      >
                        {ev.eventType}
                      </Badge>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-200">{ev.title}</h4>
                      {ev.isVirtual && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-cyan-400 border-cyan-800/40 bg-cyan-950/30 flex items-center gap-1"
                        >
                          <Video className="w-2.5 h-2.5" /> Virtual
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {startD.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span className="text-slate-300">{ev.responsible}</span>
                      {ev.processNumber && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400/80">{ev.processNumber}</span>
                        </>
                      )}
                      {ev.locationOrLink && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px] text-slate-500">
                            {ev.locationOrLink}
                          </span>
                        </>
                      )}
                    </div>

                    {ev.description && (
                      <p className="text-xs text-slate-400 mt-1">{ev.description}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportIcs(ev)}
                    className="h-7 text-[11px] bg-slate-950/60 border-slate-700 text-slate-300 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    .ICS
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Novo Compromisso */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-100">
              Agendar Compromisso / Audiência
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Crie audiências, reuniões ou prazos sincronizados com tarefas e notificações.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-300">Título do Evento</Label>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Audiência de Instrução 14ª VC SP"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-slate-300">Tipo de Compromisso</Label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AgendaEventType)}
                  aria-label="Tipo de Compromisso"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded px-2.5 py-1.5 text-xs"
                >
                  <option value="AUDIENCIA">Audiência</option>
                  <option value="REUNIAO">Reunião com Cliente</option>
                  <option value="DILIGENCIA">Diligência / Fórum</option>
                  <option value="VENCIMENTO_PRAZO">Vencimento de Prazo</option>
                  <option value="COMPROMISSO">Compromisso Geral</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Responsável</Label>
                <Input
                  value={newResponsible}
                  onChange={(e) => setNewResponsible(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-slate-300">Data e Hora Início</Label>
                <Input
                  type="datetime-local"
                  required
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Data e Hora Término</Label>
                <Input
                  type="datetime-local"
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Número do Processo (Opcional)</Label>
              <Input
                value={newProcess}
                onChange={(e) => setNewProcess(e.target.value)}
                placeholder="Ex: 1004523-88.2025.8.26.0100"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Link Zoom / Local Presencial</Label>
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ex: https://zoom.us/j/... ou Fórum Central"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Salvar Compromisso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
