import React from 'react'
import { ConversationSummary } from '@/types/atendimento'
import { NoxCard, NoxAiSignature, NoxInsight, NoxButton } from '@/design-system'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  User,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

export interface IntelligencePanelPlaceholderProps {
  conversation: ConversationSummary | null
  className?: string
  onCloseMobileDrawer?: () => void
}

export const IntelligencePanelPlaceholder: React.FC<IntelligencePanelPlaceholderProps> = ({
  conversation,
  className,
  onCloseMobileDrawer,
}) => {
  if (!conversation) {
    return (
      <div
        className={cn(
          'flex flex-col h-full bg-[#050811] border-l border-slate-800/80 p-4 select-none',
          className,
        )}
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            Inteligência NOX
          </h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono text-xs">
          <HelpCircle className="w-8 h-8 text-slate-600 mb-2" />
          <p className="font-semibold text-slate-400">Nenhum atendimento selecionado</p>
          <p className="text-[11px] text-slate-500 max-w-xs mt-1">
            Selecione uma conversa na fila para carregar o contexto de inteligência e dados
            processuais.
          </p>
        </div>
      </div>
    )
  }

  const { participant, linkedProcessNumber, priority, status } = conversation

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#050811] border-l border-slate-800/80 overflow-y-auto p-4 space-y-4 select-none',
        className,
      )}
    >
      {/* Topo do Painel com Assinatura IA NOX */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-300">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Painel de Inteligência
            </h3>
            <div className="text-[9px] font-mono text-purple-400">Oráculo NOX v2.4 (Lote 2)</div>
          </div>
        </div>

        {onCloseMobileDrawer && (
          <button
            onClick={onCloseMobileDrawer}
            className="md:hidden text-xs text-slate-400 hover:text-slate-100"
          >
            Fechar
          </button>
        )}
      </div>

      {/* Tabs Placeholder do Lote 2 */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#080d1a] border border-slate-800 text-[10px] font-mono text-center">
        <button className="py-1 rounded bg-purple-950 text-purple-300 font-semibold border border-purple-800/60">
          INTELIGÊNCIA
        </button>
        <button
          onClick={() =>
            toast.info('Tab Cliente reservada para o Lote 2', {
              description: 'Painel 360 com perfil do cliente, histórico e documentos.',
            })
          }
          className="py-1 rounded text-slate-400 hover:text-slate-200"
        >
          CLIENTE
        </button>
        <button
          onClick={() =>
            toast.info('Tab Processos reservada para o Lote 2', {
              description: 'Vinculação direta com DataJud e Central de Prazos.',
            })
          }
          className="py-1 rounded text-slate-400 hover:text-slate-200"
        >
          PROCESSOS
        </button>
        <button
          onClick={() =>
            toast.info('Tab Histórico reservada para o Lote 2', {
              description: 'Linha do tempo de atendimentos e tickets anteriores.',
            })
          }
          className="py-1 rounded text-slate-400 hover:text-slate-200"
        >
          HISTÓRICO
        </button>
      </div>

      {/* Card de Contexto Rápido do Contato */}
      <NoxCard variant="surface" className="p-3 space-y-2 border-slate-800">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Contato Ativo:</span>
          <span className="font-bold text-slate-200 truncate">{participant.name}</span>
        </div>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Classificação:</span>
          <span className="text-cyan-400 font-semibold">{conversation.isClientLead}</span>
        </div>
        {linkedProcessNumber ? (
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Processo:</span>
            <span className="text-cyan-300 font-mono text-[11px] truncate">
              {linkedProcessNumber}
            </span>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-amber-400/90 bg-amber-950/30 p-1.5 rounded border border-amber-800/40">
            Nenhum processo vinculado ainda.
          </div>
        )}
      </NoxCard>

      {/* Alerta de Triagem IA: Oráculo NOX */}
      <div className="p-3 rounded-lg bg-gradient-to-br from-purple-950/40 via-[#100d1e] to-[#0b1222] border border-purple-700/50 space-y-2 shadow-md">
        <div className="flex items-center gap-1.5 text-purple-300 font-mono text-xs font-bold uppercase">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Triagem Cognitiva Prévia</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {conversation.id === 'conv_maria_silva'
            ? 'Intimação recebida via mensagem. Risco preclusivo detectado: Mandado de citação requer contestação em 15 dias úteis (CPC, art. 335).'
            : 'Atendimento operacional em andamento. Aguardando interação humana para consolidação de estratégia.'}
        </p>

        <div className="pt-2 border-t border-purple-800/40 flex items-center justify-between text-[10px] font-mono text-purple-300">
          <span>Confiança: 96%</span>
          <span className="text-slate-400">Lote 2: Painel Completo</span>
        </div>
      </div>

      {/* Ações Estruturais Reservadas */}
      <div className="space-y-1.5 pt-2">
        <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold px-1">
          Integrações Operacionais (Lote 2)
        </div>
        <button
          onClick={() =>
            toast.info('Integração com Produção de Peças', {
              description: 'Criará card diretamente na esteira de peticionamento no Lote 2.',
            })
          }
          className="w-full text-left p-2.5 rounded-lg bg-[#080e1b] hover:bg-[#0c1426] border border-slate-800 text-xs font-sans text-slate-300 flex items-center justify-between group transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Enviar para Produção de Peças</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
        </button>

        <button
          onClick={() =>
            toast.info('Integração com Compromissos', {
              description: 'Vinculará ao calendário e audiências no Lote 2.',
            })
          }
          className="w-full text-left p-2.5 rounded-lg bg-[#080e1b] hover:bg-[#0c1426] border border-slate-800 text-xs font-sans text-slate-300 flex items-center justify-between group transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Agendar Prazo Fatal / Audiência</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
        </button>
      </div>
    </div>
  )
}
