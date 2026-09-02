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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { dataStore, AppSettings } from '@/services/dataStore'
import { toast } from 'sonner'

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(dataStore.getSettings())

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setSettings(dataStore.getSettings())
    })
    return unsub
  }, [])

  const handleToggle = (key: keyof AppSettings) => {
    const updated = { [key]: !settings[key] }
    dataStore.saveSettings(updated)
    toast.success('Preferência atualizada.')
  }

  const handleResetData = () => {
    if (
      confirm('Deseja redefinir todo o ambiente para os dados sintéticos determinísticos padrão?')
    ) {
      dataStore.resetToSyntheticDemo()
      toast.success('Ambiente redefinido para dados sintéticos determinísticos padrão.')
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
          Redefinir Dados Demo
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
