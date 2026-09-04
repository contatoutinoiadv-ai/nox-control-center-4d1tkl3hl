import React, { useState, useEffect } from 'react'
import {
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  XCircle,
  WifiOff,
  Layers,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { legacyStorageAdapter, LegacyMigrationStatus } from '@/services/legacyStorageAdapter'
import { dataStore } from '@/services/dataStore'

export const MigrationStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<LegacyMigrationStatus>(legacyStorageAdapter.getStatus())
  const [modalOpen, setModalOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [syncState, setSyncState] = useState(dataStore.getSyncStatus())

  useEffect(() => {
    const unsubAdapter = legacyStorageAdapter.subscribe((s) => setStatus(s))
    const unsubStore = dataStore.subscribe(() => setSyncState(dataStore.getSyncStatus()))

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      unsubAdapter()
      unsubStore()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleManualMigrate = async () => {
    await legacyStorageAdapter.runFullMigration()
    await dataStore.reloadFromPocketBase()
  }

  const handleRetrySync = async () => {
    await dataStore.reloadFromPocketBase()
  }

  // 1. Indicação de Offline ou Erro de Sincronização do Servidor
  if (isOffline || syncState.isOffline || syncState.syncError) {
    return (
      <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 text-xs text-amber-200 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Modo Offline / Servidor Indisponível:</strong> Alterações locais serão
            sincronizadas assim que a conexão com o PocketBase for restabelecida. Nunca presuma
            salvamento sem confirmação do servidor.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetrySync}
          disabled={syncState.isSyncing}
          className="h-7 text-xs border-amber-700 bg-amber-900/60 text-amber-200 hover:bg-amber-800"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
          Tentar Novamente
        </Button>
      </div>
    )
  }

  // 2. Banner de Migração em Andamento
  if (status.isMigrating) {
    return (
      <div className="bg-cyan-950/80 border-b border-cyan-800/80 px-4 py-2 text-xs text-cyan-200 flex items-center justify-between z-20 animate-pulse">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
          <span>
            <strong>Migração de Dual-Store em Andamento:</strong> Consolidando Clientes, Agenda e
            Produção como PocketBase Source of Truth...
          </span>
        </div>
        <Badge variant="outline" className="border-cyan-500/50 text-cyan-300 font-mono text-[10px]">
          SSE ATIVO
        </Badge>
      </div>
    )
  }

  // 3. Banner de Conflitos Detectados
  if (status.unresolvedConflicts.length > 0) {
    return (
      <>
        <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 py-2 text-xs text-rose-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>
                Atenção ({status.unresolvedConflicts.length} Conflito(s) Detectado(s)):
              </strong>{' '}
              Registros com divergência entre Servidor e Local foram preservados para auditoria sem
              perda de dados.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalOpen(true)}
              className="h-7 text-xs border-rose-700 bg-rose-900/60 text-rose-200 hover:bg-rose-800"
            >
              Revisar Conflitos
            </Button>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                Conflitos de Migração Local vs PocketBase
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                O PocketBase é a Fonte Única de Verdade oficial. Registros conflitantes não foram
                descartados silenciosamente nem sobrescreveram o servidor de forma arbitrária.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              {status.unresolvedConflicts.map((c, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-950 rounded border border-rose-950/60 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-mono font-semibold text-rose-300">
                    <span>Domínio: {c.domain}</span>
                    <span>Ref: {c.key}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{c.reason}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Registrado em: {new Date(c.timestamp).toLocaleString('pt-BR')} (Auditado sob
                    LEGACY_DATA_CONFLICT)
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // 4. Banner discreto quando há dados legados detectados mas ainda não migrados
  if (legacyStorageAdapter.hasPendingLegacyData()) {
    return (
      <div className="bg-slate-900/90 border-b border-cyan-900/50 px-4 py-1.5 text-xs text-slate-300 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Dados legados detectados no armazenamento local. Deseja consolidar no PocketBase agora?
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleManualMigrate}
          className="h-6 text-[11px] bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold"
        >
          Sincronizar com PocketBase
        </Button>
      </div>
    )
  }

  return null
}
