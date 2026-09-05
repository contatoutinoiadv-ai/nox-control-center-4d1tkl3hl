import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { NoxButton, NoxLabel } from '@/design-system'
import { Link as LinkIcon, Check, Plus, AlertCircle, Search } from 'lucide-react'
import { ProcessoMonitorado } from '@/services/datajudService'

export interface LinkProcessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentProcessNumber?: string
  availableProcesses: ProcessoMonitorado[]
  onConfirmLink: (processNumber: string) => Promise<void>
}

export const LinkProcessModal: React.FC<LinkProcessModalProps> = ({
  open,
  onOpenChange,
  currentProcessNumber,
  availableProcesses,
  onConfirmLink,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProcess, setSelectedProcess] = useState<string>(currentProcessNumber || '')
  const [manualInput, setManualInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filtered = availableProcesses.filter((p) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      p.numero_processo.toLowerCase().includes(q) ||
      p.cliente.toLowerCase().includes(q) ||
      p.tribunal.toLowerCase().includes(q)
    )
  })

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = manualInput.trim() || selectedProcess
    if (!target) return
    setIsSubmitting(true)
    try {
      await onConfirmLink(target)
      onOpenChange(false)
      setManualInput('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#050811] border border-slate-800 text-slate-100 max-w-lg p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
            <LinkIcon className="w-4 h-4 text-cyan-400" />
            Vincular Processo à Conversa
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Associe um processo monitorado real da base NOX para carregar andamentos e alertas do
            DataJud.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2 text-xs">
          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar processo da base por CNJ, cliente ou tribunal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#09101f] border border-slate-800 rounded-lg pl-8 p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Lista de Processos da Base NOX */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs font-mono">
                Nenhum processo encontrado na base monitorada.
              </div>
            ) : (
              filtered.map((proc) => {
                const isSelected = selectedProcess === proc.numero_processo
                return (
                  <div
                    key={proc.id || proc.numero_processo}
                    onClick={() => {
                      setSelectedProcess(proc.numero_processo)
                      setManualInput('')
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 shadow-sm shadow-cyan-950'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold text-cyan-300">
                        {proc.numero_processo}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-slate-200">{proc.cliente}</span>
                        <span>&bull;</span>
                        <span className="text-cyan-400 font-mono text-[10px]">{proc.tribunal}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </div>
                )
              })
            )}
          </div>

          {/* Ou Inserir CNJ Manual */}
          <div className="pt-2 border-t border-slate-800 space-y-1">
            <NoxLabel className="text-slate-400 font-mono text-[11px]">
              Ou digite outro número CNJ para vincular:
            </NoxLabel>
            <input
              type="text"
              placeholder="0000000-00.0000.0.00.0000"
              value={manualInput}
              onChange={(e) => {
                setManualInput(e.target.value)
                setSelectedProcess('')
              }}
              className="w-full bg-[#09101f] border border-slate-800 rounded-lg p-2 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
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
              disabled={isSubmitting || (!selectedProcess && !manualInput.trim())}
            >
              {isSubmitting ? 'Vinculando...' : 'Confirmar Vínculo'}
            </NoxButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
