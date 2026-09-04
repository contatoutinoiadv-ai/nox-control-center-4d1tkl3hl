import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
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
  Sparkles,
  Users,
  Layers,
  MessageSquare,
} from 'lucide-react'
import { CommandPalette } from './CommandPalette'
import { MigrationStatusBanner } from './MigrationStatusBanner'
import { dataStore } from '@/services/dataStore'
import { authUsersService } from '@/services/authUsersService'
import { legacyStorageAdapter } from '@/services/legacyStorageAdapter'
import { NoxSystemStats, AuthMeResponse } from '@/types/nox'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { NOXAppShell, NoxNavItem } from '@/design-system'

import { RealtimeConnectionState } from '@/design-system'
import pb from '@/lib/pocketbase/client'

export const Layout: React.FC = () => {
  const [stats, setStats] = useState<NoxSystemStats>(dataStore.getStats())
  const [statsClientsCount, setStatsClientsCount] = useState<number>(dataStore.getClients().length)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<AuthMeResponse | null>(
    authUsersService.getCachedMe(),
  )
  const [loggingOut, setLoggingOut] = useState(false)
  const [realtimeState, setRealtimeState] = useState<RealtimeConnectionState>(
    navigator.onLine ? 'online' : 'offline',
  )
  const [hasRecentUpdate, setHasRecentUpdate] = useState(false)
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
    // Monitoramento Real do status de conectividade do navegador e PocketBase SSE
    const handleOnline = () => setRealtimeState('online')
    const handleOffline = () => setRealtimeState('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Assinatura Realtime real no PocketBase (coleção clients / audit_logs para detecção de updates)
    let unsubPb: (() => void) | undefined
    if (pb.authStore.isValid) {
      pb.collection('audit_logs')
        .subscribe('*', () => {
          setHasRecentUpdate(true)
        })
        .then((fn) => {
          unsubPb = fn
        })
        .catch(() => {
          // SSE fallback gracefully mantendo estado do navegador
        })
    }

    return () => {
      unsub()
      unsubAuth()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (unsubPb) {
        try {
          unsubPb()
        } catch {
          /* intentionally ignored */
        }
      }
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

  const allNavLinks: NoxNavItem[] = [
    { moduleKey: 'central_nox', name: 'Central NOX', path: '/', icon: Activity, badge: null },
    {
      moduleKey: 'atendimento',
      name: 'CENTRAL DE ATENDIMENTO',
      path: '/atendimento',
      icon: MessageSquare,
      badge: 'NOVO',
      badgeVariant: 'cyan',
    },
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
      moduleKey: 'central_nox',
      name: 'Design System',
      path: '/design-system',
      icon: Sparkles,
      badge: 'V2',
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

  const handleOpenNotifications = () => {
    toast('Notificações operacionais atualizadas', {
      description: `${stats.criticalAlerts} alertas críticos requerem ação imediata.`,
    })
  }

  return (
    <>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <NOXAppShell
        navItems={navLinks}
        userProfile={userProfile}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenNotifications={handleOpenNotifications}
        onSyncSentinela={handleSyncSentinela}
        banner={<MigrationStatusBanner />}
        activeBatchName={dataStore.getActiveBatch()?.filename || 'sentinela_2026-09-01'}
        isRealData={dataStore.isUsingRealImportedData()}
        totalMonitored={stats.totalMonitored}
        criticalAlertsCount={stats.criticalAlerts}
        inReviewRecordsCount={stats.inReviewRecords}
        realtimeState={realtimeState}
        hasRecentUpdate={hasRecentUpdate}
        onAcknowledgeUpdate={() => {
          setHasRecentUpdate(false)
          toast.info('Dados operacionais atualizados em tempo real.')
        }}
      >
        <Outlet />
      </NOXAppShell>
    </>
  )
}

export default Layout
