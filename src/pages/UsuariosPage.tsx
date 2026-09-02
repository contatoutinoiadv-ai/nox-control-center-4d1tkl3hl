import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Edit2,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Unlock,
  AlertTriangle,
  UserCheck,
  Building2,
  Clock,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  ArrowRight,
  Fingerprint,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { authUsersService, SYSTEM_MODULES_LIST } from '@/services/authUsersService'
import { NoxUser, UserRole, SystemModuleKey } from '@/types/nox'
import { AccessDeniedView } from '@/components/AccessDeniedView'
import { toast } from 'sonner'
import { dataStore } from '@/services/dataStore'

export const UsuariosPage: React.FC = () => {
  const [currentUserProfile, setCurrentUserProfile] = useState(authUsersService.getCachedMe())
  const [users, setUsers] = useState<NoxUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'operador'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>('all')

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false)

  // Selected for edit/delete
  const [selectedUser, setSelectedUser] = useState<NoxUser | null>(null)

  // Form State (Create / Edit)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('operador')
  const [formAtivo, setFormAtivo] = useState(true)
  const [formModules, setFormModules] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Carregar dados de perfil e usuários
  const loadData = async (forceAuth = false) => {
    setLoading(true)
    try {
      const me = await authUsersService.fetchMe(forceAuth)
      setCurrentUserProfile(me)

      if (me.isAdmin || me.role === 'admin') {
        const list = await authUsersService.listUsers()
        setUsers(list)
      }
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
      toast.error('Não foi possível carregar a lista de usuários', {
        description: err.message || 'Verifique as permissões de acesso.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Gerador de Senha Segura Temporária
  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
    let pwd = ''
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormPassword(pwd)
    setShowPassword(true)
    toast.info('Senha temporária sugerida gerada!', {
      description: 'Copie e informe ao usuário antes de salvar.',
    })
  }

  // Abertura do Modal de Criação
  const openCreateModal = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('operador')
    setFormAtivo(true)
    // Desmarcado por padrão (acesso explícito, nunca implícito)
    setFormModules([])
    setShowPassword(false)
    setCreateModalOpen(true)
  }

  // Abertura do Modal de Edição
  const openEditModal = (user: NoxUser) => {
    setSelectedUser(user)
    setFormName(user.name || '')
    setFormEmail(user.email || '')
    setFormPassword('')
    setFormRole(user.role)
    setFormAtivo(user.ativo)
    // Extrai módulos permitidos existentes
    const activeMods = (user.permissions || []).filter((p) => p.pode_acessar).map((p) => p.modulo)
    setFormModules(activeMods)
    setShowPassword(false)
    setEditModalOpen(true)
  }

  // Abertura do Modal de Exclusão
  const openDeleteModal = (user: NoxUser) => {
    setSelectedUser(user)
    setDeleteModalOpen(true)
  }

  // Toggle do módulo individual no checklist
  const toggleModuleSelection = (moduleKey: string) => {
    setFormModules((prev) =>
      prev.includes(moduleKey) ? prev.filter((k) => k !== moduleKey) : [...prev, moduleKey],
    )
  }

  // Presets de atribuição rápida de cargo para operador
  const applyModulePreset = (
    presetType: 'juridico' | 'intake' | 'contabil' | 'tudo' | 'limpar',
  ) => {
    if (presetType === 'juridico') {
      // Perfil Dr. Gilmar / Jurídico
      setFormModules([
        'central_nox',
        'sentinela',
        'processos',
        'radar',
        'lex_tempus',
        'central_prazos',
        'compromissos',
        'producao',
        'revisao',
      ])
      toast.success('Preset Jurídico aplicado (Sentinela, Prazos, Processos, Produção)')
    } else if (presetType === 'intake') {
      // Perfil Harianny / Clientes & Intake
      setFormModules(['central_nox', 'clientes', 'compromissos', 'exportacoes'])
      toast.success('Preset Clientes & Intake aplicado (Clientes, Intake, Agenda)')
    } else if (presetType === 'contabil') {
      // Perfil Naiara / Contabilidade & Financeiro
      setFormModules(['central_nox', 'clientes', 'exportacoes', 'revisao'])
      toast.success('Preset Contabilidade & Financeiro aplicado')
    } else if (presetType === 'tudo') {
      setFormModules(SYSTEM_MODULES_LIST.map((m) => m.key))
      toast.info('Todos os módulos operacionais foram selecionados')
    } else if (presetType === 'limpar') {
      setFormModules([])
      toast.info('Nenhum módulo selecionado (acesso zerado)')
    }
  }

  // Submissão: Criar Usuário
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast.error('Preencha todos os campos obrigatórios (Nome, E-mail e Senha inicial).')
      return
    }

    if (formPassword.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      await authUsersService.createUser({
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
        role: formRole,
        ativo: formAtivo,
        modules: formRole === 'admin' ? SYSTEM_MODULES_LIST.map((m) => m.key) : formModules,
      })

      toast.success('Usuário cadastrado com sucesso!', {
        description: `O acesso para ${formEmail} foi configurado e registrado na auditoria.`,
      })

      setCreateModalOpen(false)
      loadData(true)
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err)
      toast.error('Falha ao cadastrar usuário', {
        description: err.message || 'Erro desconhecido ao salvar no servidor.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Submissão: Editar Usuário
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setSubmitting(true)
    try {
      await authUsersService.updateUser({
        id: selectedUser.id,
        name: formName.trim(),
        role: formRole,
        ativo: formAtivo,
        password: formPassword.trim() ? formPassword.trim() : undefined,
        modules: formRole === 'admin' ? SYSTEM_MODULES_LIST.map((m) => m.key) : formModules,
      })

      toast.success('Usuário atualizado com sucesso!', {
        description: `Permissões de ${selectedUser.email} atualizadas e registradas em audit_logs.`,
      })

      setEditModalOpen(false)
      loadData(true)
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err)
      toast.error('Falha ao atualizar usuário', {
        description: err.message || 'Erro na operação de segurança.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Submissão: Excluir Usuário
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setSubmitting(true)
    try {
      await authUsersService.deleteUser(selectedUser.id)
      toast.success('Usuário excluído com sucesso!', {
        description: `O registro foi removido com integridade e o histórico gravado em audit_logs.`,
      })

      setDeleteModalOpen(false)
      setSelectedUser(null)
      loadData(true)
    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err)
      toast.error('Não foi possível excluir o usuário', {
        description: err.message || 'Operação bloqueada por regra de segurança.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Filtragem de Usuários
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)

      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'admin' && u.role === 'admin') ||
        (roleFilter === 'operador' && u.role === 'operador')

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'ativo' && u.ativo) ||
        (statusFilter === 'inativo' && !u.ativo)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  // Contadores
  const stats = useMemo(() => {
    const total = users.length
    const admins = users.filter((u) => u.role === 'admin').length
    const operadores = users.filter((u) => u.role === 'operador').length
    const ativos = users.filter((u) => u.ativo).length
    const inativos = total - ativos
    return { total, admins, operadores, ativos, inativos }
  }, [users])

  // Se não for admin, exibe a tela de Sem Acesso
  if (
    !loading &&
    currentUserProfile &&
    !currentUserProfile.isAdmin &&
    currentUserProfile.role !== 'admin'
  ) {
    return (
      <AccessDeniedView
        moduleName="Gerenciamento de Usuários e Permissões"
        moduleKey="usuarios"
        requiredRole="Administrador (admin)"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0b1329] to-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">
                  Controle de Usuários & Permissões
                </h1>
                <Badge
                  variant="outline"
                  className="bg-cyan-950/80 text-cyan-300 border-cyan-700/80 font-mono text-[10px]"
                >
                  RBAC DUPLA CAMADA
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Gerencie credenciais de acesso, perfis funcionais (Admin / Operador) e concessão
                explícita de módulos (Jurídico, Clientes/Intake, Prazos e Contabilidade) com trilha
                de auditoria completa e senhas criptografadas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={loading}
              className="bg-slate-900/80 border-slate-700 hover:bg-slate-800 text-slate-300 text-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-cyan-400' : ''}`}
              />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={openCreateModal}
              className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-600/20"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Total de Usuários</div>
            <div className="text-xl font-bold text-slate-100 font-mono mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] font-mono text-cyan-400 uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Administradores
            </div>
            <div className="text-xl font-bold text-cyan-300 font-mono mt-0.5">{stats.admins}</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] font-mono text-purple-400 uppercase flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Operadores
            </div>
            <div className="text-xl font-bold text-purple-300 font-mono mt-0.5">
              {stats.operadores}
            </div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
            <div className="text-[11px] font-mono text-emerald-400 uppercase flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ativos no Sistema
            </div>
            <div className="text-xl font-bold text-emerald-300 font-mono mt-0.5">
              {stats.ativos}{' '}
              {stats.inativos > 0 && (
                <span className="text-xs text-rose-400 font-normal">({stats.inativos} inat.)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Regras de Segurança Informativas */}
      <div className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
          <Fingerprint className="w-4 h-4 text-cyan-400" />
          <span>Políticas de Segurança e Acesso Rígido (Anti-Lockout & Audit-Trail)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] pt-1">
          <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block">Mínimo 1 Admin Ativo:</strong>
              O sistema rejeita exclusão ou rebaixamento se deixar a base sem administradores.
            </div>
          </div>
          <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
            <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block">Anti-Autoexclusão:</strong>
              O usuário conectado não pode se desativar, se autoexcluir ou retirar o próprio admin.
            </div>
          </div>
          <div className="flex items-start gap-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block">Trilha de Auditoria:</strong>
              Toda criação, alteração de permissão e exclusão é gravada imutavelmente em audit_logs.
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-950/80 border-slate-800 text-xs text-slate-200 placeholder:text-slate-400 focus:border-cyan-500 h-9"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <Select
              value={roleFilter}
              onValueChange={(val: 'all' | 'admin' | 'operador') => setRoleFilter(val)}
            >
              <SelectTrigger className="w-36 bg-slate-950/80 border-slate-800 text-xs h-9 text-slate-300">
                <SelectValue placeholder="Cargo / Role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="all">Todos os Cargos</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select
            value={statusFilter}
            onValueChange={(val: 'all' | 'ativo' | 'inativo') => setStatusFilter(val)}
          >
            <SelectTrigger className="w-32 bg-slate-950/80 border-slate-800 text-xs h-9 text-slate-300">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativo">Apenas Ativos</SelectItem>
              <SelectItem value="inativo">Apenas Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400 font-mono uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Usuário / Identificação</th>
                <th className="py-3 px-4">Cargo / Função</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Permissões de Acesso</th>
                <th className="py-3 px-4">Data de Criação</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    Carregando usuários do sistema...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum usuário encontrado para os critérios de busca.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = currentUserProfile?.user.id === user.id
                  const activePermCount =
                    user.role === 'admin'
                      ? SYSTEM_MODULES_LIST.length
                      : (user.permissions || []).filter((p) => p.pode_acessar).length

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-800/40 transition-colors ${!user.ativo ? 'opacity-60 bg-slate-950/40' : ''}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                              user.role === 'admin'
                                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                : 'bg-purple-950 text-purple-400 border border-purple-800'
                            }`}
                          >
                            {user.name.slice(0, 2) || 'NO'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-2">
                              {user.name}
                              {isCurrent && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-mono px-1.5 py-0 bg-cyan-950/80 text-cyan-400 border-cyan-700"
                                >
                                  VOCÊ (LOGADO)
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {user.role === 'admin' ? (
                          <Badge className="bg-cyan-950 text-cyan-300 border-cyan-700/80 hover:bg-cyan-950 font-mono text-[10px] flex items-center gap-1 w-fit">
                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                            ADMINISTRADOR
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-purple-950/60 text-purple-300 border-purple-800/80 font-mono text-[10px] flex items-center gap-1 w-fit"
                          >
                            <UserCheck className="w-3 h-3 text-purple-400" />
                            OPERADOR
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {user.ativo ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-rose-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Inativo
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {user.role === 'admin' ? (
                          <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-semibold text-cyan-300">Acesso Total</span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              (Todos os 15 módulos)
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                              <span className="font-semibold text-purple-300">
                                {activePermCount}
                              </span>
                              <span className="text-slate-400">
                                de {SYSTEM_MODULES_LIST.length} módulos liberados
                              </span>
                            </div>
                            {activePermCount > 0 && (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(user.permissions || [])
                                  .filter((p) => p.pode_acessar)
                                  .slice(0, 3)
                                  .map((p) => (
                                    <span
                                      key={p.modulo}
                                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                                    >
                                      {SYSTEM_MODULES_LIST.find((m) => m.key === p.modulo)?.name ||
                                        p.modulo}
                                    </span>
                                  ))}
                                {activePermCount > 3 && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/40 text-slate-400">
                                    +{activePermCount - 3} mais
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {user.created ? new Date(user.created).toLocaleDateString('pt-BR') : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
                            className="h-7 px-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                            title="Editar usuário e permissões"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Editar
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(user)}
                            disabled={isCurrent}
                            className="h-7 px-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 disabled:opacity-30"
                            title={
                              isCurrent
                                ? 'Você não pode autoexcluir seu usuário'
                                : 'Excluir usuário'
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: NOVO USUÁRIO                                      */}
      {/* ======================================================== */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl bg-[#0b1329] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              Cadastrar Novo Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Defina as credenciais, o cargo e os módulos que este usuário terá permissão de
              acessar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Nome Completo *</Label>
                <Input
                  required
                  placeholder="Ex: Dr. Gilmar Souza ou Naiara Contábil"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-slate-950/80 border-slate-800 text-xs text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">E-mail de Acesso *</Label>
                <Input
                  type="email"
                  required
                  placeholder="usuario@escritorio.adv.br"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="bg-slate-950/80 border-slate-800 text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-300">Senha Inicial * (min 8 chars)</Label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <KeyRound className="w-2.5 h-2.5" /> Gerar Aleatória
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="bg-slate-950/80 border-slate-800 text-xs text-slate-200 pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Cargo / Perfil Funcional *</Label>
                <Select value={formRole} onValueChange={(val: UserRole) => setFormRole(val)}>
                  <SelectTrigger className="bg-slate-950/80 border-slate-800 text-xs h-9 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="operador">Operador (Acesso por módulos)</SelectItem>
                    <SelectItem value="admin">Administrador (Acesso Irrestrito)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800">
              <div className="space-y-0.5">
                <Label className="text-xs text-slate-200 font-semibold">Conta Ativa</Label>
                <p className="text-[11px] text-slate-400">
                  Desative para suspender o login do usuário imediatamente sem excluir o histórico.
                </p>
              </div>
              <Switch checked={formAtivo} onCheckedChange={setFormAtivo} />
            </div>

            {/* Checklist de Permissões de Módulo */}
            {formRole === 'operador' ? (
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <Label className="text-xs text-slate-200 font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      Módulos Permitidos (Acesso Explícito)
                    </Label>
                    <p className="text-[11px] text-slate-400">
                      Desmarcado por padrão. Marque apenas o que este operador precisa ver.
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyModulePreset('juridico')}
                      className="h-6 text-[10px] px-2 bg-slate-900 border-slate-700 text-cyan-300"
                    >
                      Preset Jurídico
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyModulePreset('intake')}
                      className="h-6 text-[10px] px-2 bg-slate-900 border-slate-700 text-emerald-300"
                    >
                      Preset Intake
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyModulePreset('contabil')}
                      className="h-6 text-[10px] px-2 bg-slate-900 border-slate-700 text-purple-300"
                    >
                      Preset Contábil
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {SYSTEM_MODULES_LIST.map((mod) => {
                    const isChecked = formModules.includes(mod.key)
                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleModuleSelection(mod.key)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isChecked
                            ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-100 shadow-sm'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-200 flex items-center justify-between">
                            <span>{mod.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-cyan-950/30 border border-cyan-800/60 rounded-lg text-xs text-cyan-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Usuários com perfil <strong>Administrador</strong> possuem acesso automático e
                  irrestrito a todos os módulos e ferramentas do sistema.
                </span>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                {submitting ? 'Salvando...' : 'Cadastrar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: EDITAR USUÁRIO                                    */}
      {/* ======================================================== */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl bg-[#0b1329] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit2 className="w-5 h-5 text-cyan-400" />
              Editar Usuário & Permissões
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-mono">
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Nome do Usuário *</Label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="bg-slate-950/80 border-slate-800 text-xs text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Cargo / Função</Label>
                  <Select value={formRole} onValueChange={(val: UserRole) => setFormRole(val)}>
                    <SelectTrigger className="bg-slate-950/80 border-slate-800 text-xs h-9 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="operador">Operador (Acesso restrito)</SelectItem>
                      <SelectItem value="admin">Administrador (Acesso Total)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Redefinição de Senha */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-200 font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Redefinir Senha (Opcional)
                  </Label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    Gerar Nova Temporária
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Deixe em branco para manter a senha atual"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-200 pr-9 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Preencha apenas se desejar redefinir a senha de acesso deste usuário.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-lg border border-slate-800">
                <div className="space-y-0.5">
                  <Label className="text-xs text-slate-200 font-semibold">Status da Conta</Label>
                  <p className="text-[11px] text-slate-400">
                    Usuários inativos não conseguem realizar login nem acessar as rotas de API.
                  </p>
                </div>
                <Switch checked={formAtivo} onCheckedChange={setFormAtivo} />
              </div>

              {/* Checklist de Permissões */}
              {formRole === 'operador' ? (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <Label className="text-xs text-slate-200 font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        Módulos Permitidos para Este Operador
                      </Label>
                      <p className="text-[11px] text-slate-400">
                        Marque ou desmarque os módulos que o usuário pode acessar no menu.
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyModulePreset('juridico')}
                        className="h-6 text-[10px] px-2 bg-slate-900 border-slate-700 text-cyan-300"
                      >
                        Jurídico
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyModulePreset('intake')}
                        className="h-6 text-[10px] px-2 bg-slate-900 border-slate-700 text-emerald-300"
                      >
                        Intake
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyModulePreset('contabil')}
                        className="h-6 text-[10px] px-2 bg-slate-900 border-slate-700 text-purple-300"
                      >
                        Contábil
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {SYSTEM_MODULES_LIST.map((mod) => {
                      const isChecked = formModules.includes(mod.key)
                      return (
                        <div
                          key={mod.key}
                          onClick={() => toggleModuleSelection(mod.key)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-cyan-950/40 border-cyan-500/50 text-slate-100 shadow-sm'
                              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-200 flex items-center justify-between">
                              <span>{mod.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-cyan-950/30 border border-cyan-800/60 rounded-lg text-xs text-cyan-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Como <strong>Administrador</strong>, este usuário tem permissão para todos os
                    módulos, inclusive Gerenciamento de Usuários e Auditoria.
                  </span>
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditModalOpen(false)}
                  disabled={submitting}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO                                */}
      {/* ======================================================== */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md bg-[#0b1329] border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400 text-base">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirmar Exclusão de Usuário
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 pt-2">
              Você tem certeza que deseja excluir permanentemente o acesso de{' '}
              <strong className="text-slate-100 font-mono">{selectedUser?.email}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-rose-950/30 border border-rose-800/50 rounded-lg p-3 text-xs text-rose-200 space-y-1">
            <p className="font-semibold text-rose-300">Preservação Histórica Garantida:</p>
            <p className="text-[11px] text-rose-300/80">
              A exclusão remove o login, mas a trilha de auditoria retroativa com as ações
              realizadas por <span className="font-mono">{selectedUser?.email}</span> continuará
              íntegra em audit_logs.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteModalOpen(false)}
              disabled={submitting}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDeleteUser}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              {submitting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UsuariosPage
