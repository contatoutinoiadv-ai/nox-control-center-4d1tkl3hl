import React from 'react'
import { NoxClient } from '@/types/nox'
import { ConversationSummary } from '@/types/atendimento'
import { NoxButton, NoxLabel, NoxStatusBadge } from '@/design-system'
import {
  User,
  ExternalLink,
  CheckSquare,
  Calendar,
  Phone,
  Mail,
  FileText,
  UserX,
  Search,
  UserPlus,
  Link as LinkIcon,
  FolderGit2,
} from 'lucide-react'

export interface IntelligenceClientTabProps {
  client: NoxClient | null
  conversation: ConversationSummary
  processCount: number
  onNavigateToClient: (clientId: string) => void
  onCreateTask: () => void
  onScheduleAppointment: () => void
  onOpenLinkClientModal: () => void
}

export const IntelligenceClientTab: React.FC<IntelligenceClientTabProps> = ({
  client,
  conversation,
  processCount,
  onNavigateToClient,
  onCreateTask,
  onScheduleAppointment,
  onOpenLinkClientModal,
}) => {
  // Estado 1: Contato Não Identificado / Sem Cliente Vinculado
  if (!client) {
    return (
      <div className="p-4 space-y-4">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200 font-mono">CONTATO NÃO IDENTIFICADO</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Esta conversa está associada ao remetente{' '}
              <strong>{conversation.participant.name}</strong> ({conversation.participant.phone}), mas
              não há cadastro oficial vinculado.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[11px] text-amber-300 font-mono text-left">
            <strong>Diretriz NOX:</strong> Vínculo automático por similaridade fraca é expressamente
            proibido para resguardar sigilo processual.
          </div>
        </div>

        {/* Ações Preparadas */}
        <div className="space-y-2">
          <NoxLabel className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
            Ações de Cadastro
          </NoxLabel>
          <div className="space-y-2">
            <NoxButton
              variant="primary"
              size="sm"
              onClick={onOpenLinkClientModal}
              className="w-full justify-center"
            >
              <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
              Vincular Cliente Existente
            </NoxButton>
            <NoxButton
              variant="secondary"
              size="sm"
              onClick={onOpenLinkClientModal}
              className="w-full justify-center"
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Localizar Cliente na Base
            </NoxButton>
            <NoxButton
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToClient('new')}
              className="w-full justify-center text-cyan-400 hover:text-cyan-300"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Criar Novo Cadastro de Cliente
            </NoxButton>
          </div>
        </div>
      </div>
    )
  }

  // Estado 2: Cliente Vinculado com Dados Reais
  return (
    <div className="p-4 space-y-4">
      {/* Card Principal do Cliente */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">{client.nome}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/80 text-cyan-300">
                {client.clientCode}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              CPF: {client.cpf || 'Não cadastrado'}
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            {client.estagio}
          </span>
        </div>

        {/* Dados de Contato */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-mono text-slate-200">
              {client.telefone || conversation.participant.phone}
            </span>
          </div>
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-300 truncate">{client.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-slate-400">Responsável:</span>
            <span className="font-medium text-slate-200">
              {client.responsavel || 'Higor Utinoi'}
            </span>
          </div>
        </div>

        {/* Métricas de Processos */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
          <div className="p-2 rounded-lg bg-[#050811] border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Processos</div>
            <div className="text-base font-bold text-cyan-400 font-mono">{processCount}</div>
          </div>
          <div className="p-2 rounded-lg bg-[#050811] border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-mono uppercase">Origem</div>
            <div className="text-xs font-semibold text-slate-200 font-mono truncate">
              {client.origem || 'WhatsApp'}
            </div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas Integradas */}
      <div className="space-y-2">
        <NoxLabel className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
          Ações Rápidas Integradas
        </NoxLabel>
        <div className="grid grid-cols-1 gap-2">
          <NoxButton
            variant="secondary"
            size="sm"
            onClick={() => onNavigateToClient(client.id)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Ficha do Cliente
            </span>
            <span className="text-[10px] font-mono text-slate-500">Módulo Clientes</span>
          </NoxButton>
          <NoxButton
            variant="secondary"
            size="sm"
            onClick={onCreateTask}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              Criar Tarefa no Módulo
            </span>
            <span className="text-[10px] font-mono text-slate-500">Produção NOX</span>
          </NoxButton>
          <NoxButton
            variant="secondary"
            size="sm"
            onClick={onScheduleAppointment}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Agendar Compromisso
            </span>
            <span className="text-[10px] font-mono text-slate-500">Agenda NOX</span>
          </NoxButton>
        </div>
      </div>

      {/* Observações / Notas do Cliente */}
      {client.areaDemanda && (
        <div className="p-3 rounded-xl bg-slate-900/30 border border-slate-800/60 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3 h-3 text-cyan-400" />
            <span>ÁREA DE DEMANDA CADASTRADA</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">{client.areaDemanda}</p>
        </div>
      )}
    </div>
  )
}
