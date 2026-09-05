import React, { useState } from 'react'
import { ConversationSummary } from '@/types/atendimento'
import { NoxButton, NoxLabel } from '@/design-system'
import {
  Sparkles,
  AlertTriangle,
  FileCheck,
  Send,
  Edit3,
  Check,
  CheckSquare,
  Calendar,
  FileUp,
  Link as LinkIcon,
  UserCheck,
  ShieldAlert,
  Info,
} from 'lucide-react'

export interface IntelligenceAiTabProps {
  conversation: ConversationSummary
  onCreateTask: () => void
  onScheduleAppointment: () => void
  onOpenLinkProcessModal: () => void
  onOpenTransferModal: () => void
  onRequestDocument: () => void
  onApplySuggestedResponse: (response: string) => void
}

export const IntelligenceAiTab: React.FC<IntelligenceAiTabProps> = ({
  conversation,
  onCreateTask,
  onScheduleAppointment,
  onOpenLinkProcessModal,
  onOpenTransferModal,
  onRequestDocument,
  onApplySuggestedResponse,
}) => {
  const triage = conversation.aiTriage
  const [editedResponse, setEditedResponse] = useState(
    triage?.suggestedResponse ||
      'Olá, Maria. Compreendido o seu relato sobre a intimação. Por favor, envie uma foto legível da folha recebida para que possamos verificar o processo e resguardar seu prazo imediatamente.',
  )
  const [isEditing, setIsEditing] = useState(false)
  const [isApproved, setIsApproved] = useState(false)

  const handleApproveAndFill = () => {
    setIsApproved(true)
    onApplySuggestedResponse(editedResponse)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Banner de Diferenciação Estrita de IA */}
      <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-cyan-300 font-sans leading-relaxed">
          <div className="font-bold font-mono uppercase text-cyan-200">
            Inteligência NOX &bull; Assistente Operacional
          </div>
          <div>
            Sugestões da IA são indicativas e não constituem fato jurídico confirmado. Toda ação
            depende de homologação humana.
          </div>
        </div>
      </div>

      {/* Bloco 1: Resumo, Intenção e Classificação */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Triagem Heurística
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/80 text-red-300 border border-red-800/80 font-bold">
            {triage?.urgencyLevel || 'POSSÍVEL URGÊNCIA'}
          </span>
        </div>

        <div>
          <div className="text-xs font-bold text-slate-200 font-mono">
            {triage?.subject || 'Possível Intimação Judicial'}
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {triage?.summary ||
              'Cliente informa recebimento de correspondência judicial/intimação física em sua residência na data de hoje.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
          <div>
            <span className="text-slate-500 font-mono">Intenção:</span>{' '}
            <strong className="text-slate-200 font-mono">
              {triage?.intent || 'INFORMAR_ATO_JUDICIAL'}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-mono">Risco Legal:</span>{' '}
            <strong className="text-red-400 font-mono">
              {triage?.riskLevel || 'ALTO (DECURSO DE PRAZO)'}
            </strong>
          </div>
        </div>
      </div>

      {/* Bloco 2: Entidades e Documentos Mencionados */}
      <div className="space-y-2">
        <NoxLabel className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
          Entidades & Documentos Mencionados
        </NoxLabel>
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 w-24">DOCUMENTO:</span>
            <span className="font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60 text-[11px]">
              Intimação Judicial Física
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 w-24">PROCESSO:</span>
            <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
              {conversation.linkedProcessNumber || 'Não identificado na mensagem'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 w-24">DATA DO ATO:</span>
            <span className="font-mono text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/60 text-[11px]">
              Hoje (Data do recebimento alegada)
            </span>
          </div>
        </div>
      </div>

      {/* Bloco 3: Sugestão de Resposta com Fluxo de Homologação */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <NoxLabel className="text-[11px] text-cyan-300 font-mono uppercase tracking-wider">
              Sugestão de Resposta IA
            </NoxLabel>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400">
            <ShieldAlert className="w-3 h-3" />
            <span>NUNCA ENVIA SOZINHA</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#09101f] border border-cyan-900/50 space-y-2">
          {isEditing ? (
            <textarea
              rows={4}
              value={editedResponse}
              onChange={(e) => setEditedResponse(e.target.value)}
              className="w-full bg-[#050811] border border-cyan-700/60 rounded p-2 text-xs text-slate-200 font-sans focus:outline-none"
            />
          ) : (
            <p className="text-xs text-slate-200 leading-relaxed font-sans italic bg-slate-900/40 p-2.5 rounded border border-slate-800">
              "{editedResponse}"
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              {isEditing ? 'Salvar Edição' : 'Editar Sugestão'}
            </button>

            <NoxButton
              variant={isApproved ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleApproveAndFill}
              className="text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              {isApproved ? 'Preenchido no Chat' : 'Aprovar & Inserir no Chat'}
            </NoxButton>
          </div>
        </div>
      </div>

      {/* Bloco 4: Ações Recomendadas Determinísticas */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <NoxLabel className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">
          Ações Recomendadas (Triagem NOX)
        </NoxLabel>
        <div className="grid grid-cols-1 gap-2">
          <NoxButton
            variant="secondary"
            size="sm"
            onClick={onRequestDocument}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <FileUp className="w-3.5 h-3.5" />
              1. Solicitar Imagem da Intimação
            </span>
            <span className="text-[10px] font-mono text-cyan-400">Chat</span>
          </NoxButton>
          <NoxButton
            variant="secondary"
            size="sm"
            onClick={onOpenLinkProcessModal}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              2. Verificar / Vincular Processo
            </span>
            <span className="text-[10px] font-mono text-cyan-400">DataJud</span>
          </NoxButton>
          <NoxButton
            variant="secondary"
            size="sm"
            icon={CheckSquare}
            onClick={onCreateTask}
            className="w-full justify-between"
          >
            <span>3. Criar Tarefa de Análise de Prazo</span>
            <span className="text-[10px] font-mono text-slate-400">Produção</span>
          </NoxButton>
          <NoxButton
            variant="secondary"
            size="sm"
            icon={Calendar}
            onClick={onScheduleAppointment}
            className="w-full justify-between"
          >
            <span>4. Agendar Alinhamento com Cliente</span>
            <span className="text-[10px] font-mono text-slate-400">Agenda</span>
          </NoxButton>
          <NoxButton
            variant="ghost"
            size="sm"
            icon={UserCheck}
            onClick={onOpenTransferModal}
            className="w-full justify-between text-slate-300"
          >
            <span>5. Encaminhar para Outro Advogado</span>
            <span className="text-[10px] font-mono text-slate-500">Custódia</span>
          </NoxButton>
        </div>
      </div>
    </div>
  )
}
