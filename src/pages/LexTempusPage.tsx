import React, { useState } from 'react'
import {
  Clock,
  ShieldAlert,
  Lock,
  ArrowRight,
  Code,
  CheckCircle2,
  Cpu,
  FileCheck,
  Layers,
  HelpCircle,
  ToggleLeft,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LexTempusInputV1, LexTempusResultV1 } from '@/types/nox'
import { toast } from 'sonner'

export const LexTempusPage: React.FC = () => {
  const [featureFlagActive, setFeatureFlagActive] = useState(false)
  const [selectedMockProcess, setSelectedMockProcess] = useState('0002891-44.2026.8.26.0100')

  const sampleContractInput: LexTempusInputV1 = {
    version: '1.0.0',
    systemSource: 'NOX-CONTROL-CENTER',
    recordCode: 'SNT-9021',
    numeroProcesso: selectedMockProcess,
    tribunal: 'TJSP',
    orgaoJulgador: '23ª Vara Cível Central',
    classeJudicial: 'Procedimento Comum Cível',
    assunto: 'Indenização por Dano Material',
    partes: 'Alfa Logística e Participações S/A x Banco Mercurio do Brasil S.A.',
    dataDisponibilizacao: '2026-08-28',
    conteudoPublicacao:
      'Vistos. Defiro a tutela antecipada requerida para obstar atos de constrição...',
    metadata: {
      origem_sentinela: 'DJE_SP_CAPITAL',
      caderno: '1',
      pagina: 441,
    },
  }

  const sampleContractResult: LexTempusResultV1 = {
    contractVersion: '1.0.0',
    status: featureFlagActive ? 'MOCK_CALCULATED' : 'DISABLED',
    active: false,
    disclaimer:
      'Cálculo meramente ilustrativo. O motor de prazos LEX TEMPUS permanece desativado por política de feature flag nesta versão do NOX Control Center.',
    estimatedDeadlines: [
      {
        tipoPrazo: 'Agravo de Instrumento (Tutela Antecipada)',
        diasUteis: 15,
        fundamentoLegal: 'Art. 1.015, I c/c Art. 1.003, § 5º do CPC/2015',
        alertaPreventivo: 'Prazo peremptório fatal decorrente de intimação em diário oficial.',
      },
      {
        tipoPrazo: 'Contestação',
        diasUteis: 15,
        fundamentoLegal: 'Art. 335, I do CPC/2015',
        alertaPreventivo: 'Contagem a partir da audiência de conciliação ou ciência inequívoca.',
      },
    ],
    complianceChecks: [
      {
        nome: 'Validação de Numeração Única CNJ',
        aprovado: true,
        observacao: 'Padrão 20 dígitos regular conforme Resolução 65/CNJ.',
      },
      {
        nome: 'Identificação de Tribunal e Instância',
        aprovado: true,
        observacao: 'TJSP 1º Grau identificado com competência cível.',
      },
      {
        nome: 'Bloqueio de Prazos Fictícios',
        aprovado: true,
        observacao:
          'Garantia de que nenhum prazo é inferido sem certidão ou publicação verificada.',
      },
    ],
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-400" />
              LEX TEMPUS
            </h1>
            <Badge className="bg-purple-950 text-purple-300 border-purple-800 font-mono text-xs">
              INTEGRAÇÃO FUTURA — AINDA NÃO ATIVA
            </Badge>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Módulo futuro de cálculo preditivo de prazos jurídicos e conformidade processual com
            revisão humana obrigatória.
          </p>
        </div>

        {/* Mock Feature Flag Toggle */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg text-xs font-mono">
          <span className="text-slate-400 text-[11px]">Feature Flag LEX_TEMPUS_ENABLED:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFeatureFlagActive(!featureFlagActive)
              toast(
                featureFlagActive
                  ? 'Feature flag desativada.'
                  : 'Feature flag mock ativada em ambiente de teste.',
              )
            }}
            className={`h-6 text-[10px] px-2 font-mono ${
              featureFlagActive
                ? 'bg-purple-950 text-purple-300 border-purple-600'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            {featureFlagActive ? 'FLAG: ON (MOCK)' : 'FLAG: OFF (DEFAULT)'}
          </Button>
        </div>
      </div>

      {/* Warning / Architecture Notice */}
      <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 flex items-start gap-3">
        <Lock className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-purple-200 font-mono text-sm">
            Garantia de Integridade e Não-Intervenção Jurídica
          </div>
          <p className="text-purple-300/80 leading-relaxed">
            O NOX Control Center <strong>não calcula prazos reais em produção</strong> e{' '}
            <strong>não declara prazo vencido</strong> com base em rótulos genéricos. Todo o
            contrato de integração tipado (<code>LexTempusInputV1</code> /{' '}
            <code>LexTempusResultV1</code>) já está definido e preparado para conexão modular assim
            que os motores homologados forem certificados.
          </p>
        </div>
      </div>

      {/* End-to-End Architectural Pipeline Flowchart */}
      <div className="nox-glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase font-bold text-white tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Fluxo da Arquitetura: Sentinela → NOX → LEX TEMPUS → Revisão Humana
          </h2>
          <span className="text-[10px] font-mono text-slate-500">Pipeline Homologado</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          {/* Step 1: Sentinela */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">1. Sentinela NOX</span>
              <Badge className="text-[9px] px-1 py-0 bg-slate-800 text-slate-300">Origem</Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Exportação do CSV com cópias de publicações e intimações. Intocável e isolado.
            </p>
          </div>

          {/* Step 2: NOX Control Center */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-cyan-300 font-bold">2. NOX Control</span>
              <Badge className="text-[9px] px-1 py-0 bg-cyan-950 text-cyan-400 border-cyan-800">
                Atual
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Ingestão de CSV, cálculo SHA-256, radar topográfico de severidade e triagem.
            </p>
          </div>

          {/* Step 3: LEX TEMPUS (Future) */}
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-2 relative opacity-90">
            <div className="flex items-center justify-between">
              <span className="text-purple-300 font-bold">3. LEX TEMPUS</span>
              <Badge className="text-[9px] px-1 py-0 bg-purple-950 text-purple-400 border-purple-800">
                Futuro
              </Badge>
            </div>
            <p className="text-[11px] text-purple-200/80 font-sans">
              Contrato versionado v1.0, motor preditivo de prazos do CPC/CLT e checagens de regras.
            </p>
          </div>

          {/* Step 4: Human Review */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-800/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold">4. Revisão Humana</span>
              <Badge className="text-[9px] px-1 py-0 bg-emerald-950 text-emerald-400 border-emerald-800">
                Obrigatória
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Advogado ou operador homologa o prazo, despacha petição e confere certidão.
            </p>
          </div>
        </div>
      </div>

      {/* Contract & Mock Adapter Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input Contract: LexTempusInputV1 */}
        <div className="nox-glass-card rounded-2xl p-5 space-y-3 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono uppercase font-bold text-white">
                Contrato de Entrada (LexTempusInputV1)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">TypeScript Strict</span>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto leading-relaxed max-h-80">
            {JSON.stringify(sampleContractInput, null, 2)}
          </pre>
        </div>

        {/* Output Contract: LexTempusResultV1 */}
        <div className="nox-glass-card rounded-2xl p-5 space-y-3 border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-mono uppercase font-bold text-white">
                Contrato de Saída Mock (LexTempusResultV1)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-purple-400">
              {featureFlagActive ? 'Simulado' : 'Desativado'}
            </span>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-300/90 overflow-x-auto leading-relaxed max-h-80">
            {JSON.stringify(sampleContractResult, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

export default LexTempusPage
