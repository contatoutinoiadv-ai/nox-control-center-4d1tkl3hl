import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Fingerprint,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { authUsersService } from '@/services/authUsersService'
import { dataStore } from '@/services/dataStore'
import { toast } from 'sonner'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Rota de destino após o login (se veio redirecionado) com validação defensiva
  const getDestinationPath = (): string => {
    try {
      if (
        location.state &&
        typeof location.state === 'object' &&
        'from' in location.state &&
        (location.state as any).from &&
        typeof (location.state as any).from === 'object' &&
        typeof (location.state as any).from.pathname === 'string'
      ) {
        const path = (location.state as any).from.pathname
        // Garante que é uma rota relativa interna válida
        if (path.startsWith('/') && !path.startsWith('//') && path !== '/login') {
          return path
        }
      }
    } catch (err) {
      console.warn('[LoginPage] Erro ao inspecionar location.state:', err)
    }
    return '/'
  }

  const fromLocation = getDestinationPath()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, informe seu e-mail e senha de acesso.')
      return
    }

    setLoading(true)
    try {
      const userProfile = await authUsersService.login(email, password)
      toast.success(`Bem-vindo, ${userProfile.user.name || userProfile.user.email}!`, {
        description: `Sessão autenticada com sucesso no perfil ${userProfile.role === 'admin' ? 'Administrador' : 'Operador'}.`,
      })

      // Orquestrar migração legada no primeiro bootstrap após o login
      const { legacyStorageAdapter } = await import('@/services/legacyStorageAdapter')
      if (legacyStorageAdapter.hasPendingLegacyData()) {
        legacyStorageAdapter
          .runFullMigration()
          .then(() => {
            dataStore.reloadFromPocketBase()
          })
          .catch((err) => {
            console.warn('Login bootstrap legacy migration warning:', err)
          })
      }

      navigate(fromLocation, { replace: true })
    } catch (err: any) {
      console.error('Falha no login:', err)
      const errorTxt =
        err.message ||
        'Não foi possível autenticar. Verifique suas credenciais ou contate o administrador.'
      setErrorMessage(errorTxt)
      toast.error('Falha na autenticação', {
        description: errorTxt,
      })
    } finally {
      setLoading(false)
    }
  }

  // Preenchimento rápido para contas conhecidas em desenvolvimento/homologação
  const handleQuickFill = (fillEmail: string) => {
    setEmail(fillEmail)
    setPassword('Skip@Pass')
    setErrorMessage(null)
  }

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden antialiased selection:bg-cyan-500 selection:text-slate-950">
      {/* Background Decorators */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-950/20 via-transparent to-blue-950/20 rounded-full blur-2xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-slate-900 border border-cyan-500/40 shadow-xl shadow-cyan-950/50 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-950 text-lg tracking-wider shadow-lg shadow-cyan-500/30">
              NOX
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">CONTROL CENTER</h1>
            <Badge
              variant="outline"
              className="bg-cyan-950/80 text-cyan-300 border-cyan-600/80 font-mono text-[10px]"
            >
              v1.0
            </Badge>
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Sistema Integrado de Inteligência Jurídica, Monitoramento Sentinela & Controladoria
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#0b1329]/90 border border-slate-800/90 rounded-2xl p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600" />

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  E-mail de Acesso
                </Label>
              </div>
              <Input
                type="email"
                required
                autoFocus
                placeholder="seu.email@escritorio.adv.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950/80 border-slate-800 text-xs text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  Senha
                </Label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950/80 border-slate-800 text-xs text-slate-100 placeholder:text-slate-400 focus:border-cyan-500 h-10 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold text-xs h-10 shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Access Badges for convenience */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2.5">
            <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold flex items-center justify-between">
              <span>Acesso Rápido por Perfil:</span>
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('contatoutinoiadv@gmail.com')}
                className="p-2 text-left rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all text-[11px] group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-cyan-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  Admin Master
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  contatoutinoiadv@gmail.com
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('atendimento@higorutinoi.com')}
                className="p-2 text-left rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/50 text-slate-300 hover:text-purple-300 transition-all text-[11px] group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-purple-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-purple-400" />
                  Naiara (Operador)
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  atendimento@higorutinoi.com
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-500" />
            <span>Autenticação Criptografada • RBAC Dupla Camada</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Trilha de auditoria e segurança ativa em conformidade com o padrão NOX.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
