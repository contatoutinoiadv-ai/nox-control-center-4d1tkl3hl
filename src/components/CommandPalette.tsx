import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  FileText,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  CornerDownLeft,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dataStore } from '@/services/dataStore'
import { NoxRecord } from '@/types/nox'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectRecord?: (record: NoxRecord) => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onSelectRecord,
}) => {
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<NoxRecord[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    setRecords(dataStore.getRecords())
    const unsub = dataStore.subscribe(() => setRecords(dataStore.getRecords()))
    return unsub
  }, [])

  const navItems = [
    { title: 'Central NOX', path: '/', category: 'Navegação' },
    { title: 'Sentinela NOX', path: '/sentinela', category: 'Navegação' },
    { title: 'Clientes (Controladoria Jurídica 360º)', path: '/clientes', category: 'Navegação' },
    { title: 'Produção (Controladoria de Peças)', path: '/producao', category: 'Navegação' },
    { title: 'Central de Prazos', path: '/central-prazos', category: 'Navegação' },
    { title: 'Compromissos & Agenda Autônoma', path: '/compromissos', category: 'Navegação' },
    { title: 'Radar de Alertas', path: '/radar', category: 'Navegação' },
    { title: 'Processos & Registros', path: '/processos', category: 'Navegação' },
    { title: 'Importações de CSV', path: '/importacoes', category: 'Navegação' },
    { title: 'Revisão Operacional', path: '/revisao', category: 'Navegação' },
    { title: 'Exportações', path: '/exportacoes', category: 'Navegação' },
    { title: 'LEX TEMPUS (Módulo Futuro)', path: '/lex-tempus', category: 'Navegação' },
    { title: 'Auditoria de Eventos', path: '/auditoria', category: 'Navegação' },
    { title: 'Configurações', path: '/configuracoes', category: 'Navegação' },
  ]

  const filteredNav = navItems.filter((n) => n.title.toLowerCase().includes(query.toLowerCase()))
  const filteredRecords =
    query.trim().length > 1
      ? records
          .filter(
            (r) =>
              r.recordCode.toLowerCase().includes(query.toLowerCase()) ||
              r.numeroProcesso.toLowerCase().includes(query.toLowerCase()) ||
              r.tribunal.toLowerCase().includes(query.toLowerCase()) ||
              r.partes.toLowerCase().includes(query.toLowerCase()) ||
              r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase())),
          )
          .slice(0, 8)
      : []

  const clients = dataStore.getClients()
  const filteredClients =
    query.trim().length > 1
      ? clients
          .filter(
            (c) =>
              c.nome.toLowerCase().includes(query.toLowerCase()) ||
              c.clientCode.toLowerCase().includes(query.toLowerCase()) ||
              (c.cpf && c.cpf.includes(query)) ||
              (c.telefone && c.telefone.includes(query)) ||
              (c.email && c.email.toLowerCase().includes(query.toLowerCase())),
          )
          .slice(0, 4)
      : []

  const prodItems = dataStore.getProductionItems()
  const filteredProdItems =
    query.trim().length > 1
      ? prodItems
          .filter(
            (p) =>
              p.tituloPeca.toLowerCase().includes(query.toLowerCase()) ||
              (p.clientName && p.clientName.toLowerCase().includes(query.toLowerCase())) ||
              (p.numeroProcesso && p.numeroProcesso.includes(query)) ||
              (p.teseDominante && p.teseDominante.toLowerCase().includes(query.toLowerCase())),
          )
          .slice(0, 4)
      : []
  const handleSelectNav = (path: string) => {
    navigate(path)
    onOpenChange(false)
  }

  const handleSelectRecord = (rec: NoxRecord) => {
    if (onSelectRecord) {
      onSelectRecord(rec)
    } else {
      navigate(`/processos?selected=${rec.id}`)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950/95 border border-slate-800 backdrop-blur-2xl p-0 text-slate-100 shadow-2xl overflow-hidden rounded-xl">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800/80 gap-3 bg-slate-900/40">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar processos, CNJ, partes, tribunais ou páginas (Ctrl+K)..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-slate-100 placeholder:text-slate-500 text-sm h-9 px-0"
            autoFocus
          />
          <Badge
            variant="outline"
            className="text-[10px] text-slate-400 border-slate-700 uppercase font-mono px-1.5 py-0.5"
          >
            ESC
          </Badge>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-2 space-y-4">
          {/* Nav Items */}
          {filteredNav.length > 0 && (
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-500 px-3 py-1 font-semibold">
                Navegação Rápida
              </div>
              <div className="space-y-0.5">
                {filteredNav.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleSelectNav(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-800/80 hover:text-cyan-300 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                      <span>{item.title}</span>
                    </div>
                    <CornerDownLeft className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Production Search Results */}
          {filteredProdItems.length > 0 && (
            <div>
              <div className="text-[11px] font-mono uppercase text-purple-400 px-3 py-1 font-semibold flex items-center justify-between">
                <span>Controladoria de Produção ({filteredProdItems.length})</span>
                <span className="text-purple-400 font-normal">Enter para inspecionar</span>
              </div>
              <div className="space-y-1">
                {filteredProdItems.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => {
                      navigate(`/producao?selected=${prod.id}`)
                      onOpenChange(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-800/90 border border-transparent hover:border-purple-500/30 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Badge
                        className={`text-[9px] font-mono px-1.5 py-0 mt-0.5 ${
                          prod.nivel === 3
                            ? 'bg-pink-950 text-pink-300 border-pink-700'
                            : 'bg-cyan-950 text-cyan-300 border-cyan-700'
                        }`}
                      >
                        NÍVEL {prod.nivel}
                      </Badge>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-200 font-medium truncate">
                            {prod.tituloPeca}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          Cliente: {prod.clientName} &bull; Estágio:{' '}
                          {prod.estagio.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono border-purple-800/60 text-purple-300"
                      >
                        Produção
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clients Search Results */}
          {filteredClients.length > 0 && (
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-500 px-3 py-1 font-semibold flex items-center justify-between">
                <span>Clientes Cadastrados ({filteredClients.length})</span>
                <span className="text-cyan-400 font-normal">Enter para abrir ficha</span>
              </div>
              <div className="space-y-1">
                {filteredClients.map((cli) => (
                  <button
                    key={cli.id}
                    onClick={() => {
                      navigate(`/clientes?selected=${cli.id}`)
                      onOpenChange(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-800/90 border border-transparent hover:border-cyan-500/30 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-1.5 rounded mt-0.5 bg-cyan-500/20 text-cyan-400">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-cyan-300">
                            {cli.clientCode}
                          </span>
                          <span className="text-xs text-slate-200 font-medium truncate">
                            {cli.nome}
                          </span>
                          <Badge className="text-[10px] px-1 py-0 h-4 bg-slate-800 text-slate-300 border-slate-700">
                            {cli.demanda}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {cli.cpf || cli.telefone || cli.email || 'Sem contato'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono border-slate-700 text-slate-300"
                      >
                        {cli.estagio.replace('_', ' ')}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Records Search Results */}
          {filteredRecords.length > 0 && (
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-500 px-3 py-1 font-semibold flex items-center justify-between">
                <span>Registros do Sentinela ({filteredRecords.length})</span>
                <span className="text-cyan-400 font-normal">Enter para abrir</span>
              </div>
              <div className="space-y-1">
                {filteredRecords.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => handleSelectRecord(rec)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-800/90 border border-transparent hover:border-cyan-500/30 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`p-1.5 rounded mt-0.5 ${
                          rec.severity === 'critico'
                            ? 'bg-rose-500/20 text-rose-400'
                            : rec.severity === 'alto'
                              ? 'bg-amber-500/20 text-amber-400'
                              : rec.severity === 'medio'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-cyan-500/20 text-cyan-400'
                        }`}
                      >
                        {rec.severity === 'critico' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-cyan-300">
                            {rec.recordCode}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {rec.numeroProcesso}
                          </span>
                          <Badge className="text-[10px] px-1 py-0 h-4 bg-slate-800 text-slate-300 border-slate-700">
                            {rec.tribunal}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-0.5">{rec.partes}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={`text-[10px] uppercase font-mono ${
                          rec.status === 'quarentena'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : rec.status === 'em_revisao'
                              ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                              : rec.status === 'novo'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {rec.status}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim().length > 1 && filteredNav.length === 0 && filteredRecords.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhum processo ou comando encontrado para &quot;{query}&quot;.
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sentinela NOX Isolation: Preservação de dados ativa</span>
          </div>
          <div>↑↓ navegar • ESC fechar</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
