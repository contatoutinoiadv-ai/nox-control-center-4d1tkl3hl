import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { NoxButton, NoxLabel } from '@/design-system'
import { CheckSquare, ArrowRight, ShieldCheck } from 'lucide-react'
import { TaskPriority } from '@/types/sentinela'

export interface CreateTaskFromAtendimentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultClientName: string
  defaultProcessNumber?: string
  conversationId: string
  onConfirmCreateTask: (taskData: {
    title: string
    description: string
    priority: TaskPriority
    processNumber?: string
    clientName?: string
    internalDueDate: string
    responsible: string
  }) => Promise<void>
}

export const CreateTaskFromAtendimentoModal: React.FC<CreateTaskFromAtendimentoModalProps> = ({
  open,
  onOpenChange,
  defaultClientName,
  defaultProcessNumber,
  conversationId,
  onConfirmCreateTask,
}) => {
  const [title, setTitle] = useState(
    defaultClientName
      ? `Atendimento — ${defaultClientName}: Providência Jurídica`
      : 'Atendimento: Providência',
  )
  const [description, setDescription] = useState(
    `Origem: CENTRAL DE ATENDIMENTO (Conversa #${conversationId}).\nDemanda originada a partir de interação com o cliente. Verificar documentos e peças necessárias.`,
  )
  const [priority, setPriority] = useState<TaskPriority>('ALTA')
  const [processNumber, setProcessNumber] = useState(defaultProcessNumber || '')
  const [responsible, setResponsible] = useState('Higor Utinoi de Oliveira')
  const [internalDueDate, setInternalDueDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      await onConfirmCreateTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        processNumber: processNumber.trim() || undefined,
        clientName: defaultClientName || undefined,
        internalDueDate,
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
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            Criar Tarefa no Módulo de Produção
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Cadastra a demanda diretamente no motor operacional de Tarefas e Produção com vínculo de
            origem preservado.
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
            <NoxLabel className="text-slate-300 font-mono">Título da Tarefa</NoxLabel>
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
              <NoxLabel className="text-slate-300 font-mono">Cliente Vinculado</NoxLabel>
              <input
                type="text"
                readOnly
                value={defaultClientName || 'Contato Não Identificado'}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-xs text-slate-400 cursor-not-allowed font-sans"
              />
            </div>
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Processo CNJ (Opcional)</NoxLabel>
              <input
                type="text"
                value={processNumber}
                onChange={(e) => setProcessNumber(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Prioridade</NoxLabel>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
              >
                <option value="CRITICA">CRÍTICA</option>
                <option value="ALTA">ALTA</option>
                <option value="MEDIA">MÉDIA</option>
                <option value="BAIXA">BAIXA</option>
              </select>
            </div>
            <div className="space-y-1">
              <NoxLabel className="text-slate-300 font-mono">Prazo Interno</NoxLabel>
              <input
                type="date"
                required
                value={internalDueDate}
                onChange={(e) => setInternalDueDate(e.target.value)}
                className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
              />
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

          <div className="space-y-1">
            <NoxLabel className="text-slate-300 font-mono">Descrição & Observações</NoxLabel>
            <textarea
              rows={3}
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
              {isSubmitting ? 'Gravando...' : 'Gravar Tarefa'}
            </NoxButton>          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
