import React, { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Sparkles,
  RotateCcw,
  Lock,
  ToggleLeft,
  ToggleRight,
  Sliders,
  CheckCircle2,
  Server,
  Key,
  UserCheck,
  Building2,
  Mail,
  FileBadge,
  MapPin,
  Save,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { dataStore, AppSettings } from '@/services/dataStore'
import { legacyStorageAdapter, LegacyMigrationStatus } from '@/services/legacyStorageAdapter'
import { Phase2TestSuite, TestSuiteSummary } from '@/services/phase2TestSuite'
import { Phase3ServiceTestSuite, ServiceUnitTestResult } from '@/services/phase3ServiceTestSuite'
import { Phase5AtendimentoTestSuite } from '@/services/atendimento/phase5AtendimentoTestSuite'
import { Phase6AtendimentoTestSuite } from '@/services/atendimento/phase6AtendimentoTestSuite'
import { Phase7RealtimeTestSuite } from '@/services/atendimento/phase7RealtimeTestSuite'
import { Phase8EvolutionTestSuite } from '@/services/atendimento/phase8EvolutionTestSuite'
import { toast } from 'sonner'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(dataStore.getSettings())
  const [migrationStatus, setMigrationStatus] = useState<LegacyMigrationStatus>(
    legacyStorageAdapter.getStatus(),
  )
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null)
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [phase3Summary, setPhase3Summary] = useState<{
    total: number
    passed: number
    failed: number
    results: ServiceUnitTestResult[]
  } | null>(null)
  const [phase5Summary, setPhase5Summary] = useState<{
    total: number
    passed: number
    failed: number
    results: ServiceUnitTestResult[]
  } | null>(null)
  const [isRunningPhase5Tests, setIsRunningPhase5Tests] = useState(false)
  const [isRunningPhase3Tests, setIsRunningPhase3Tests] = useState(false)
  const [isRunningPhase6Tests, setIsRunningPhase6Tests] = useState(false)
  const [phase6Summary, setPhase6Summary] = useState<{
    total: number
    passed: number
    failed: number
    results: any[]
  } | null>(null)

  const [isRunningPhase7Tests, setIsRunningPhase7Tests] = useState(false)
  const [phase7Summary, setPhase7Summary] = useState<{
    total: number
    passed: number
    failed: number
    results: any[]
  } | null>(null)

  const [isRunningPhase8Tests, setIsRunningPhase8Tests] = useState(false)
  const [phase8Summary, setPhase8Summary] = useState<{
    total: number
    passed: number
    failed: number
    results: any[]
  } | null>(null)

  const lawyerProfile = dataStore.getLawyerProfile()

  const [formData, setFormData] = useState({
    nome: lawyerProfile.nome || 'Higor Utinoi de Oliveira',
    oab: lawyerProfile.oab || 'OAB/MS 15.400',
    uf: lawyerProfile.uf || 'MS',
    escritorio: lawyerProfile.escritorio || 'Higor Utinói Advocacia',
    email: lawyerProfile.email || 'contato@utinoiadvocacia.com.br',
  })

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      const curSettings = dataStore.getSettings()
      setSettings(curSettings)
      const prof = dataStore.getLawyerProfile()
      setFormData({
        nome: prof.nome || 'Higor Utinoi de Oliveira',
        oab: prof.oab || 'OAB/MS 15.400',
        uf: prof.uf || 'MS',
        escritorio: prof.escritorio || 'Higor Utinói Advocacia',
        email: prof.email || 'contato@utinoiadvocacia.com.br',
      })
    })
    const unsubAdapter = legacyStorageAdapter.subscribe((s) => setMigrationStatus(s))
    return () => {
      unsub()
      unsubAdapter()
    }
  }, [])

  const handleToggle = (key: keyof AppSettings) => {
    const updated = { [key]: !settings[key] }
    dataStore.saveSettings(updated)
    toast.success('Preferência atualizada.')
  }

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formData.nome.trim()) {
      toast.error('O nome do advogado titular não pode ser vazio.')
      return
    }
    dataStore.updateLawyerProfile({
      nome: formData.nome.trim(),
      oab: formData.oab.trim(),
      uf: formData.uf.trim().toUpperCase(),
      escritorio: formData.escritorio.trim(),
      email: formData.email.trim(),
    })
    toast.success('Perfil do Advogado Titular salvo com sucesso e propagado para o sistema!')
  }

  const handleResetProfileToDefault = () => {
    const defaults = {
      nome: 'Higor Utinoi de Oliveira',
      oab: 'OAB/MS 15.400',
      uf: 'MS',
      escritorio: 'Higor Utinói Advocacia',
      email: 'contato@utinoiadvocacia.com.br',
    }
    setFormData(defaults)
    dataStore.updateLawyerProfile(defaults)
    toast.info('Perfil do Advogado restaurado para os parâmetros padrão.')
  }

  const handleResetData = () => {
    if (confirm('Deseja limpar todos os dados importados e zerar o sistema por completo?')) {
      dataStore.clearAllData()
      toast.success(
        'Todos os dados foram apagados. O sistema está zerado pronto para nova importação.',
      )
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-cyan-400" />
              Configurações & Parâmetros do Sistema
            </h1>
            <Badge className="bg-cyan-950 text-cyan-400 border-cyan-800 font-mono text-xs">
              Ambiente NOX
            </Badge>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Controle de feature flags, preferências operacionais, isolamento de fontes e redefinição
            do estado.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleResetData}
          className="h-8 text-xs bg-slate-900 border-rose-900/60 text-rose-400 hover:bg-rose-950/40 font-mono"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Zerar e Limpar Dados
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 0: Perfil do Advogado Titular (NOVO FORMULÁRIO COMPLETO & EDITÁVEL) */}
        <div className="nox-glass-card rounded-2xl p-5 space-y-4 border border-cyan-500/40 lg:col-span-2 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" /> Perfil do Advogado Titular &
                Responsável Técnico
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Definição da âncora de busca no DJEN/PJe, assinatura de relatórios e responsável
                padrão nas esteiras operacionais.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-cyan-950 text-cyan-300 border-cyan-700 font-mono text-xs">
                Âncora Oficial
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetProfileToDefault}
                className="h-7 text-[11px] text-slate-400 hover:text-white px-2"
              >
                Restaurar Padrão
              </Button>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Campo 1: Nome Completo */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-mono text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Nome do Advogado Titular:
                </label>
                <Input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Higor Utinoi de Oliveira"
                  className="h-9 bg-slate-900/90 border-slate-700 text-slate-100 font-medium focus:border-cyan-500 font-sans"
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  Utilizado como titular responsável em processos, audiências, sentinela e agenda.
                </span>
              </div>

              {/* Campo 2: OAB */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <FileBadge className="w-3.5 h-3.5 text-cyan-400" />
                  Inscrição OAB:
                </label>
                <Input
                  type="text"
                  value={formData.oab}
                  onChange={(e) => setFormData({ ...formData, oab: e.target.value })}
                  placeholder="Ex: OAB/MS 15.400"
                  className="h-9 bg-slate-900/90 border-slate-700 text-slate-100 font-mono focus:border-cyan-500 font-semibold"
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  Identificador unívoco para captura DJEN/CNJ.
                </span>
              </div>

              {/* Campo 3: UF */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  UF Seccional:
                </label>
                <Input
                  type="text"
                  maxLength={2}
                  value={formData.uf}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                  placeholder="MS"
                  className="h-9 bg-slate-900/90 border-slate-700 text-slate-100 font-mono uppercase focus:border-cyan-500 font-semibold"
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  Estado de registro principal da OAB.
                </span>
              </div>

              {/* Campo 4: Escritório */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Nome do Escritório / Razão:
                </label>
                <Input
                  type="text"
                  value={formData.escritorio}
                  onChange={(e) => setFormData({ ...formData, escritorio: e.target.value })}
                  placeholder="Ex: Higor Utinói Advocacia"
                  className="h-9 bg-slate-900/90 border-slate-700 text-slate-100 font-medium focus:border-cyan-500 font-sans"
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  Aparece nos dossiês, exportações e petições geradas.
                </span>
              </div>

              {/* Campo 5: E-mail de Contato */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  E-mail Institucional:
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@utinoiadvocacia.com.br"
                  className="h-9 bg-slate-900/90 border-slate-700 text-slate-100 font-mono focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  Canal de recebimento de alertas e notificações do sistema.
                </span>
              </div>
            </div>

            {/* Preview Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-200">
                    {formData.nome || 'Higor Utinoi de Oliveira'} &bull;{' '}
                    <span className="text-cyan-400 font-mono">
                      {formData.oab || 'OAB/MS 15.400'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {formData.escritorio || 'Higor Utinói Advocacia'} &bull;{' '}
                    {formData.email || 'contato@utinoiadvocacia.com.br'} ({formData.uf || 'MS'})
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="sm"
                className="h-8 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono shrink-0 shadow-md"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Salvar Perfil do Advogado
              </Button>
            </div>
          </form>
        </div>

        {/* Card 1: Feature Flags */}
        <div className="nox-glass-card rounded-2xl p-5 space-y-4 border border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Feature Flags & Integrações
            </h2>
            <Badge className="text-[10px] font-mono">Controle Modular</Badge>
          </div>

          <div className="space-y-3 text-xs">
            {/* Lex Tempus Toggle */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">
                  Integração LEX TEMPUS (Preditivo)
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Ativa o contrato preliminar de prazos jurídicos.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggle('lexTempusFeatureFlag')}
                className={`h-7 px-3 text-[10px] font-mono ${
                  settings.lexTempusFeatureFlag
                    ? 'bg-purple-950 text-purple-300 border-purple-600'
                    : 'bg-slate-950 text-slate-500'
                }`}
              >
                {settings.lexTempusFeatureFlag ? 'FLAG: ATIVA' : 'FLAG: INATIVA'}
              </Button>
            </div>

            {/* Strict CNJ Validation */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Validação Estrita de CNJ</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Reter em quarentena processos sem formato 20 dígitos padrão CNJ.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggle('strictCnjValidation')}
                className={`h-7 px-3 text-[10px] font-mono ${
                  settings.strictCnjValidation
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                    : 'bg-slate-950 text-slate-500'
                }`}
              >
                {settings.strictCnjValidation ? 'ATIVO' : 'DESATIVADO'}
              </Button>
            </div>
          </div>
        </div>

        {/* Card 2: Interface & Motion Settings */}
        <div className="nox-glass-card rounded-2xl p-5 space-y-4 border border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Interface & Acessibilidade
            </h2>
            <Badge className="text-[10px] font-mono">UX System</Badge>
          </div>

          <div className="space-y-3 text-xs">
            {/* Reduced motion override */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Modo de Movimento Reduzido</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Desativa varreduras de radar e pulsos visuais (WCAG 2.1).
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggle('reducedMotionPreference')}
                className={`h-7 px-3 text-[10px] font-mono ${
                  settings.reducedMotionPreference
                    ? 'bg-amber-950 text-amber-300 border-amber-600'
                    : 'bg-slate-950 text-slate-500'
                }`}
              >
                {settings.reducedMotionPreference ? 'REDUZIDO' : 'PADRÃO'}
              </Button>
            </div>

            {/* Auto refresh radar */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-200">Atualização Dinâmica do Radar</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Sincroniza automaticamente a posição dos alertas a cada{' '}
                  {settings.refreshIntervalSeconds}s.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggle('autoRefreshRadar')}
                className={`h-7 px-3 text-[10px] font-mono ${
                  settings.autoRefreshRadar
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-600'
                    : 'bg-slate-950 text-slate-500'
                }`}
              >
                {settings.autoRefreshRadar ? 'LIGADO' : 'DESLIGADO'}
              </Button>
            </div>
          </div>
        </div>

        {/* Card: Dual-Store & PocketBase Source of Truth (Fase 2) */}
        <div className="nox-glass-card rounded-2xl p-5 space-y-4 border border-cyan-800/60 lg:col-span-2 bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-800/40">
            <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Arquitetura Dual-Store & PocketBase Source of Truth
            </h2>
            <Badge className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border-cyan-700">
              FASE 2 CONCLUÍDA
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
              <div className="text-slate-400 font-mono text-[11px]">Fonte Oficial</div>
              <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">
                PocketBase (Server)
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Clientes, Agenda/Compromissos, Tarefas e Produção Jurídica persistem exclusivamente
                no servidor.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
              <div className="text-slate-400 font-mono text-[11px]">Papel do LocalStorage</div>
              <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
                Cache & Visual State
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Filtros visuais, ordenação de colunas, rascunhos de formulário e contingência em
                modo offline.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800">
              <div className="text-slate-400 font-mono text-[11px]">Realtime & Concorrência</div>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                SSE Nativo Ativo
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Subscrições ativas por coleção, propagação instantânea entre navegadores sem
                duplicatas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="text-xs text-slate-400">
              <span>Status Operacional: </span>
              <strong className="text-cyan-300 font-mono">{migrationStatus.overallStatus}</strong>
              {migrationStatus.unresolvedConflicts.length > 0 && (
                <span className="text-rose-400 ml-2">
                  ({migrationStatus.unresolvedConflicts.length} conflito(s) sob revisão)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isRunningTests}
                onClick={async () => {
                  setIsRunningTests(true)
                  try {
                    const res = await Phase2TestSuite.runAllTests()
                    setTestSummary(res)
                    if (res.failed === 0) {
                      toast.success(`13/13 Testes da Fase 2 Verificados com Sucesso!`, {
                        description: `PocketBase Source of Truth validado ponta a ponta.`,
                      })
                    } else {
                      toast.error(`${res.failed} teste(s) falharam na bateria de validação.`)
                    }
                  } finally {
                    setIsRunningTests(false)
                  }
                }}
                className="h-8 text-xs border-cyan-700 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/60 font-mono"
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 mr-1.5 ${isRunningTests ? 'animate-spin' : ''}`}
                />
                {isRunningTests ? 'Executando Testes...' : 'Executar Bateria Fase 2'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isRunningPhase3Tests}
                onClick={async () => {
                  setIsRunningPhase3Tests(true)
                  try {
                    const res = await Phase3ServiceTestSuite.runAll()
                    setPhase3Summary(res)
                    if (res.failed === 0) {
                      toast.success(
                        `${res.passed}/${res.total} Testes da Fase 3 Verificados com Sucesso!`,
                        {
                          description:
                            'ClientService, ProcessService, DataJudClient e AuthService validados.',
                        },
                      )
                    } else {
                      toast.error(`${res.failed} teste(s) falharam na suite da Fase 3.`)
                    }
                  } finally {
                    setIsRunningPhase3Tests(false)
                  }
                }}
                className="h-8 text-xs border-purple-700 bg-purple-950/40 text-purple-200 hover:bg-purple-900/60 font-mono"
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 mr-1.5 ${isRunningPhase3Tests ? 'animate-spin' : ''}`}
                />
                {isRunningPhase3Tests
                  ? 'Testando Services...'
                  : 'Executar Bateria Fase 3 (Services)'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isRunningPhase5Tests}
                onClick={async () => {
                  setIsRunningPhase5Tests(true)
                  try {
                    const res = await Phase5AtendimentoTestSuite.runAll()
                    setPhase5Summary(res)
                    if (res.failed === 0) {
                      toast.success(
                        `${res.passed}/${res.total} Testes da Fase 5 (Atendimento) Aprovados!`,
                        {
                          description:
                            'MockAdapter, Fixtures, Seleção, Filtros, Status e Notas Internas validados.',
                        },
                      )
                    } else {
                      toast.error(`${res.failed} teste(s) falharam na suite da Fase 5.`)
                    }
                  } finally {
                    setIsRunningPhase5Tests(false)
                  }
                }}
                className="h-8 text-xs border-cyan-500 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/60 font-mono"
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 mr-1.5 ${isRunningPhase5Tests ? 'animate-spin' : ''}`}
                />
                {isRunningPhase5Tests ? 'Testando Atendimento...' : 'Bateria Fase 5 (Atendimento)'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isRunningPhase6Tests}
                onClick={async () => {
                  setIsRunningPhase6Tests(true)
                  try {
                    const res = await Phase6AtendimentoTestSuite.runAll()
                    setPhase6Summary(res)
                    if (res.failed === 0) {
                      toast.success(
                        `${res.passed}/${res.total} Testes da Fase 6 (Services & Segurança) Aprovados!`,
                        {
                          description:
                            'Services reais, teste crítico de nota interna, telefonia, idempotência e vínculos validados.',
                        },
                      )
                    } else {
                      toast.error(`${res.failed} teste(s) falharam na suite da Fase 6.`)
                    }
                  } finally {
                    setIsRunningPhase6Tests(false)
                  }
                }}
                className="h-8 text-xs border-emerald-500 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 font-mono font-bold"
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 mr-1.5 ${isRunningPhase6Tests ? 'animate-spin' : ''}`}
                />
                {isRunningPhase6Tests ? 'Testando Fase 6...' : 'Bateria Fase 6 (Services)'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isRunningPhase7Tests}
                onClick={async () => {
                  setIsRunningPhase7Tests(true)
                  try {
                    const res = await Phase7RealtimeTestSuite.runAll()
                    setPhase7Summary(res)
                    if (res.failed === 0) {
                      toast.success(
                        `${res.passed}/${res.total} Testes da Fase 7 (Realtime & Multiusuário) Aprovados!`,
                        {
                          description:
                            'SSE centralizado, deduplicação canônica, reconnect, resync e multiusuário validados.',
                        },
                      )
                    } else {
                      toast.error(`${res.failed} teste(s) falharam na suite da Fase 7.`)
                    }
                  } finally {
                    setIsRunningPhase7Tests(false)
                  }
                }}
                className="h-8 text-xs border-blue-500 bg-blue-950/60 text-blue-300 hover:bg-blue-900/60 font-mono font-bold"
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 mr-1.5 ${isRunningPhase7Tests ? 'animate-spin' : ''}`}
                />
                {isRunningPhase7Tests ? 'Testando Realtime...' : 'Bateria Fase 7 (Realtime)'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isRunningPhase8Tests}
                onClick={async () => {
                  setIsRunningPhase8Tests(true)
                  try {
                    const res = await Phase8EvolutionTestSuite.runAll()
                    setPhase8Summary(res)
                    if (res.failed === 0) {
                      toast.success(
                        `${res.passed}/${res.total} Testes da Fase 8 (Evolution & Gateway) Aprovados!`,
                        {
                          description:
                            'Idempotência, deduplicação de echo, normalização inbound, kill switch e proteção de nota interna validados.',
                        },
                      )
                    } else {
                      toast.error(`${res.failed} teste(s) falharam na suite da Fase 8.`)
                    }
                  } finally {
                    setIsRunningPhase8Tests(false)
                  }
                }}
                className="h-8 text-xs border-purple-500 bg-purple-950/70 text-purple-200 hover:bg-purple-900/60 font-mono font-bold"
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 mr-1.5 ${isRunningPhase8Tests ? 'animate-spin' : ''}`}
                />
                {isRunningPhase8Tests ? 'Testando Fase 8...' : 'Bateria Fase 8 (Evolution)'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await legacyStorageAdapter.runFullMigration()
                  await dataStore.reloadFromPocketBase()
                  toast.success('Varredura e migração de registros concluída.')
                }}
                className="h-8 text-xs border-slate-700 text-slate-300 hover:text-white font-mono"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Forçar Sincronização
              </Button>
            </div>
          </div>

          {testSummary && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between font-mono font-semibold">
                <span className="text-cyan-400">
                  Relatório da Bateria da Fase 2 ({testSummary.passed}/{testSummary.total}{' '}
                  Aprovados)
                </span>
                <span className="text-slate-400 text-[11px]">
                  {new Date(testSummary.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {testSummary.results.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-[11px]"
                  >
                    <span className="truncate pr-2 text-slate-300">{r.name}</span>
                    <Badge
                      className={`text-[9px] font-mono px-1 py-0 ${
                        r.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase3Summary && (
            <div className="p-3 bg-slate-950 rounded-xl border border-purple-800/60 text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between font-mono font-semibold">
                <span className="text-purple-400">
                  Relatório da Bateria da Fase 3 — Camada de Services ({phase3Summary.passed}/
                  {phase3Summary.total} Aprovados)
                </span>
                <Badge
                  className={`text-[10px] font-mono ${
                    phase3Summary.failed === 0
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  {phase3Summary.failed === 0 ? '100% VERDE' : `${phase3Summary.failed} FALHAS`}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {phase3Summary.results.map((r, idx) => (
                  <div
                    key={`${r.suite}_${idx}`}
                    className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-[11px]"
                  >
                    <div className="truncate pr-2">
                      <span className="text-purple-400 font-mono text-[10px] mr-1">
                        [{r.suite}]
                      </span>
                      <span className="text-slate-300">{r.test}</span>
                    </div>
                    <Badge
                      className={`text-[9px] font-mono px-1 py-0 shrink-0 ${
                        r.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase5Summary && (
            <div className="p-3 bg-slate-950 rounded-xl border border-cyan-800/80 text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between font-mono font-semibold">
                <span className="text-cyan-400">
                  Relatório da Bateria da Fase 5 — Central de Atendimento ({phase5Summary.passed}/
                  {phase5Summary.total} Aprovados)
                </span>
                <Badge
                  className={`text-[10px] font-mono ${
                    phase5Summary.failed === 0
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  {phase5Summary.failed === 0 ? '100% VERDE' : `${phase5Summary.failed} FALHAS`}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {phase5Summary.results.map((r, idx) => (
                  <div
                    key={`${r.suite}_${idx}`}
                    className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-[11px]"
                  >
                    <div className="truncate pr-2">
                      <span className="text-cyan-400 font-mono text-[10px] mr-1">[{r.suite}]</span>
                      <span className="text-slate-300">{r.test}</span>
                    </div>
                    <Badge
                      className={`text-[9px] font-mono px-1 py-0 shrink-0 ${
                        r.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase6Summary && (
            <div className="p-3 bg-slate-950 rounded-xl border border-emerald-800/80 text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between font-mono font-semibold">
                <span className="text-emerald-400">
                  Relatório da Bateria da Fase 6 — Services, Segurança & Repositories (
                  {phase6Summary.passed}/{phase6Summary.total} Aprovados)
                </span>
                <Badge
                  className={`text-[10px] font-mono ${
                    phase6Summary.failed === 0
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  {phase6Summary.failed === 0 ? '100% VERDE' : `${phase6Summary.failed} FALHAS`}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {phase6Summary.results.map((r, idx) => (
                  <div
                    key={`${r.suite}_${idx}`}
                    className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-[11px]"
                  >
                    <div className="truncate pr-2">
                      <span className="text-emerald-400 font-mono text-[10px] mr-1">
                        [{r.suite}]
                      </span>
                      <span className="text-slate-300">{r.test}</span>
                    </div>
                    <Badge
                      className={`text-[9px] font-mono px-1 py-0 shrink-0 ${
                        r.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase7Summary && (
            <div className="p-3 bg-slate-950 rounded-xl border border-blue-800/80 text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between font-mono font-semibold">
                <span className="text-blue-400">
                  Relatório da Bateria da Fase 7 — Realtime Centralizado, SSE & Multiusuário (
                  {phase7Summary.passed}/{phase7Summary.total} Aprovados)
                </span>
                <Badge
                  className={`text-[10px] font-mono ${
                    phase7Summary.failed === 0
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  {phase7Summary.failed === 0 ? '100% VERDE' : `${phase7Summary.failed} FALHAS`}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {phase7Summary.results.map((r, idx) => (
                  <div
                    key={`${r.suite}_${idx}`}
                    className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-[11px]"
                  >
                    <div className="truncate pr-2">
                      <span className="text-blue-400 font-mono text-[10px] mr-1">[{r.suite}]</span>
                      <span className="text-slate-300">{r.test}</span>
                    </div>
                    <Badge
                      className={`text-[9px] font-mono px-1 py-0 shrink-0 ${
                        r.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phase8Summary && (
            <div className="p-3 bg-slate-950 rounded-xl border border-purple-800/80 text-xs space-y-2 mt-2">
              <div className="flex items-center justify-between font-mono font-semibold">
                <span className="text-purple-300">
                  Relatório da Bateria da Fase 8 — Evolution API, Gateway NOX & Segurança (
                  {phase8Summary.passed}/{phase8Summary.total} Aprovados)
                </span>
                <Badge
                  className={`text-[10px] font-mono ${
                    phase8Summary.failed === 0
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  {phase8Summary.failed === 0 ? '100% VERDE' : `${phase8Summary.failed} FALHAS`}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {phase8Summary.results.map((r, idx) => (
                  <div
                    key={`${r.suite}_${idx}`}
                    className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-[11px]"
                  >
                    <div className="truncate pr-2">
                      <span className="text-purple-400 font-mono text-[10px] mr-1">
                        [{r.suite}]
                      </span>
                      <span className="text-slate-300">{r.test}</span>
                    </div>
                    <Badge
                      className={`text-[9px] font-mono px-1 py-0 shrink-0 ${
                        r.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border-rose-800'
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Backend & Isolation Details */}
        <div className="nox-glass-card rounded-2xl p-5 space-y-3 border border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" /> Protocolo de Isolamento do Sentinela
              NOX
            </h2>
            <Badge className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border-emerald-800">
              STRICT ISOLATION VERIFIED
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="font-mono text-cyan-300 font-bold">1. Zero Write no Sentinela</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Nenhum endpoint de escrita, banco de dados ou repositório do Sentinela é acessado.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="font-mono text-cyan-300 font-bold">
                2. Integridade de Bytes SHA-256
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Toda importação calcula o hash SHA-256 e guarda o arquivo original em buffer
                imutável.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="font-mono text-cyan-300 font-bold">3. Reversibilidade e Rollback</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                O NOX Control Center pode ser desinstalado ou resetado sem qualquer efeito colateral
                no Sentinela.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
