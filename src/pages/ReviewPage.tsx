import React, { useState, useEffect, useMemo } from 'react'
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Tag,
  Clock,
  MessageSquare,
  ChevronRight,
  Sparkles,
  SkipForward,
  ShieldCheck,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { dataStore } from '@/services/dataStore'
import { NoxRecord, PriorityLevel, RecordStatus } from '@/types/nox'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export const ReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [records, setRecords] = useState<NoxRecord[]>(dataStore.getRecords())
  const [currentIdx, setCurrentIdx] = useState(0)

  // Review Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('pending') // pending = novo, em_revisao, quarentena

  // Form Fields for Current Review
  const [noteText, setNoteText] = useState('')
  const [assignedResponsible, setAssignedResponsible] = useState('')
  const [assignedPriority, setAssignedPriority] = useState<PriorityLevel>('media')
  const [newTagInput, setNewTagInput] = useState('')

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setRecords(dataStore.getRecords())
    })
    return unsub
  }, [])

  // Queue of items requiring review
  const reviewQueue = useMemo(() => {
    return records
      .filter((r) => {
        if (filterStatus === 'pending') {
          if (r.status !== 'novo' && r.status !== 'em_revisao' && r.status !== 'quarentena')
            return false
        } else if (filterStatus !== 'all' && r.status !== filterStatus) {
          return false
        }

        if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false
        return true
      })
      .sort((a, b) => {
        const sevOrder = { critico: 4, alto: 3, medio: 2, informativo: 1 }
        return sevOrder[b.severity] - sevOrder[a.severity]
      })
  }, [records, filterStatus, filterSeverity])

  // Sync initial ID if provided via query param
  useEffect(() => {
    const queryId = searchParams.get('id')
    if (queryId && reviewQueue.length > 0) {
      const idx = reviewQueue.findIndex((r) => r.id === queryId || r.recordCode === queryId)
      if (idx !== -1) setCurrentIdx(idx)
    }
  }, [searchParams, reviewQueue])

  const activeRecord = reviewQueue[currentIdx] || null

  useEffect(() => {
    if (activeRecord) {
      setAssignedResponsible(activeRecord.responsible)
      setAssignedPriority(activeRecord.priority)
    }
  }, [activeRecord])

  const handleNextItem = () => {
    if (currentIdx < reviewQueue.length - 1) {
      setCurrentIdx((prev) => prev + 1)
      setNoteText('')
    } else {
      toast('Você alcançou o fim da fila de revisão atual.')
    }
  }

  const handlePrevItem = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1)
      setNoteText('')
    }
  }

  const handleApplyResolution = (newStatus: RecordStatus) => {
    if (!activeRecord) return

    dataStore.updateRecordDetails(
      activeRecord.id,
      {
        responsible: assignedResponsible,
        priority: assignedPriority,
        notes: noteText.trim() ? noteText.trim() : undefined,
      },
      'Operador NOX',
    )

    dataStore.updateRecordStatus(
      activeRecord.id,
      newStatus,
      'Operador NOX',
      noteText.trim() || undefined,
    )

    toast.success(`Registro ${activeRecord.recordCode} marcado como "${newStatus}".`)
    setNoteText('')

    // Advance to next without leaving review flow
    if (currentIdx < reviewQueue.length - 1) {
      // index remains valid for newly shifted list
    }
  }

  const handleAddTag = () => {
    if (!newTagInput.trim() || !activeRecord) return
    const updatedTags = Array.from(new Set([...activeRecord.tags, newTagInput.trim()]))
    dataStore.updateRecordDetails(activeRecord.id, { tags: updatedTags }, 'Operador NOX')
    setNewTagInput('')
    toast.success('Tag adicionada.')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-amber-400" />
              Revisão Operacional
            </h1>
            <Badge className="bg-amber-950 text-amber-400 border-amber-800 font-mono text-xs">
              Fila de Triagem ({reviewQueue.length} pendentes)
            </Badge>
            {dataStore.isUsingRealImportedData() ? (
              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 font-mono text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                DADOS IMPORTADOS REAIS ({records.length})
              </Badge>
            ) : (
              <Badge className="bg-amber-950/70 text-amber-300 border-amber-800 font-mono text-xs">
                DEMO SINTÉTICO ({records.length})
              </Badge>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Fluxo contínuo de decisão: priorização, despacho para advogados/analistas e anotação
            atômica sem perda de contexto.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setCurrentIdx(0)
            }}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="pending">Apenas Pendentes (Novo/Revisão/Quarentena)</option>
            <option value="novo">Apenas Novos</option>
            <option value="em_revisao">Apenas Em Revisão</option>
            <option value="quarentena">Apenas Quarentena</option>
            <option value="all">Todos os Status</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => {
              setFilterSeverity(e.target.value)
              setCurrentIdx(0)
            }}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todas Severidades</option>
            <option value="critico">Crítico</option>
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="informativo">Informativo</option>
          </select>
        </div>
      </div>

      {reviewQueue.length === 0 ? (
        <div className="nox-glass-card rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Fila de Revisão Zerada!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não há registros pendentes que correspondam aos filtros selecionados. Novos alertas
            aparecerão aqui automaticamente após a ingestão de novos lotes.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setFilterStatus('all')
              setFilterSeverity('all')
            }}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
          >
            Ver todos os registros
          </Button>
        </div>
      ) : activeRecord ? (
        /* Work Desk Split: Left = Focus Record Detail, Right = Operator Decision Controls */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 Cols: Detailed Subject Matter */}
          <div className="lg:col-span-7 space-y-4">
            <div className="nox-glass-card rounded-2xl p-5 border border-cyan-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 font-mono text-xs">
                    Item {currentIdx + 1} de {reviewQueue.length}
                  </Badge>
                  <span className="font-mono text-sm font-bold text-white">
                    {activeRecord.recordCode}
                  </span>
                  <Badge className="bg-slate-800 text-slate-300 font-mono text-xs">
                    {activeRecord.tribunal}
                  </Badge>
                </div>

                <Badge
                  className={`text-xs uppercase font-mono ${
                    activeRecord.severity === 'critico'
                      ? 'bg-rose-950 text-rose-400 border-rose-800 animate-pulse'
                      : activeRecord.severity === 'alto'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-yellow-950 text-yellow-400 border-yellow-800'
                  }`}
                >
                  Severidade: {activeRecord.severity}
                </Badge>
              </div>

              {/* Alert Content Box */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="text-[10px] font-mono text-slate-500 uppercase">
                  Objeto do Alerta Operacional
                </div>
                <h2 className="text-base font-bold text-white">{activeRecord.alertTitle}</h2>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  {activeRecord.alertDescription}
                </p>
              </div>

              {/* Process Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Processo CNJ
                  </span>
                  <div className="font-mono text-slate-200 mt-0.5 text-xs font-semibold">
                    {activeRecord.numeroProcesso}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Órgão Julgador
                  </span>
                  <div className="text-slate-200 mt-0.5 text-xs truncate">
                    {activeRecord.orgaoJulgador || 'Não informado'}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 sm:col-span-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    Partes Envolvidas
                  </span>
                  <div className="text-slate-200 font-mono text-xs mt-0.5">
                    {activeRecord.partes}
                  </div>
                </div>
              </div>

              {/* Validation / Quarantine Warning if applicable */}
              {activeRecord.validationErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-xs text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 font-mono text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Motivo da Retenção em Quarentena:
                  </div>
                  {activeRecord.validationErrors.map((err, i) => (
                    <div key={i} className="pl-4 text-[11px]">
                      • {err.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Audit History Timeline */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Histórico Recente:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {activeRecord.history.map((h) => (
                    <div
                      key={h.id}
                      className="text-[11px] text-slate-400 flex items-center justify-between p-1.5 rounded bg-slate-900/40 border border-slate-800/60"
                    >
                      <span>{h.action}</span>
                      <span className="font-mono text-slate-500">
                        {new Date(h.timestamp).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stepper Footer Controls */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={handlePrevItem}
                className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300"
              >
                ← Item Anterior
              </Button>
              <span className="text-slate-400">Navegação sem sair da tela</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx >= reviewQueue.length - 1}
                onClick={handleNextItem}
                className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300"
              >
                Próximo Item →
              </Button>
            </div>
          </div>

          {/* Right 5 Cols: Operator Decision & Action Panel */}
          <div className="lg:col-span-5 space-y-4">
            <div className="nox-glass-card rounded-2xl p-5 space-y-4 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono uppercase text-cyan-400 font-bold">
                  Painel de Despacho & Decisão
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-slate-400">
                  Status Atual: {activeRecord.status}
                </Badge>
              </div>

              {/* Responsible Assignment */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                  Atribuir Responsável:
                </label>
                <select
                  value={assignedResponsible}
                  onChange={(e) => setAssignedResponsible(e.target.value)}
                  className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="Dra. Mariana Rios">Dra. Mariana Rios (Cível / Contencioso)</option>
                  <option value="Dr. Lucas Silveira">
                    Dr. Lucas Silveira (Tributário / Federal)
                  </option>
                  <option value="Dr. Roberto Vasconcelos">
                    Dr. Roberto Vasconcelos (Empresarial / Recuperação)
                  </option>
                  <option value="Dra. Camila Duarte">Dra. Camila Duarte (Trabalhista)</option>
                  <option value="Operador de Qualidade">
                    Operador de Qualidade (Schema & Dados)
                  </option>
                </select>
              </div>

              {/* Priority Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                  Nível de Prioridade:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['baixa', 'media', 'alta', 'urgente'] as PriorityLevel[]).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignedPriority(p)}
                      className={`h-7 text-[10px] font-mono uppercase ${
                        assignedPriority === p
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tags Management */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                  Tags & Marcadores:
                </label>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {activeRecord.tags.map((t, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[10px] font-mono border-slate-700 text-slate-300 bg-slate-900"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Adicionar nova tag..."
                    className="h-7 text-xs bg-slate-900 border-slate-700 text-slate-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag()
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTag}
                    className="h-7 px-2.5 text-xs bg-slate-800 text-slate-200"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Decision Note Text Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                  Parecer / Nota Operacional:
                </label>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Instruções para o advogado responsável, providências a tomar ou fundamentação da quarentena..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                />
              </div>

              {/* Decision Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">
                  Concluir Ação para este Registro:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApplyResolution('em_revisao')}
                    className="h-9 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    Atribuir & Revisar
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleApplyResolution('processado')}
                    className="h-9 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Aprovar Processamento
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleApplyResolution('resolvido')}
                    className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Resolver Alerta
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplyResolution('quarentena')}
                    className="h-9 bg-slate-900 border-amber-800 text-amber-400 hover:bg-amber-950/40 text-xs font-mono"
                  >
                    Reter em Quarentena
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default ReviewPage
