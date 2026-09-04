import React from 'react'
import { Search, Bell, Radio, Database, ShieldCheck, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface NoxTopbarProps {
  onOpenCommandPalette: () => void
  onOpenNotifications?: () => void
  activeBatchName?: string
  isRealData?: boolean
  criticalAlertsCount?: number
  inReviewRecordsCount?: number
  className?: string
}

export const NoxTopbar: React.FC<NoxTopbarProps> = ({
  onOpenCommandPalette,
  onOpenNotifications,
  activeBatchName = 'Nenhum lote ativo',
  isRealData = false,
  criticalAlertsCount = 0,
  inReviewRecordsCount = 0,
  className,
}) => {
  return (
    <header
      className={cn(
        'h-14 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between bg-[#050811]/70 backdrop-blur-xl shrink-0 z-10 select-none',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {/* Global Search / Command Action Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenCommandPalette}
          className="h-8 text-xs bg-[#0b1222] border-slate-700/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 flex items-center gap-2 px-3 shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Pesquisar ou executar comando...</span>
          <span className="sm:hidden">Pesquisar...</span>
          <kbd className="hidden md:inline-flex text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
            ⌘K
          </kbd>
        </Button>

        {/* Operational Context & Source Indicator */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs font-mono text-slate-400">
          <span className="text-slate-500">Origem:</span>
          <span className="text-slate-300 truncate max-w-[200px]" title={activeBatchName}>
            {activeBatchName}
          </span>
          <span className="text-slate-600">|</span>
          <span
            className={cn(
              'font-semibold flex items-center gap-1.5',
              isRealData ? 'text-emerald-400' : 'text-slate-400',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isRealData ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500',
              )}
            />
            {isRealData ? 'DADOS IMPORTADOS REAIS' : 'SEM DADOS — aguardando importação'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status Operacional dos Serviços */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1222] border border-slate-800 text-[11px] font-mono text-slate-300">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>MOTOR NOX:</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>

        {/* Quick Stats Badges */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1222] border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Críticos:</span>
            <span className="font-bold text-rose-400">{criticalAlertsCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1222] border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Em Revisão:</span>
            <span className="font-bold text-amber-400">{inReviewRecordsCount}</span>
          </div>
        </div>

        {/* Operational Bell Notification */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenNotifications}
          className="relative text-slate-400 hover:text-cyan-400 h-8 w-8 p-0"
        >
          <Bell className="w-4 h-4" />
          {criticalAlertsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </Button>
      </div>
    </header>
  )
}
