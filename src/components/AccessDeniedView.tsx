import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AccessDeniedViewProps {
  moduleName?: string
  moduleKey?: string
  requiredRole?: string
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  moduleName = 'este módulo',
  moduleKey,
  requiredRole,
}) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-rose-950/40">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        <Badge
          variant="outline"
          className="mb-3 px-3 py-1 font-mono text-[11px] bg-rose-950/40 text-rose-400 border-rose-800/60"
        >
          ACESSO RESTRITO
        </Badge>

        <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-2">
          Sem Acesso a Este Módulo
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          Seu perfil de usuário não possui permissão concedida para acessar{' '}
          <strong className="text-slate-200">{moduleName}</strong>.
          {requiredRole ? (
            <span className="block mt-1 text-xs text-amber-400/90 font-mono">
              Requer cargo: {requiredRole}
            </span>
          ) : (
            <span className="block mt-1 text-xs text-slate-400">
              Solicite a liberação ao administrador responsável do NOX Control Center.
            </span>
          )}
        </p>

        <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800/90 text-left text-xs mb-6 font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>Identificador:</span>
            <span className="text-cyan-400">{moduleKey || 'modulo_protegido'}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Política de Segurança:</span>
            <span className="text-slate-300">Dupla Camada (RBAC)</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Proteção:</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Ativa
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full sm:w-auto bg-slate-800/80 border-slate-700 hover:bg-slate-800 text-slate-200"
          >
            <Link to="/">
              <Home className="w-4 h-4 mr-2 text-cyan-400" />
              Voltar ao Início
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Página Anterior
          </Button>
        </div>
      </div>
    </div>
  )
}
