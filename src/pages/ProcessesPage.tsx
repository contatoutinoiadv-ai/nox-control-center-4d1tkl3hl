import React, { useState, useEffect, useMemo } from 'react'
import {
  Database,
  Table as TableIcon,
  LayoutGrid,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { dataStore } from '@/services/dataStore'
import { NoxRecord, RecordStatus } from '@/types/nox'
import { ProcessDetailDrawer } from '@/components/ProcessDetailDrawer'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { datajudService, MovimentacaoProcesso } from '@/services/datajudService'
import {
  NoxPageHeader,
  NoxCard,
  NoxButton,
  NoxStatusBadge,
  NoxSearchInput,
  NoxEmptyState,
  NoxMono,
} from '@/design-system'

export const ProcessesPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [records, setRecords] = useState<NoxRecord[]>(dataStore.getRecords())
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [selectedRecord, setSelectedRecord] = useState<NoxRecord | null>(null)
  const [movimentacoesDatajud, setMovimentacoesDatajud] = useState<MovimentacaoProcesso[]>([])

  useEffect(() => {
    datajudService.getMovimentacoes().then((movs) => {
      setMovimentacoesDatajud(movs)
    })
  }, [])

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedTribunal, setSelectedTribunal] = useState<string>('all')
  const [selectedResponsible, setSelectedResponsible] = useState<string>('all')
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12

  // Initial deep link selection
  useEffect(() => {
    const selectedId = searchParams.get('selected')
    if (selectedId) {
      const found = records.find((r) => r.id === selectedId || r.recordCode === selectedId)
      if (found) setSelectedRecord(found)
    }
  }, [searchParams, records])

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setRecords(dataStore.getRecords())
    })
    return unsub
  }, [])

  // Filter options
  const tribunals = useMemo(
    () => Array.from(new Set(records.map((r) => r.tribunal))).sort(),
    [records],
  )
  const responsibles = useMemo(
    () => Array.from(new Set(records.map((r) => r.responsible))).sort(),
    [records],
  )

  // Filtered and Sorted Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false
      if (selectedSeverity !== 'all' && r.severity !== selectedSeverity) return false
      if (selectedTribunal !== 'all' && r.tribunal !== selectedTribunal) return false
      if (selectedResponsible !== 'all' && r.responsible !== selectedResponsible) return false
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase()
        return (
          r.recordCode.toLowerCase().includes(q) ||
          r.numeroProcesso.toLowerCase().includes(q) ||
          r.partes.toLowerCase().includes(q) ||
          r.tribunal.toLowerCase().includes(q) ||
          r.alertTitle.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [
    records,
    selectedStatus,
    selectedSeverity,
    selectedTribunal,
    selectedResponsible,
    searchQuery,
  ])

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage])

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRecords.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedRecords.map((r) => r.id)))
    }
  }

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleBatchStatusUpdate = (newStatus: RecordStatus) => {
    if (selectedIds.size === 0) return
    selectedIds.forEach((id) => {
      dataStore.updateRecordStatus(id, newStatus, 'Operador NOX (Ação em Lote)')
    })
    toast.success(`Status de ${selectedIds.size} processos atualizado para "${newStatus}".`)
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Detail Drawer */}
      {selectedRecord && (
        <ProcessDetailDrawer
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdateRecord={(updated) => {
            setSelectedRecord(updated)
            setRecords(dataStore.getRecords())
          }}
        />
      )}

      {/* Top Header com NoxPageHeader */}
      <NoxPageHeader
        title="Processos & Registros"
        description="Visualizador operacional de alta precisão: isolamento de dados do Sentinela, inspeção atômica e metadados de custódia preservados."
        icon={Database}
        badge={
          <div className="flex items-center gap-2">
            <NoxStatusBadge
              status="PROCESSADO"
              customLabel={`${filteredRecords.length} encontrados`}
              size="sm"
            />
            {dataStore.isUsingRealImportedData() ? (
              <NoxStatusBadge
                status="RESOLVIDO"
                customLabel={`DADOS IMPORTADOS REAIS (${records.length})`}
                size="sm"
                showDot
              />
            ) : (
              <NoxStatusBadge
                status="RASCUNHO"
                customLabel={`SEM DADOS (${records.length})`}
                size="sm"
              />
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <NoxButton
              variant={filterDrawerOpen ? 'primary' : 'secondary'}
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
            >
              Filtros Avançados
            </NoxButton>

            <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`h-7 px-2.5 text-xs rounded transition-colors ${viewMode === 'table' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                title="Visualização em Tabela"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`h-7 px-2.5 text-xs rounded transition-colors ${viewMode === 'cards' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        }
      />

      {/* Collapsible Advanced Filter Panel */}
      {filterDrawerOpen && (
        <div className="nox-glass-card rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs animate-in slide-in-from-top-2 duration-200">
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todos os Status</option>
              <option value="novo">Novo</option>
              <option value="em_revisao">Em Revisão</option>
              <option value="processado">Processado</option>
              <option value="quarentena">Quarentena</option>
              <option value="resolvido">Resolvido</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
              Severidade
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => {
                setSelectedSeverity(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas as Severidades</option>
              <option value="critico">Crítico</option>
              <option value="alto">Alto</option>
              <option value="medio">Médio</option>
              <option value="informativo">Informativo</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
              Tribunal
            </label>
            <select
              value={selectedTribunal}
              onChange={(e) => {
                setSelectedTribunal(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todos os Tribunais</option>
              {tribunals.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
              Responsável
            </label>
            <select
              value={selectedResponsible}
              onChange={(e) => {
                setSelectedResponsible(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todos os Responsáveis</option>
              {responsibles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Search and Batch Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <NoxSearchInput
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Filtrar por código, CNJ, partes, assunto ou tag..."
          />
        </div>

        {/* Batch action buttons if items selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-[#0b1222] border border-cyan-500/40 px-3 py-1.5 rounded-lg text-xs font-mono animate-in fade-in">
            <span className="text-cyan-300 font-bold">{selectedIds.size} selecionados:</span>
            <NoxButton
              size="sm"
              variant="secondary"
              onClick={() => handleBatchStatusUpdate('em_revisao')}
              className="h-7 text-[11px] px-2 text-amber-300"
            >
              Marcar Em Revisão
            </NoxButton>
            <NoxButton
              size="sm"
              variant="primary"
              onClick={() => handleBatchStatusUpdate('resolvido')}
              className="h-7 text-[11px] px-2 text-emerald-950"
            >
              Resolver
            </NoxButton>
          </div>
        )}
      </div>

      {/* Main Table or Cards */}
      {viewMode === 'table' ? (
        <NoxCard variant="surface" className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#080d1a] text-slate-400 font-mono text-[10px] uppercase tracking-wider font-bold">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === paginatedRecords.length && paginatedRecords.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                    />
                  </th>
                  <th className="p-3">Código / CNJ</th>
                  <th className="p-3">Tribunal / Vara</th>
                  <th className="p-3">Partes / Assunto</th>
                  <th className="p-3">Severidade</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8">
                      <NoxEmptyState
                        icon={Database}
                        title="Nenhum processo encontrado"
                        description="Não há registros correspondentes aos filtros aplicados nesta consulta."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((rec) => {
                    const isSelected = selectedIds.has(rec.id)
                    return (
                      <tr
                        key={rec.id}
                        className={`hover:bg-slate-900/80 transition-colors group ${
                          isSelected ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(rec.id)}
                            className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                          />
                        </td>
                        <td className="p-3 font-mono">
                          <div className="font-bold text-cyan-300 group-hover:text-cyan-200">
                            {rec.recordCode}
                          </div>
                          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                            <NoxMono>{rec.numeroProcesso}</NoxMono>
                            {movimentacoesDatajud.some(
                              (m) => m.numero_processo === rec.numeroProcesso,
                            ) && <NoxStatusBadge status="SYNC" customLabel="DATAJUD" size="sm" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <NoxStatusBadge status="RASCUNHO" customLabel={rec.tribunal} size="sm" />
                          <div className="text-slate-400 text-[11px] truncate max-w-[140px] mt-0.5">
                            {rec.orgaoJulgador}
                          </div>
                        </td>
                        <td className="p-3 max-w-xs">
                          <div className="text-slate-200 font-medium truncate">{rec.partes}</div>
                          <div className="text-slate-400 text-[11px] truncate mt-0.5">
                            {rec.assunto}
                          </div>
                        </td>
                        <td className="p-3">
                          <NoxStatusBadge
                            status={
                              rec.severity === 'critico'
                                ? 'BLOQUEADO'
                                : rec.severity === 'alto'
                                  ? 'PENDENTE'
                                  : 'RASCUNHO'
                            }
                            customLabel={rec.severity}
                            size="sm"
                          />
                        </td>
                        <td className="p-3">
                          <NoxStatusBadge
                            status={
                              rec.status === 'resolvido'
                                ? 'RESOLVIDO'
                                : rec.status === 'em_revisao'
                                  ? 'PENDENTE'
                                  : rec.status === 'quarentena'
                                    ? 'BLOQUEADO'
                                    : 'RASCUNHO'
                            }
                            customLabel={rec.status}
                            size="sm"
                          />
                        </td>
                        <td className="p-3 text-slate-300 font-mono text-[11px]">
                          {rec.responsible}
                        </td>
                        <td className="p-3 text-right">
                          <NoxButton
                            size="sm"
                            variant="ghost"
                            icon={Eye}
                            onClick={() => setSelectedRecord(rec)}
                            className="h-7 px-2.5 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-slate-800"
                          >
                            Detalhes
                          </NoxButton>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </NoxCard>
      ) : (
        /* Cards View com NoxCard */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedRecords.map((rec) => (
            <NoxCard
              key={rec.id}
              variant="glass"
              interactive
              onClick={() => setSelectedRecord(rec)}
              className="p-4 space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <NoxMono className="font-bold text-cyan-300 text-xs">{rec.recordCode}</NoxMono>
                  <NoxStatusBadge status="RASCUNHO" customLabel={rec.tribunal} size="sm" />
                </div>
                <NoxStatusBadge
                  status={
                    rec.severity === 'critico'
                      ? 'BLOQUEADO'
                      : rec.severity === 'alto'
                        ? 'PENDENTE'
                        : 'RASCUNHO'
                  }
                  customLabel={rec.severity}
                  size="sm"
                />
              </div>

              <div>
                <NoxMono className="text-xs text-slate-400 truncate block">
                  {rec.numeroProcesso}
                </NoxMono>
                <div className="text-xs font-semibold text-slate-200 line-clamp-1 mt-1 group-hover:text-cyan-200">
                  {rec.partes}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{rec.alertTitle}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{rec.responsible.split(' ')[1] || rec.responsible}</span>
                <span className="text-cyan-400 font-semibold">Inspecionar →</span>
              </div>
            </NoxCard>
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80">
        <div>
          Página {currentPage} de {totalPages} ({filteredRecords.length} registros no total)
        </div>

        <div className="flex items-center gap-1.5">
          <NoxButton
            size="sm"
            variant="secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
          </NoxButton>
          <NoxButton
            size="sm"
            variant="secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300"
          >
            Próxima <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </NoxButton>
        </div>
      </div>
    </div>
  )
}

export default ProcessesPage
