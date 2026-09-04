import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCw, LogOut, LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuthMeResponse } from '@/types/nox'
import { cn } from '@/lib/utils'

export interface NoxNavItem {
  moduleKey: string
  name: string
  path: string
  icon: LucideIcon
  badge?: string | number | null
  badgeVariant?: 'default' | 'aurora' | 'cyan' | 'destructive' | 'warning'
  badgeColor?: string
  isSentinela?: boolean
  isFuture?: boolean
  adminOnly?: boolean
}

export interface NoxSidebarProps {
  items: NoxNavItem[]
  userProfile: AuthMeResponse | null
  onLogout: () => void
  loggingOut?: boolean
  onSyncSentinela?: () => void
  sentinelaBatchName?: string
  isRealData?: boolean
  totalMonitored?: number
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

export const NoxSidebar: React.FC<NoxSidebarProps> = ({
  items,
  userProfile,
  onLogout,
  loggingOut = false,
  onSyncSentinela,
  sentinelaBatchName = 'sentinela_2026-09-01',
  isRealData = false,
  totalMonitored = 0,
  collapsed = false,
  onToggleCollapse,
  className,
}) => {
  const location = useLocation()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-[#070c18] border-r border-slate-800/80 shrink-0 select-none z-30 transition-all duration-300 relative',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Botão de Toggle de Retração / Expansão */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#0d1527] border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 flex items-center justify-center z-40 shadow-md shadow-black transition-all"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Header com Logotipo e Identidade NOX */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/80 bg-[#050811] justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-sm tracking-wider shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40 shrink-0">
            NOX
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-1.5 truncate">
                <span>CONTROL CENTER</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-semibold truncate">
                Intelligence V2
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sentinela Ingestion Badge (Strict Isolation Marker) */}
      {!collapsed ? (
        <div className="mx-3 my-3 p-2.5 rounded-lg bg-[#0b1222] border border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-mono text-slate-300 font-semibold">
                Sentinela NOX
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[9px] font-mono text-emerald-400 border-emerald-800/60 bg-emerald-950/40 px-1.5 py-0"
            >
              CSV ISOLADO
            </Badge>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-mono">
            <span className="truncate">{sentinelaBatchName}</span>
            {onSyncSentinela && (
              <button
                onClick={onSyncSentinela}
                title="Verificar integridade do lote"
                className="text-slate-400 hover:text-cyan-400 transition-colors p-0.5"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="my-3 flex justify-center" title="Sentinela NOX: CSV Isolado Conectado">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1 font-semibold">
            Módulos Operacionais
          </div>
        )}
        {items.map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.path
          return (
            <NavLink
              key={link.path}
              to={link.path}
              title={collapsed ? link.name : undefined}
              className={({ isActive }) => `
                group flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-lg text-xs font-medium transition-all
                ${
                  isActive
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                {!collapsed && <span className="truncate">{link.name}</span>}
              </div>

              {!collapsed && link.badge !== null && link.badge !== undefined && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0 h-4.5 shrink-0',
                    link.badgeColor,
                    link.badgeVariant === 'aurora' &&
                      'bg-gradient-to-r from-purple-950 to-cyan-950 text-cyan-300 border-cyan-500/50 shadow-sm',
                    link.badgeVariant === 'cyan' && 'bg-cyan-950/80 text-cyan-300 border-cyan-700',
                    link.badgeVariant === 'destructive' &&
                      'bg-rose-950/80 text-rose-300 border-rose-800 animate-pulse',
                    link.badgeVariant === 'warning' &&
                      'bg-amber-950/80 text-amber-300 border-amber-800',
                    link.isFuture &&
                      'bg-purple-950/60 text-purple-300 border-purple-800/60 text-[9px]',
                    !link.badgeVariant &&
                      !link.badgeColor &&
                      'bg-slate-800 text-slate-300 border-slate-700',
                  )}
                >
                  {link.badge}
                </Badge>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Dataset Source Status Badge & Footer */}
      <div className={cn('border-t border-slate-800/80 bg-[#050811]', collapsed ? 'p-2' : 'p-3')}>
        {!collapsed &&
          (isRealData ? (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-md p-2 mb-2">
              <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] font-semibold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">DADOS IMPORTADOS REAIS</span>
              </div>
              <p className="text-[10px] text-emerald-400/90 mt-0.5 leading-tight font-mono truncate">
                {sentinelaBatchName} ({totalMonitored} registros)
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-md p-2 mb-2">
              <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-semibold font-mono">
                <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                <span className="truncate">SEM DADOS — aguardando</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight truncate">
                Importe CSV do Sentinela
              </p>
            </div>
          ))}

        <div
          className={cn(
            'flex items-center text-xs pt-1',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          <div className="flex items-center gap-2 min-w-0 pr-1">
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0">
              {(userProfile?.user?.name
                ? userProfile.user.name.slice(0, 2)
                : userProfile?.user?.email
                  ? userProfile.user.email.slice(0, 2)
                  : 'NO'
              ).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="truncate">
                <div className="text-xs font-medium text-slate-200 truncate">
                  {userProfile?.user?.name || userProfile?.user?.email?.split('@')[0] || 'Usuário'}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate flex items-center gap-1">
                  <span
                    className={
                      userProfile?.role === 'admin'
                        ? 'text-cyan-400 font-semibold'
                        : 'text-purple-400'
                    }
                  >
                    {userProfile?.role === 'admin' ? 'Admin' : 'Operador'}
                  </span>
                  <span>&bull;</span>
                  <span className="truncate">{userProfile?.user?.email || 'Autenticado'}</span>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            disabled={loggingOut}
            title="Encerrar sessão (Logout)"
            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
