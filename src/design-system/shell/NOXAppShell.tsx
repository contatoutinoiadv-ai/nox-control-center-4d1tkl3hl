import React, { useState } from 'react'
import { NoxSidebar, NoxNavItem } from './NoxSidebar'
import { NoxTopbar } from './NoxTopbar'
import { AuthMeResponse } from '@/types/nox'
import { Menu, X, Search, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface NOXAppShellProps {
  children: React.ReactNode
  navItems: NoxNavItem[]
  userProfile: AuthMeResponse | null
  onLogout: () => void
  loggingOut?: boolean
  onOpenCommandPalette: () => void
  onOpenNotifications?: () => void
  onSyncSentinela?: () => void
  banner?: React.ReactNode
  activeBatchName?: string
  isRealData?: boolean
  totalMonitored?: number
  criticalAlertsCount?: number
  inReviewRecordsCount?: number
}

export const NOXAppShell: React.FC<NOXAppShellProps> = ({
  children,
  navItems,
  userProfile,
  onLogout,
  loggingOut = false,
  onOpenCommandPalette,
  onOpenNotifications,
  onSyncSentinela,
  banner,
  activeBatchName,
  isRealData = false,
  totalMonitored = 0,
  criticalAlertsCount = 0,
  inReviewRecordsCount = 0,
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Sidebar Oficial Desktop */}
      <NoxSidebar
        items={navItems}
        userProfile={userProfile}
        onLogout={onLogout}
        loggingOut={loggingOut}
        onSyncSentinela={onSyncSentinela}
        sentinelaBatchName={activeBatchName}
        isRealData={isRealData}
        totalMonitored={totalMonitored}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />

      {/* Top Header Mobile */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-[#070c18] border-b border-slate-800 z-30 select-none">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-xs shadow-md">
            NOX
          </div>
          <span className="font-bold text-sm text-slate-100">NOX CONTROL CENTER</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCommandPalette}
            className="text-slate-400 hover:text-cyan-400 p-2"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-300 p-2"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Menu Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 bg-slate-950/95 backdrop-blur-xl z-40 p-4 overflow-y-auto space-y-2 border-t border-slate-800">
          <div className="p-3 bg-[#0b1222] rounded-lg border border-slate-800 mb-3 font-mono text-xs">
            <div className="text-emerald-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sentinela NOX Conectado (CSV)
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {totalMonitored} monitorados | {criticalAlertsCount} críticos
            </div>
          </div>
          {navItems.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center justify-between p-3 rounded-lg text-sm font-medium
                  ${
                    isActive
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-900'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{link.name}</span>
                </div>
                {link.badge !== null && link.badge !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    {link.badge}
                  </Badge>
                )}
              </NavLink>
            )
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="w-full bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair do Sistema
            </Button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-b from-[#060a14] via-[#040710] to-[#02050b]">
        {/* Banner de Migração ou Alerta Global */}
        {banner}

        {/* Topbar Padrão Comum */}
        <NoxTopbar
          onOpenCommandPalette={onOpenCommandPalette}
          onOpenNotifications={onOpenNotifications}
          activeBatchName={activeBatchName}
          isRealData={isRealData}
          criticalAlertsCount={criticalAlertsCount}
          inReviewRecordsCount={inReviewRecordsCount}
        />

        {/* Scrollable Viewport Principal */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">{children}</main>
      </div>
    </div>
  )
}
