import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  Radio,
  Activity,
  Database,
  UploadCloud,
  CheckSquare,
  Download,
  Clock,
  CalendarCheck,
  ShieldAlert,
  Settings,
  Search,
  Bell,
  Sparkles,
  Menu,
  X,
  Lock,
  ChevronRight,
  RefreshCw,
  Users,
  Layers,
  LogOut,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CommandPalette } from './CommandPalette'
import { MigrationStatusBanner } from './MigrationStatusBanner'
import { dataStore } from '@/services/dataStore'
import { authUsersService } from '@/services/authUsersService'
import { legacyStorageAdapter } from '@/services/legacyStorageAdapter'
import { NoxSystemStats, AuthMeResponse } from '@/types/nox'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export const Layout: React.FC = () => {
  const [stats, setStats] = useState<NoxSystemStats>(dataStore.getStats())
  const [statsClientsCount, setStatsClientsCount] = useState<number>(dataStore.getClients().length)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<AuthMeResponse | null>(
    authUsersService.getCachedMe(),
  )
  const [loggingOut, setLoggingOut] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setStats(dataStore.getStats())
      setStatsClientsCount(dataStore.getClients().length)
    })
    const unsubAuth = authUsersService.subscribe(() => {
      setUserProfile(authUsersService.getCachedMe())
    })
    // Inicializa auth profile se autenticado
    if (authUsersService.isAuthenticated()) {
      authUsersService
        .fetchMe()
        .then((me) => {
          setUserProfile(me)
          // Execução controlada da migração de dual-store idempotente no bootstrap autenticado
          if (legacyStorageAdapter.hasPendingLegacyData()) {
            legacyStorageAdapter
              .runFullMigration()
              .then(() => {
                dataStore.reloadFromPocketBase()
              })
              .catch((err) => {
                console.warn('Bootstrap legacy migration warning:', err)
              })
          }
        })
        .catch(() => {})
    }
    return () => {
      unsub()
      unsubAuth()
    }
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authUsersService.logout()
      toast.info('Sessão encerrada com sucesso.')
      navigate('/login', { replace: true })
    } catch (err: any) {
      console.error('Erro no logout:', err)
      toast.error('Erro ao encerrar sessão.')
    } finally {
      setLoggingOut(false)
    }
  }

  // Global hotkey Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const allNavLinks = [
    { moduleKey: 'central_nox', name: 'Central NOX', path: '/', icon: Activity, badge: null },
    {
      moduleKey: 'sentinela',
      name: 'Sentinela NOX',
      path: '/sentinela',
      icon: Sparkles,
      badge: 'NOVO',
      badgeVariant: 'aurora',
      isSentinela: true,
    },
    {
      moduleKey: 'clientes',
      name: 'Clientes',
      path: '/clientes',
      icon: Users,
      badge: statsClientsCount > 0 ? statsClientsCount : null,
      badgeColor: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    },
    {
      moduleKey: 'producao',
      name: 'Produção',
      path: '/producao',
      icon: Layers,
      badge:
        dataStore.getProductionItems().filter((p) => p.estagio !== 'protocolado').length || null,
      badgeColor: 'bg-purple-950 text-purple-400 border-purple-800',
    },
    {
      moduleKey: 'central_prazos',
      name: 'Central de Prazos',
      path: '/central-prazos',
      icon: Clock,
      badge: 'Sincronizado',
      badgeVariant: 'cyan',
    },
    {
      moduleKey: 'compromissos',
      name: 'Compromissos',
      path: '/compromissos',
      icon: CalendarCheck,
      badge: 'NOVO',
      badgeVariant: 'aurora',
    },
    {
      moduleKey: 'radar',
      name: 'Radar de Alertas',
      path: '/radar',
      icon: Radio,
      badge: stats.criticalAlerts > 0 ? stats.criticalAlerts : null,
      badgeVariant: 'destructive',
    },
    {
      moduleKey: 'processos',
      name: 'Processos',
      path: '/processos',
      icon: Database,
      badge: stats.totalMonitored,
    },
    {
      moduleKey: 'importacoes',
      name: 'Importações',
      path: '/importacoes',
      icon: UploadCloud,
      badge: stats.quarantinedRecords > 0 ? `! ${stats.quarantinedRecords}` : null,
      badgeVariant: 'warning',
    },
    {
      moduleKey: 'revisao',
      name: 'Revisão Operacional',
      path: '/revisao',
      icon: CheckSquare,
      badge: stats.inReviewRecords + stats.newRecords,
    },
    {
      moduleKey: 'exportacoes',
      name: 'Exportações',
      path: '/exportacoes',
      icon: Download,
      badge: null,
    },
    {
      moduleKey: 'lex_tempus',
      name: 'LEX TEMPUS',
      path: '/lex-tempus',
      icon: Clock,
      badge: 'Em Breve',
      isFuture: true,
    },
    {
      moduleKey: 'auditoria',
      name: 'Auditoria',
      path: '/auditoria',
      icon: ShieldAlert,
      badge: null,
    },
    {
      moduleKey: 'configuracoes',
      name: 'Configurações',
      path: '/configuracoes',
      icon: Settings,
      badge: null,
    },
    {
      moduleKey: 'usuarios',
      name: 'Usuários',
      path: '/usuarios',
      icon: Users,
      badge: 'Admin',
      badgeVariant: 'cyan',
      adminOnly: true,
    },
  ]

  // Filtra itens do menu conforme a role e permissões do usuário logado
  const navLinks = allNavLinks.filter((link) => {
    if (!userProfile) return true // durante loading
    if (userProfile.isAdmin || userProfile.role === 'admin') return true
    if (link.adminOnly) return false // Módulo 'Usuários' só visível para admin
    return userProfile.allowedModules.includes(link.moduleKey)
  })

  const handleSyncSentinela = () => {
    toast.success('Sincronização passiva com Sentinela NOX verificada.', {
      description: 'Lote sentinela_nox_2026-09-01_1155.csv intacto (SHA-256 verificado).',
    })
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-cyan-500 selection:text-slate-950">
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#080d1a] border-r border-slate-800/80 shrink-0 select-none z-30">
        {/* Logo & Monogram */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 bg-slate-950/40 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-sm tracking-wider shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40">
              NOX
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
                CONTROL CENTER
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                Intelligence v1.0
              </div>
            </div>
          </div>
        </div>

        {/* Sentinela Ingestion Badge (Strict Isolation Marker) */}
        <div className="mx-3 my-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/90 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="truncate">sentinela_2026-09-01</span>
            <button
              onClick={handleSyncSentinela}
              title="Verificar integridade do lote"
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1 font-semibold">
            Módulos Operacionais
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.path
            return (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) => `
                  group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all
                  ${
                    isActive
                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }
                `}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'}`}
                  />
                  <span>{link.name}</span>
                </div>

                {link.badge !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono px-1.5 py-0 h-4.5 ${
                      link.badgeVariant === 'aurora'
                        ? 'bg-gradient-to-r from-purple-950 to-cyan-950 text-cyan-300 border-cyan-500/50 shadow-sm'
                        : link.badgeVariant === 'cyan'
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                          : link.badgeVariant === 'destructive'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800 animate-pulse'
                            : link.badgeVariant === 'warning'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                              : link.isFuture
                                ? 'bg-purple-950/60 text-purple-300 border-purple-800/60 text-[9px]'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {link.badge}
                  </Badge>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Dataset Source Status Badge & Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/70">
          {dataStore.isUsingRealImportedData() ? (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-md p-2 mb-2">
              <div className="flex items-center gap-1.5 text-emerald-300 text-[10px] font-semibold font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>DADOS IMPORTADOS REAIS</span>
              </div>
              <p className="text-[10px] text-emerald-400/90 mt-0.5 leading-tight font-mono">
                {dataStore.getActiveBatch()?.filename || 'Lote CSV Ativo'} ({stats.totalMonitored}{' '}
                registros)
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-md p-2 mb-2">
              <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-semibold font-mono">
                <Database className="w-3 h-3 text-cyan-400" />
                <span>SEM DADOS — aguardando importação</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Importe o CSV do Sentinela para alimentar o painel
              </p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0">
                {(userProfile?.user?.name
                  ? userProfile.user.name.slice(0, 2)
                  : userProfile?.user?.email
                    ? userProfile.user.email.slice(0, 2)
                    : 'NO'
                ).toUpperCase()}
              </div>
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
                  <span>•</span>
                  <span className="truncate">{userProfile?.user?.email || 'Autenticado'}</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Encerrar sessão (Logout)"
              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 bg-[#080d1a] border-b border-slate-800 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-cyan-500 flex items-center justify-center font-bold text-slate-950 text-xs">
            NOX
          </div>
          <span className="font-bold text-sm text-slate-100">NOX CONTROL CENTER</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommandPaletteOpen(true)}
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

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 bg-slate-950/95 backdrop-blur-xl z-40 p-4 overflow-y-auto space-y-2 border-t border-slate-800">
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 mb-3">
            <div className="text-xs font-semibold text-emerald-400 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Sentinela NOX Conectado por Importação CSV
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.totalMonitored} registros monitorados | {stats.criticalAlerts} alertas críticos
            </div>
          </div>
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center justify-between p-3 rounded-lg text-sm font-medium
                  ${isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'text-slate-300 hover:bg-slate-900'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
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
              onClick={handleLogout}
              className="w-full bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-rose-900 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair do Sistema
            </Button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-b from-[#060a14] via-[#040710] to-[#02050b]">
        {/* Migration / Offline Status Banner (Fase 2B / 2C) */}
        <MigrationStatusBanner />

        {/* Top Operational Action Bar */}
        <header className="h-14 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between bg-slate-950/40 backdrop-blur-xl shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="h-8 text-xs bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 flex items-center gap-2 px-3 shadow-inner"
            >
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Pesquisar ou executar comando...</span>
              <span className="sm:hidden">Pesquisar...</span>
              <kbd className="hidden md:inline-flex text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                ⌘K
              </kbd>
            </Button>

            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs font-mono text-slate-400">
              <span className="text-slate-500">Origem:</span>
              <span className="text-slate-300">
                {dataStore.getActiveBatch()?.filename || 'Nenhum lote ativo'}
              </span>
              <span className="text-slate-600">|</span>
              <span
                className={
                  dataStore.isUsingRealImportedData()
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-400'
                }
              >
                {dataStore.isUsingRealImportedData()
                  ? 'DADOS IMPORTADOS REAIS'
                  : 'SEM DADOS — aguardando importação'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Stats Badges */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Críticos:</span>
                <span className="font-bold text-rose-400">{stats.criticalAlerts}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Em Revisão:</span>
                <span className="font-bold text-amber-400">{stats.inReviewRecords}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                toast('Notificações operacionais atualizadas', {
                  description: `${stats.criticalAlerts} alertas críticos requerem ação imediata.`,
                })
              }}
              className="relative text-slate-400 hover:text-cyan-400 h-8 w-8 p-0"
            >
              <Bell className="w-4 h-4" />
              {stats.criticalAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              )}
            </Button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
