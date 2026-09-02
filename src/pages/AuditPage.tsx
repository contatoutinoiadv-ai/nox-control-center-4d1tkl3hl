import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldAlert,
  Search,
  Filter,
  Layers,
  Download,
  Calendar,
  User,
  Terminal,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { dataStore } from '@/services/dataStore'
import { AuditLogEntry } from '@/types/nox'
import { toast } from 'sonner'

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(dataStore.getAuditLogs())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedActor, setSelectedActor] = useState<string>('all')

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setLogs(dataStore.getAuditLogs())
    })
    return unsub
  }, [])

  const actors = useMemo(() => Array.from(new Set(logs.map((l) => l.actor))).sort(), [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (selectedCategory !== 'all' && l.category !== selectedCategory) return false
      if (selectedActor !== 'all' && l.actor !== selectedActor) return false
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase()
        return (
          l.action.toLowerCase().includes(q) ||
          l.actor.toLowerCase().includes(q) ||
          (l.targetId && l.targetId.toLowerCase().includes(q)) ||
          JSON.stringify(l.details).toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, selectedCategory, selectedActor, searchQuery])

  const handleExportAuditLog = () => {
    const jsonStr = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nox_audit_log_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Log de auditoria exportado.')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-cyan-400" />
              Trilha de Auditoria & Observabilidade
            </h1>
            <Badge className="bg-cyan-950 text-cyan-400 border-cyan-800 font-mono text-xs">
              Append-Only Imutável
            </Badge>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Registro cronológico e detalhado de todas as ações de importação, triagem, alterações de
            status e exportações.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAuditLog}
          className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-200 hover:text-cyan-300 font-mono"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Exportar Trilha JSON
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="nox-glass-card rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em ações, autores, alvos..."
              className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas as Categorias</option>
            <option value="importacao">Importação de CSV</option>
            <option value="revisao">Revisão Operacional</option>
            <option value="exportacao">Exportação de Dados</option>
            <option value="sistema">Eventos do Sistema</option>
            <option value="configuracao">Configurações</option>
          </select>

          <select
            value={selectedActor}
            onChange={(e) => setSelectedActor(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos os Atores</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>Eventos Registrados:</span>
          <span className="text-cyan-400 font-bold">{filteredLogs.length}</span>
        </div>
      </div>

      {/* Logs Timeline Table */}
      <div className="nox-glass-card rounded-2xl overflow-hidden border border-slate-800">
        <div className="divide-y divide-slate-800/80">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              Nenhum evento registrado encontrado para os filtros atuais.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-900/40 transition-colors text-xs space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.category === 'importacao'
                          ? 'bg-cyan-400'
                          : log.category === 'revisao'
                            ? 'bg-amber-400'
                            : log.category === 'exportacao'
                              ? 'bg-emerald-400'
                              : 'bg-purple-400'
                      }`}
                    />
                    <span className="font-mono font-bold text-white text-xs">{log.action}</span>
                    <Badge className="text-[10px] uppercase font-mono px-1.5 py-0 bg-slate-800 text-slate-300">
                      {log.category}
                    </Badge>
                    {log.targetId && (
                      <span className="font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50 text-[10px]">
                        Alvo: {log.targetId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                    <span>
                      Ator: <strong className="text-slate-300">{log.actor}</strong>
                    </span>
                    <span>• {new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {/* Metadata JSON Box */}
                {Object.keys(log.details).length > 0 && (
                  <pre className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditPage
