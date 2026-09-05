import React, { useState } from 'react'
import { ProcessoMonitorado } from '@/services/datajudService'
import { NoxButton, NoxLabel, NoxMono, NoxStatusBadge } from '@/design-system'
import {
  FolderGit2,
  AlertTriangle,
  Clock,
  ChevronRight,
  ExternalLink,
  Plus,
  ShieldCheck,
  FileCheck,
  Check,
} from 'lucide-react'

export interface IntelligenceProcessesTabProps {
  processes: ProcessoMonitorado[]
  linkedProcessNumber?: string
  onSelectRelatedProcess: (processNumber: string) => void
  onOpenLinkModal: () => void
  onNavigateToProcessDetail?: (processNumber: string) => void
}

export const IntelligenceProcessesTab: React.FC<IntelligenceProcessesTabProps> = ({
  processes,
  linkedProcessNumber,
  onSelectRelatedProcess,
  onOpenLinkModal,
  onNavigateToProcessDetail,
}) => {
  const linkedProcess = processes.find((p) => p.numero_processo === linkedProcessNumber)

  return (
    <div className="p-4 space-y-4">
      {/* Bloco 1: Processo Vinculado Atual (se houver) */}
      {linkedProcess ? (
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PROCESSO VINCULADO À CONVERSA</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700">
              ATIVO
            </span>
          </div>

          <div>
            <div className="text-xs font-mono font-bold text-slate-100 flex items-center justify-between">
              <span>{linkedProcess.numero_processo}</span>
              <span className="text-[11px] font-mono text-cyan-300">
                {linkedProcess.tribunal || 'TJMS'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Cliente: {linkedProcess.cliente || 'Vinculado'}</span>
              <span>&bull;</span>
              <span>Status: {linkedProcess.ativo ? 'Monitoramento Ativo' : 'Inativo'}</span>
            </div>
          </div>

          {/* Última Movimentação DataJud */}
          <div className="p-2.5 rounded-lg bg-[#050811] border border-slate-800 text-xs space-y-1">
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>ÚLTIMA MOVIMENTAÇÃO DATAJUD</span>
            </div>
            <div className="text-slate-200 font-medium text-[11px] leading-tight">
              {linkedProcess.tem_prazo_aberto
                ? 'Prazo processual aberto aguardando manifestação.'
                : 'Processo sincronizado com a base do CNJ DataJud.'}
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Mapeamento: {linkedProcess.ultimo_status_mapeamento || 'Sincronizado'}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-cyan-900/40">
            <NoxButton
              variant="secondary"
              size="sm"
              icon={FolderGit2}
              onClick={onOpenLinkModal}
              className="text-xs flex-1 justify-center"
            >
              Alterar Vínculo
            </NoxButton>
            {onNavigateToProcessDetail && (
              <NoxButton
                variant="ghost"
                size="sm"
                icon={ExternalLink}
                onClick={() => onNavigateToProcessDetail(linkedProcess.numero_processo)}
                className="text-xs text-cyan-400"
              >
                Ver Detalhes
              </NoxButton>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
          <FolderGit2 className="w-6 h-6 text-slate-500 mx-auto" />
          <div className="text-xs text-slate-300 font-medium">
            Nenhum processo vinculado à conversa
          </div>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Vincule um processo judicial para permitir cruzamento com intimações e andamentos em
            tempo real.
          </p>
          <NoxButton
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={onOpenLinkModal}
            className="w-full justify-center"
          >
            Vincular Processo
          </NoxButton>
        </div>
      )}

      {/* Bloco 2: Lista de Processos Relacionados */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <NoxLabel className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            Processos do Cliente ({processes.length})
          </NoxLabel>
          <button
            onClick={onOpenLinkModal}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Adicionar Outro
          </button>
        </div>

        {processes.length === 0 ? (
          <div className="p-4 rounded-lg bg-slate-900/20 border border-slate-800 text-center text-slate-500 text-xs font-mono">
            Nenhum processo cadastrado para este contato.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {processes.map((proc) => {
              const isSelected = proc.numero_processo === linkedProcessNumber
              return (
                <div
                  key={proc.id || proc.numero_processo}
                  className={`p-3 rounded-lg border transition-all text-xs ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <NoxMono className="text-xs font-bold text-slate-200 block">
                        {proc.numero_processo}
                      </NoxMono>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {proc.tribunal || 'TJ'} &bull; {proc.cliente || 'Cliente'} &bull;{' '}
                        {proc.ativo ? 'ATIVO' : 'INATIVO'}
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                        <Check className="w-3 h-3" />
                        Vinculado
                      </span>
                    ) : (
                      <NoxButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectRelatedProcess(proc.numero_processo)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 h-6 px-2"
                      >
                        Vincular
                      </NoxButton>
                    )}
                  </div>

                  <div className="mt-2 text-[11px] text-slate-300 line-clamp-2 bg-[#050811]/60 p-1.5 rounded border border-slate-800/80">
                    {proc.tem_prazo_aberto
                      ? 'Prazo aberto em andamento.'
                      : 'Monitoramento DataJud ativo sem prazos abertos.'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
