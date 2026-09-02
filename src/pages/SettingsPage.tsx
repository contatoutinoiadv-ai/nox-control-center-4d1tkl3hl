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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { dataStore, AppSettings } from '@/services/dataStore'
import { toast } from 'sonner'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(dataStore.getSettings())
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
    return unsub
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
