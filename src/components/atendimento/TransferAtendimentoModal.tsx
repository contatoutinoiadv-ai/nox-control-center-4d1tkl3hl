import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { NoxButton, NoxLabel } from '@/design-system'
import { User, Check, ArrowRight } from 'lucide-react'

export interface TransferAtendimentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentResponsible: string
  onConfirmTransfer: (newResponsible: string, note?: string) => Promise<void>
}

// Lista canônica de operadores reais do sistema NOX
const REAL_OPERATORS = [
  { name: 'Higor Utinoi de Oliveira', role: 'Advogado Titular', email: 'higor@nox.adv.br' },
  { name: 'Gabriel Advogado', role: 'Advogado Associado', email: 'gabriel@nox.adv.br' },
  { name: 'Secretaria NOX', role: 'Operador / Triagem', email: 'secretaria@nox.adv.br' },
  {
    name: 'Controladoria Jurídica',
    role: 'Controladoria Interna',
    email: 'controladoria@nox.adv.br',
  },
]

export const TransferAtendimentoModal: React.FC<TransferAtendimentoModalProps> = ({
  open,
  onOpenChange,
  currentResponsible,
  onConfirmTransfer,
}) => {
  const [selectedUser, setSelectedUser] = useState<string>(
    REAL_OPERATORS.find((u) => !u.name.toLowerCase().includes(currentResponsible.toLowerCase()))
      ?.name || REAL_OPERATORS[0].name,
  )
  const [internalNote, setInternalNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setIsSubmitting(true)
    try {
      await onConfirmTransfer(selectedUser, internalNote.trim() || undefined)
      onOpenChange(false)
      setInternalNote('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#050811] border border-slate-800 text-slate-100 max-w-md p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
            <User className="w-4 h-4 text-cyan-400" />
            Transferir Atendimento
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Selecione um operador ou advogado cadastrado para assumir a custódia desta conversa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2">
          {/* Responsável Atual */}
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">Responsável Atual:</span>{' '}
            <strong className="text-slate-200">{currentResponsible}</strong>
          </div>

          {/* Seleção do Novo Responsável */}
          <div className="space-y-2">
            <NoxLabel className="text-xs text-slate-300 font-mono">Novo Responsável</NoxLabel>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {REAL_OPERATORS.map((op) => {
                const isSelected = selectedUser === op.name
                const isCurrent = op.name.toLowerCase().includes(currentResponsible.toLowerCase())
                return (
                  <div
                    key={op.email}
                    onClick={() => setSelectedUser(op.name)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 shadow-sm shadow-cyan-950'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <span>{op.name}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-mono px-1 py-0 rounded bg-slate-800 text-slate-400">
                            Atual
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {op.role} &bull; {op.email}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Nota Interna Opcional */}
          <div className="space-y-1.5">
            <NoxLabel className="text-xs text-slate-300 font-mono">
              Nota Interna de Transferência (Opcional)
            </NoxLabel>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Ex: Transferido para protocolo de contestação urgente..."
              rows={3}
              className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
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
              disabled={isSubmitting || !selectedUser}
            >
              {isSubmitting ? 'Transferindo...' : 'Confirmar Transferência'}
            </NoxButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
