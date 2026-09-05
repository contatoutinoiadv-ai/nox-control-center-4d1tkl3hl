import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { NoxButton, NoxLabel } from '@/design-system'
import { Calendar, ArrowRight, ShieldCheck } from 'lucide-react'
import { AgendaEventType } from '@/types/sentinela'

export interface CreateAppointmentFromAtendimentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultClientName: string
  defaultProcessNumber?: string
  conversationId: string
  onConfirmCreateAppointment: (appointmentData: {
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
  }) => Promise<void>
}

export const CreateAppointmentFromAtendimentoModal: React.FC<
  CreateAppointmentFromAtendimentoModalProps
> = ({
  open,
  onOpenChange,
  defaultClientName,
  defaultProcessNumber,
  conversationId,
  onConfirmCreateAppointment,
}) => {
  const [title, setTitle] = useState(
    defaultClientName ? `Atendimento Jurídico: ${defaultClientName}` : 'Compromisso com Cliente',
  )
  const [eventType, setEventType] = useState<AgendaEventType>('ATENDIMENTO')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('15:00')
  const [isVirtual, setIsVirtual] = useState(true)
  const [locationOrLink, setLocationOrLink] = useState('Google Meet / WhatsApp Vídeo')
  const [processNumber, setProcessNumber] = useState(defaultProcessNumber || '')
  const [responsible, setResponsible] = useState('Higor Utinoi de Oliveira')
  const [description, setDescription] = useState(
    `Origem: CENTRAL DE ATENDIMENTO (Conversa #${conversationId}). Alinhamento de documentos e estratégia processual com o cliente.`,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const startIso = `${date}T${startTime}:00.000Z`
      const endIso = `${date}T${endTime}:00.000Z`
      await onConfirmCreateAppointment({
        title: title.trim(),
        description: description.trim(),
        eventType,
        processNumber: processNumber.trim() || undefined,
        clientName: defaultClientName || undefined,
        startDate: startIso,
        endDate: endIso,
        isVirtual,
        locationOrLink: locationOrLink.trim() || undefined,
        responsible,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#050811] border border-slate-800 text-slate-100 max-w-lg p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Agendar Compromisso no Módulo Agenda
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Cadastra audiência, atendimento ou prazo fatal diretamente no motor de Compromissos NOX
            existente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
          <div className="p-2 rounded bg-cyan-950/30 border border-cyan-800/40 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>
              Origem: <strong>CENTRAL DE ATENDIMENTO</strong> &bull; Pré-preenchido
            </span>
          </div>

          <div className="space-y-1">
            <NoxLabel className="text-slate-300 font-mono">Título do Compromisso</NoxLabel>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Tipo de Evento</NoxLabel>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as AgendaEventType)}
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
              >
                <option value="ATENDIMENTO">Atendimento ao Cliente</option>
                <option value="AUDIENCIA">Audiência Judicial</option>
                <option value="COMPROMISSO">Compromisso Geral</option>
                <option value="REUNIAO">Reunião Interna</option>
                <option value="DILIGENCIA">Diligência Externa</option>
                <option value="VENCIMENTO_PRAZO">Prazo Fatal</option>
              </select>
            </div>
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Responsável</NoxLabel>
              <select
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
              >
                <option value="Higor Utinoi de Oliveira">Higor Utinoi</option>
                <option value="Gabriel Advogado">Gabriel Advogado</option>
                <option value="Secretaria NOX">Secretaria NOX</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Data</NoxLabel>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
              />
            </div>
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Hora Início</NoxLabel>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
              />
            </div>
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Hora Término</NoxLabel>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Processo Vinculado</NoxLabel>
              <input
                type="text"
                value={processNumber}
                onChange={(e) => setProcessNumber(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Modalidade / Link</NoxLabel>
              <input
                type="text"
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
                placeholder="Ex: Google Meet, Sala 2"
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <NoxLabel className="text-slate-300 font-mono">Descrição & Pauta</NoxLabel>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <NoxButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </NoxButton>
            <NoxButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
            </NoxButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
