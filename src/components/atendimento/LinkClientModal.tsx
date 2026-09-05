import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { NoxButton, NoxLabel } from '@/design-system'
import { UserCheck, Check, Search, AlertTriangle } from 'lucide-react'
import { NoxClient } from '@/types/nox'

export interface LinkClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentParticipantName: string
  availableClients: NoxClient[]
  onConfirmLink: (clientId: string, clientName: string) => Promise<void>
}

export const LinkClientModal: React.FC<LinkClientModalProps> = ({
  open,
  onOpenChange,
  currentParticipantName,
  availableClients,
  onConfirmLink,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filtered = availableClients.filter((c) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.cpf && c.cpf.includes(q)) ||
      c.clientCode.toLowerCase().includes(q) ||
      (c.telefone && c.telefone.includes(q))
    )
  })

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId) return
    const cli = availableClients.find((c) => c.id === selectedClientId)
    if (!cli) return

    setIsSubmitting(true)
    try {
      await onConfirmLink(cli.id, cli.nome)
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
            <UserCheck className="w-4 h-4 text-cyan-400" />
            Vincular Cliente Real da Base NOX
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Regra NOX: O vínculo é estritamente manual e determinístico. Nunca vincular
            automaticamente por similaridade fraca.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2 text-xs">
          <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/40 text-[11px] font-mono text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>
              Contato atual: <strong>{currentParticipantName}</strong>. Selecione abaixo o cadastro
              oficial correspondente.
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar cliente por nome, CPF ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#09101f] border border-slate-800 rounded-lg pl-8 p-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs font-mono">
                Nenhum cliente cadastrado atende ao filtro.
              </div>
            ) : (
              filtered.map((client) => {
                const isSelected = selectedClientId === client.id
                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200 shadow-sm shadow-cyan-950'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        <span>{client.nome}</span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1 py-0 rounded">
                          {client.clientCode}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        CPF: {client.cpf || 'Não informado'} &bull; Tel: {client.telefone || 'N/A'}{' '}
                        &bull; Estágio: {client.estagio}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </div>
                )
              })
            )}
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
              disabled={isSubmitting || !selectedClientId}
            >
              {isSubmitting ? 'Vinculando...' : 'Confirmar Vínculo Manual'}
            </NoxButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
