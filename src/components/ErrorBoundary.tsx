import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  moduleName?: string
  fallbackTitle?: string
  fallbackDescription?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[ErrorBoundary - ${this.props.moduleName || 'Global'}] Erro capturado:`,
      error,
      errorInfo,
    )
    this.setState({ error, errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  private handleNavigateHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.hash = '#/'
  }

  public render() {
    if (this.state.hasError) {
      const module = this.props.moduleName || 'Módulo'
      const title = this.props.fallbackTitle || `Falha temporária no ${module}`
      const description =
        this.props.fallbackDescription ||
        'Ocorreu uma exceção inesperada durante a execução deste componente. Seu estado anterior foi preservado e você pode tentar novamente ou retornar ao Início.'

      return (
        <div className="min-h-[360px] w-full p-6 my-4 rounded-2xl bg-gradient-to-br from-[#120a1c] via-[#0f172a] to-[#0a1128] border border-rose-500/40 shadow-2xl flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="max-w-lg space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/80 text-[11px] font-mono font-bold uppercase tracking-wider text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              Recuperação de Falha NOX
            </div>
            <h2 className="text-xl font-black text-slate-100 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
          </div>

          {this.state.error && (
            <div className="max-w-xl w-full p-3 rounded-lg bg-slate-950/90 border border-rose-900/50 text-left font-mono text-[11px] text-rose-300 overflow-x-auto max-h-32">
              <div className="text-[10px] uppercase text-slate-500 pb-1">
                Mensagem do erro técnico:
              </div>
              <div className="font-bold">
                {this.state.error.name}: {this.state.error.message}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              onClick={this.handleReset}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 px-4 flex items-center gap-2 shadow-md shadow-rose-950"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recarregar Componente
            </Button>
            <Button
              variant="outline"
              onClick={this.handleNavigateHome}
              className="bg-slate-900 border-slate-700 text-slate-200 hover:text-white text-xs h-9 px-4 flex items-center gap-2"
            >
              <Home className="w-3.5 h-3.5" />
              Ir para Início
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
