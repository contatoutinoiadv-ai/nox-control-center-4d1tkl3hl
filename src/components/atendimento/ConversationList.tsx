import React, { useState } from 'react'
import { ConversationSummary, ConversationFilter } from '@/types/atendimento'
import { ConversationListItem } from './ConversationListItem'
import { NoxSearchInput } from '@/design-system'
import { cn } from '@/lib/utils'
import { Filter, Users, RefreshCw } from 'lucide-react'

export interface ConversationListProps {
  conversations: ConversationSummary[]
  selectedId?: string
  onSelect: (conv: ConversationSummary) => void
  currentFilter: ConversationFilter
  onFilterChange: (filter: ConversationFilter) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  unreadTotal: number
  urgentTotal: number
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  unreadTotal,
  urgentTotal,
  isLoading = false,
  onRefresh,
  className,
}) => {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const FILTERS: Array<{ id: ConversationFilter; label: string; badge?: number }> = [
    { id: 'TODAS', label: 'TODAS' },
    { id: 'NAO_LIDAS', label: 'NÃO LIDAS', badge: unreadTotal },
    { id: 'URGENTES', label: 'URGENTES', badge: urgentTotal },
    { id: 'MINHAS', label: 'MINHAS' },
    { id: 'AGUARDANDO_CLIENTE', label: 'AGUARDANDO CLIENTE' },
    { id: 'AGUARDANDO_ESCRITORIO', label: 'AGUARDANDO ESCRITÓRIO' },
    { id: 'CONCLUIDAS', label: 'CONCLUÍDAS' },
  ]

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#050811] border-r border-slate-800/80 overflow-hidden',
        className,
      )}
    >
      {/* Cabeçalho da Fila com Busca e Ação de Atualizar */}
      <div className="p-3 border-b border-slate-800/80 bg-[#070c18] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Fila de Atendimento
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-slate-400">
              {conversations.length} {conversations.length === 1 ? 'item' : 'itens'}
            </span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                title="Recarregar fila"
                className="p-1 text-slate-400 hover:text-cyan-400 disabled:opacity-50 transition-colors"
              >
                <RefreshCw
                  className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-cyan-400')}
                />
              </button>
            )}
          </div>
        </div>

        {/* Input de Busca integrado do Design System */}
        <NoxSearchInput
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, telefone, processo..."
          className="h-8 text-xs bg-[#09101f]"
        />

        {/* Barra de Filtros Principais — Scroll horizontal ou pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none nox-filter-scroll">
          {FILTERS.map((f) => {
            const isActive = currentFilter === f.id
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={cn(
                  'px-2 py-1 rounded text-[10px] font-mono font-semibold uppercase whitespace-nowrap transition-all flex items-center gap-1 border shrink-0',
                  isActive
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-950'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50',
                )}
              >
                <span>{f.label}</span>
                {f.badge !== undefined && f.badge > 0 && (
                  <span
                    className={cn(
                      'text-[9px] px-1 py-0 rounded-full font-bold',
                      isActive ? 'bg-cyan-400 text-slate-950' : 'bg-slate-700 text-slate-200',
                    )}
                  >
                    {f.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de Conversas com Rolagem Estilizada */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            <span>Carregando atendimentos...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
            <Filter className="w-6 h-6 text-slate-600 mb-1" />
            <span className="font-semibold text-slate-400">Nenhum atendimento na fila</span>
            <p className="text-[11px] text-slate-500 max-w-[200px]">
              Tente alterar os filtros ou o termo de pesquisa.
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
