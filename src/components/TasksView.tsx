import React, { useState } from 'react'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  Lock,
  User,
  ChevronRight,
  ListOrdered,
  Kanban,
  FileText,
} from 'lucide-react'
import { SentinelaTask, TaskStatus, TaskPriority } from '@/types/sentinela'
import { dataStore } from '@/services/dataStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  A_FAZER: {
    label: 'A Fazer',
    bg: 'bg-slate-900',
    text: 'text-slate-300',
    border: 'border-slate-800',
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    bg: 'bg-cyan-950/70',
    text: 'text-cyan-300',
    border: 'border-cyan-800',
  },
  BLOQUEADA: {
    label: 'Bloqueada',
    bg: 'bg-rose-950/70',
    text: 'text-rose-300',
    border: 'border-rose-800',
  },
  REVISAO: {
    label: 'Em Revisão',
    bg: 'bg-purple-950/70',
    text: 'text-purple-300',
    border: 'border-purple-800',
  },
  CONCLUIDA: {
    label: 'Concluída',
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-300',
    border: 'border-emerald-800',
  },
}

const PRIORITY_BADGES: Record<TaskPriority, { color: string }> = {
  BAIXA: { color: 'text-slate-400 bg-slate-900 border-slate-700' },
  MEDIA: { color: 'text-blue-400 bg-blue-950 border-blue-800' },
  ALTA: { color: 'text-amber-400 bg-amber-950 border-amber-800' },
  URGENTE: { color: 'text-rose-400 bg-rose-950 border-rose-800 animate-pulse' },
}

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<SentinelaTask[]>(dataStore.getTasks())
  const [viewMode, setViewMode] = useState<'lista' | 'kanban' | 'minha_fila'>('lista')
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('TODOS')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // New Task Form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIA')
  const [newResponsible, setNewResponsible] = useState('Dra. Mariana Rios')
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
  )
  const [newProcess, setNewProcess] = useState('')

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle) {
      toast.error('Informe o título da tarefa')
      return
    }

    const newTask: SentinelaTask = {
      id: `task_${Date.now()}`,
      title: newTitle,
      description: newDesc,
      status: 'A_FAZER',
      priority: newPriority,
      responsible: newResponsible,
      collaborators: [],
      estimatedHours: 4,
      internalDueDate: newDueDate,
      processNumber: newProcess || undefined,
      subtasks: [
        { id: `st_${Date.now()}_1`, text: 'Levantamento inicial e subsídios', completed: false },
        { id: `st_${Date.now()}_2`, text: 'Execução e protocolo da peça', completed: false },
      ],
      dependenciesTaskIds: [],
      isBlocked: false,
      tags: ['Operacional'],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    dataStore.addTask(newTask)
    setTasks(dataStore.getTasks())
    setCreateModalOpen(false)
    setNewTitle('')
    setNewDesc('')
    toast.success('Tarefa operacional criada com sucesso!')
  }

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    dataStore.toggleSubtask(taskId, subtaskId)
    setTasks(dataStore.getTasks())
  }

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    dataStore.updateTask(taskId, { status: newStatus })
    setTasks(dataStore.getTasks())
    toast.info(`Status da tarefa atualizado para "${STATUS_CONFIG[newStatus].label}".`)
  }

  const filteredTasks = tasks.filter((t) => {
    if (viewMode === 'minha_fila' && t.responsible !== 'Dra. Mariana Rios') return false
    if (statusFilter !== 'TODOS' && t.status !== statusFilter) return false
    if (searchFilter) {
      const q = searchFilter.toLowerCase()
      const match =
        t.title.toLowerCase().includes(q) ||
        (t.processNumber && t.processNumber.includes(q)) ||
        t.responsible.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            Gestão de Tarefas & Subtarefas Operacionais
          </h2>
          <p className="text-xs text-slate-400">
            Prazos internos protegidos, dependências operacionais e checklists executáveis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-8 shadow-md shadow-cyan-950 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Controls / Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <Input
            placeholder="Pesquisar tarefas, tags, processo..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-slate-950 border-slate-800 pl-8 h-8 text-xs text-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-mono text-[11px]">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por status"
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 text-xs font-mono"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="A_FAZER">A Fazer</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="BLOQUEADA">Bloqueada</option>
            <option value="REVISAO">Em Revisão</option>
            <option value="CONCLUIDA">Concluída</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('lista')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
              viewMode === 'lista'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
              viewMode === 'kanban'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode('minha_fila')}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
              viewMode === 'minha_fila'
                ? 'bg-purple-950 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Minha Fila (Dra. Mariana)
          </button>
        </div>
      </div>

      {/* Task Cards */}
      {viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          {(['A_FAZER', 'EM_ANDAMENTO', 'BLOQUEADA', 'CONCLUIDA'] as TaskStatus[]).map(
            (colStatus) => {
              const colTasks = tasks.filter((t) => t.status === colStatus)
              const meta = STATUS_CONFIG[colStatus]

              return (
                <div
                  key={colStatus}
                  className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-slate-200">
                        {meta.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                        {colTasks.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-mono px-1.5 py-0 ${PRIORITY_BADGES[task.priority].color}`}
                          >
                            {task.priority}
                          </Badge>
                          <span className="text-[10px] font-mono text-slate-400">
                            {task.responsible.split(' ')[1] || task.responsible}
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-slate-200 leading-snug">
                          {task.title}
                        </h4>

                        {task.processNumber && (
                          <div className="text-[10px] font-mono text-cyan-400 truncate">
                            {task.processNumber}
                          </div>
                        )}

                        {/* Subtasks Progress */}
                        {task.subtasks.length > 0 && (
                          <div className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Checklist:</span>
                            <span className="font-mono text-cyan-300">
                              {task.subtasks.filter((s) => s.completed).length}/
                              {task.subtasks.length}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            },
          )}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-slate-500 text-xs">
              Nenhuma tarefa encontrada.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const meta = STATUS_CONFIG[task.status]
              const priority = PRIORITY_BADGES[task.priority]

              return (
                <div
                  key={task.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3 nox-glass-card"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono px-2 py-0.5 ${meta.bg} ${meta.text} ${meta.border}`}
                      >
                        {meta.label}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono px-2 py-0.5 ${priority.color}`}
                      >
                        {task.priority}
                      </Badge>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-200">{task.title}</h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        aria-label="Alterar status da tarefa"
                        className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 text-[11px] font-mono"
                      >
                        <option value="A_FAZER">A Fazer</option>
                        <option value="EM_ANDAMENTO">Em Andamento</option>
                        <option value="BLOQUEADA">Bloqueada</option>
                        <option value="REVISAO">Em Revisão</option>
                        <option value="CONCLUIDA">Concluída</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">{task.description}</p>

                  {/* Metadata and Deadlines Line */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-300">{task.responsible}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-slate-400">Prazo Interno:</span>
                      <span className="text-amber-300 font-bold">{task.internalDueDate}</span>
                    </div>

                    {task.legalDeadlineDate && (
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-rose-400" />
                        <span className="text-slate-400">Vencimento Fatal:</span>
                        <span className="text-rose-400 font-bold">{task.legalDeadlineDate}</span>
                      </div>
                    )}

                    {task.processNumber && (
                      <div className="text-cyan-400">{task.processNumber}</div>
                    )}
                  </div>

                  {/* Checklist / Subtasks */}
                  {task.subtasks.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                        Subtarefas & Checklist de Execução (
                        {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}):
                      </div>
                      <div className="space-y-1">
                        {task.subtasks.map((st) => (
                          <label
                            key={st.id}
                            className="flex items-center gap-2 text-xs text-slate-300 hover:text-slate-100 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => handleToggleSubtask(task.id, st.id)}
                              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                            />
                            <span className={st.completed ? 'line-through text-slate-500' : ''}>
                              {st.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.isBlocked && task.blockReason && (
                    <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>
                        <strong>Bloqueio Operacional:</strong> {task.blockReason}
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modal Nova Tarefa */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-100">
              Criar Nova Tarefa Operacional
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Defina prazos internos e responsáveis com sincronização de agenda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-300">Título da Tarefa</Label>
              <Input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Elaborar minuta de Agravo de Instrumento"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-300">Descrição / Instruções</Label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Detalhes e teses para a equipe jurídica..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-slate-300">Prioridade</Label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  aria-label="Prioridade da Tarefa"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded px-2.5 py-1.5 text-xs"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Responsável</Label>
                <Input
                  value={newResponsible}
                  onChange={(e) => setNewResponsible(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-slate-300">Prazo Interno (Equipe)</Label>
                <Input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Número do Processo</Label>
                <Input
                  value={newProcess}
                  onChange={(e) => setNewProcess(e.target.value)}
                  placeholder="1004523-88.2025.8.26.0100"
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Criar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
