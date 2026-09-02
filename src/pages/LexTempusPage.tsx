import React, { useState, useEffect } from 'react'
import {
  Clock,
  Lock,
  ArrowRight,
  Code,
  CheckCircle2,
  Cpu,
  FileCheck,
  Layers,
  HelpCircle,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Search,
  Scale,
  Calendar,
  Eye,
  Check,
  X,
  FileText,
  AlertOctagon,
  Terminal,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LexTempusInputV1, LexTempusResultV1, LexTempusAiInterpretation } from '@/types/nox'
import {
  processPublicationWithLexTempus,
  homologateLexTempusResult,
  interpretPublicationWithAi,
} from '@/services/lexTempusService'
import { dataStore } from '@/services/dataStore'
import { LEGAL_RULES_PRESETS } from '@/services/deadlineEngine'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

const SAMPLE_PUBLICATIONS = [
  {
    id: 'snt-1',
    processo: '0002891-44.2026.8.26.0100',
    tribunal: 'TJSP',
    orgao: '23ª Vara Cível Central de São Paulo',
    classe: 'Procedimento Comum Cível',
    partes: 'Alfa Logística S/A x Banco Mercúrio S.A.',
    dataDisp: '2026-09-01',
    teor: 'Vistos. Trata-se de ação de cobrança. Diante do exposto, DEFIRO A TUTELA DE URGÊNCIA pleiteada para determinar a imediata suspensão de apontamentos restritivos no SERASA/SPC, sob pena de multa diária de R$ 1.000,00. Intimem-se as partes com urgência para cumprimento e eventual interposição do recurso cabível.',
    label: 'Decisão Liminar (Tutela de Urgência)',
  },
  {
    id: 'snt-2',
    processo: '1004523-88.2026.8.12.0001',
    tribunal: 'TJMS',
    orgao: '2ª Vara de Fazenda Pública de Campo Grande',
    classe: 'Ação Anulatória de Débito Fiscal',
    partes: 'Mineração Pantanal Ltda x Estado de Mato Grosso do Sul',
    dataDisp: '2026-09-02',
    teor: 'SENTENÇA. Ante o exposto e considerando tudo o mais que dos autos consta, JULGO IMPROCEDENTE o pedido inicial, extinguindo o feito com resolução do mérito nos termos do Art. 487, I do CPC. Condeno a autora ao pagamento de custas e honorários advocatícios fixados em 10% sobre o valor da causa. Publique-se. Intimem-se para interposição de Apelação no prazo da lei.',
    label: 'Sentença de Mérito (Apelação)',
  },
  {
    id: 'snt-3',
    processo: '0019231-12.2026.5.24.0002',
    tribunal: 'TRT24',
    orgao: '2ª Vara do Trabalho de Campo Grande',
    classe: 'Reclamação Trabalhista',
    partes: 'Carlos Alberto Souza x Construtora Aliança S.A.',
    dataDisp: '2026-09-03',
    teor: 'DISPOSITIVO DA SENTENÇA TRABALHISTA. Acolho em parte os pedidos para condenar a reclamada ao pagamento de horas extras e reflexos. Custas pela ré. Intimem-se as partes nos moldes do art. 895, I da CLT para recurso ordinário.',
    label: 'Sentença Trabalhista (CLT)',
  },
  {
    id: 'snt-4',
    processo: '5001234-55.2026.4.03.6000',
    tribunal: 'TRF3',
    orgao: '3ª Vara Federal Cível de Campo Grande',
    classe: 'Mandado de Segurança',
    partes: 'Farmácia Central Ltda x Delegado da Receita Federal',
    dataDisp: '2026-09-04',
    teor: 'Certidão de publicação com trecho truncado: "Recebidos os autos em gabinete... diga o interessado em termos gerais..." [Sem delimitação clara do ato e sem certidão de intimação eletrônica anexa].',
    label: 'Texto Ambíguo (Aciona Trava de Incerteza)',
  },
]

export const LexTempusPage: React.FC = () => {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0)
  const [numeroProcesso, setNumeroProcesso] = useState(SAMPLE_PUBLICATIONS[0].processo)
  const [tribunal, setTribunal] = useState(SAMPLE_PUBLICATIONS[0].tribunal)
  const [orgaoJulgador, setOrgaoJulgador] = useState(SAMPLE_PUBLICATIONS[0].orgao)
  const [classeJudicial, setClasseJudicial] = useState(SAMPLE_PUBLICATIONS[0].classe)
  const [partes, setPartes] = useState(SAMPLE_PUBLICATIONS[0].partes)
  const [dataDisponibilizacao, setDataDisponibilizacao] = useState(SAMPLE_PUBLICATIONS[0].dataDisp)
  const [conteudoPublicacao, setConteudoPublicacao] = useState(SAMPLE_PUBLICATIONS[0].teor)

  const [isProcessing, setIsProcessing] = useState(false)
  const [currentResult, setCurrentResult] = useState<LexTempusResultV1 | null>(null)
  const [activeTab, setActiveTab] = useState<'cockpit' | 'contract' | 'audit'>('cockpit')
  const [recentAuditLogs, setRecentAuditLogs] = useState(
    dataStore.getAuditLogs().filter((l) => l.category === 'lex_tempus'),
  )

  const lawyerProfile = dataStore.getLawyerProfile()

  const handleSelectSample = (idx: number) => {
    setSelectedSampleIndex(idx)
    const s = SAMPLE_PUBLICATIONS[idx]
    setNumeroProcesso(s.processo)
    setTribunal(s.tribunal)
    setOrgaoJulgador(s.orgao)
    setClasseJudicial(s.classe)
    setPartes(s.partes)
    setDataDisponibilizacao(s.dataDisp)
    setConteudoPublicacao(s.teor)
    setCurrentResult(null)
  }

  const handleRunLexTempus = async () => {
    if (!conteudoPublicacao || conteudoPublicacao.trim().length < 5) {
      toast.error('Insira o texto da publicação a ser interpretada.')
      return
    }

    setIsProcessing(true)
    const input: LexTempusInputV1 = {
      version: '1.0.0',
      systemSource: 'NOX-CONTROL-CENTER',
      recordCode: `LEX-${Date.now().toString().slice(-6)}`,
      numeroProcesso,
      tribunal,
      orgaoJulgador,
      classeJudicial,
      assunto: 'Interpretação e Cálculo Temporal',
      partes,
      dataDisponibilizacao,
      conteudoPublicacao,
      metadata: {
        origem: 'LEX_TEMPUS_COCKPIT',
      },
    }

    try {
      const res = await processPublicationWithLexTempus(input, {
        actor: lawyerProfile.nome,
        comarca: 'Capital',
      })
      setCurrentResult(res)

      if (res.status === 'CALCULATED') {
        toast.success('Interpretação IA + Cálculo Determinístico concluídos!', {
          description: `Vencimento fatal: ${res.deadlineMemorial?.finalDeadlineDate} (${res.aiInterpretation?.tipoPrazoNome})`,
        })
      } else {
        toast.warning('Interpretação incerta: trava de segurança ativada!', {
          description:
            'A IA identificou ambiguidades. O item foi encaminhado para revisão manual sem cálculo adivinhado.',
        })
      }

      setRecentAuditLogs(dataStore.getAuditLogs().filter((l) => l.category === 'lex_tempus'))
    } catch (err: any) {
      toast.error('Erro ao processar no LEX TEMPUS: ' + (err?.message || 'Falha de conexão.'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleHomologate = (veredicto: 'ACEITO' | 'REJEITADO') => {
    if (!currentResult) return

    homologateLexTempusResult({
      recordCodeOrId: numeroProcesso,
      numeroProcesso,
      veredicto,
      actor: lawyerProfile.nome,
      aiInterpretation: currentResult.aiInterpretation,
      memorialCalculado: currentResult.deadlineMemorial,
      justificativa:
        veredicto === 'ACEITO'
          ? `Homologação formal pelo advogado titular ${lawyerProfile.nome}. Prazo distribuído.`
          : 'Rejeição fundamentada pelo advogado: regra processual requer ajuste manual.',
    })

    if (veredicto === 'ACEITO' && currentResult.deadlineMemorial?.isDeterminable) {
      toast.success('Prazo Homologado com Sucesso!', {
        description: `Gravado em audit_logs (lex_tempus). Vencimento confirmado para ${currentResult.deadlineMemorial.finalDeadlineDate}.`,
      })
    } else {
      toast.info('Veredito registrado em audit_logs.', {
        description: 'Sugestão da IA recusada/ajustada pelo operador para aprimoramento do motor.',
      })
    }

    setRecentAuditLogs(dataStore.getAuditLogs().filter((l) => l.category === 'lex_tempus'))
  }

  useEffect(() => {
    // Executa análise inicial da primeira amostra para demonstração rica imediata
    handleRunLexTempus()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-purple-400" />
              LEX TEMPUS
            </h1>
            <Badge className="bg-purple-950 text-purple-300 border-purple-700 font-mono text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-300" /> IA QUALITATIVA + CÁLCULO
              DETERMINÍSTICO
            </Badge>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Módulo de Inteligência Temporal. A IA interpreta o texto da publicação e sugere a regra;
            o motor determinístico calcula as datas com precisão matemática; o advogado homologa.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-lg text-xs font-mono">
          <Button
            size="sm"
            variant={activeTab === 'cockpit' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('cockpit')}
            className={`h-7 text-xs font-mono ${
              activeTab === 'cockpit' ? 'bg-purple-700 text-white font-bold' : 'text-slate-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5 mr-1" /> Cockpit Operacional
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'contract' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('contract')}
            className={`h-7 text-xs font-mono ${
              activeTab === 'contract' ? 'bg-purple-700 text-white font-bold' : 'text-slate-400'
            }`}
          >
            <Code className="w-3.5 h-3.5 mr-1" /> Contrato JSON v1.0
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'audit' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('audit')}
            className={`h-7 text-xs font-mono ${
              activeTab === 'audit' ? 'bg-purple-700 text-white font-bold' : 'text-slate-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Auditoria ({recentAuditLogs.length})
          </Button>
        </div>
      </div>

      {/* Regra de Ouro Banner */}
      <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/60 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-purple-200 font-mono text-sm flex items-center gap-2">
            Regra de Ouro Inviolável do LEX TEMPUS
            <Badge className="bg-purple-900/80 text-purple-200 border-purple-600 text-[10px] font-mono">
              100% Determinístico
            </Badge>
          </div>
          <p className="text-purple-300/90 leading-relaxed">
            <strong>A IA NUNCA faz a conta do prazo.</strong> Contagem de dias úteis, exclusão do
            dia de início (Art. 224 CPC), feriados nacionais/regimentais e prorrogações continuam
            100% no motor <code>calculateLegalDeadline</code> (sem alucinação preclusiva). A IA
            entra <em>exclusivamente</em> para ler publicações complexas, identificar o{' '}
            <code>atoGerador</code> e sugerir a regra cabível nos <code>LEGAL_RULES_PRESETS</code>.
          </p>
        </div>
      </div>

      {activeTab === 'cockpit' && (
        <div className="space-y-6">
          {/* Sample Selector */}
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Casos de Teste e Amostras de Publicações Reais:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {SAMPLE_PUBLICATIONS.map((sample, idx) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(idx)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    selectedSampleIndex === idx
                      ? 'bg-purple-950/60 border-purple-500 shadow-md ring-1 ring-purple-500/40 text-purple-100'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono px-1.5 py-0 ${
                        sample.id === 'snt-4'
                          ? 'border-amber-700 text-amber-400 bg-amber-950/40'
                          : 'border-purple-700 text-purple-300 bg-purple-950/40'
                      }`}
                    >
                      {sample.tribunal}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-500">#{sample.id}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate">{sample.label}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    {sample.processo}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input & Execution Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Form (5 cols) */}
            <div className="lg:col-span-5 space-y-4 nox-glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-mono uppercase font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  Publicação Judicial de Entrada
                </h3>
                <span className="text-[10px] font-mono text-slate-500">LexTempusInputV1</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-slate-400 text-[11px] font-mono">Número CNJ</Label>
                    <Input
                      value={numeroProcesso}
                      onChange={(e) => setNumeroProcesso(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200 h-8 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px] font-mono">Tribunal / Órgão</Label>
                    <Input
                      value={tribunal}
                      onChange={(e) => setTribunal(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200 h-8 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-slate-400 text-[11px] font-mono">Classe Judicial</Label>
                    <Input
                      value={classeJudicial}
                      onChange={(e) => setClasseJudicial(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-[11px] font-mono">
                      Data Disponibilização
                    </Label>
                    <Input
                      type="date"
                      value={dataDisponibilizacao}
                      onChange={(e) => setDataDisponibilizacao(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-slate-200 h-8 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-400 text-[11px] font-mono">Partes</Label>
                  <Input
                    value={partes}
                    onChange={(e) => setPartes(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-200 h-8 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-slate-400 text-[11px] font-mono">
                      Teor Completo da Publicação
                    </Label>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Anti-Prompt-Injection Ativo
                    </span>
                  </div>
                  <Textarea
                    rows={6}
                    value={conteudoPublicacao}
                    onChange={(e) => setConteudoPublicacao(e.target.value)}
                    placeholder="Cole aqui o texto da intimação, despacho, sentença ou certidão do DJEN/PJe..."
                    className="bg-slate-950 border-slate-800 text-slate-200 text-xs leading-relaxed font-sans"
                  />
                </div>

                <Button
                  onClick={handleRunLexTempus}
                  disabled={isProcessing}
                  className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold h-9 text-xs shadow-lg shadow-purple-950 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin text-purple-300" />
                      Interpretando via Google Gemini + Motor NOX...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-purple-300" />
                      Executar Pipeline LEX TEMPUS (IA + Motor Determinístico)
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right Column: Execution Output & Memorial (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {currentResult ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl border nox-glass-card ${
                      currentResult.status === 'CALCULATED'
                        ? 'bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-purple-800/80'
                        : 'bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-amber-800/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`font-mono text-xs ${
                              currentResult.status === 'CALCULATED'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : 'bg-amber-950 text-amber-300 border-amber-700'
                            }`}
                          >
                            {currentResult.status === 'CALCULATED'
                              ? 'PRAZO DETERMINADO COM SUCESSO'
                              : 'INTERPRETAÇÃO INCERTA — REVISÃO MANUAL'}
                          </Badge>
                          <span className="text-[11px] font-mono text-slate-400">
                            Confiança IA:{' '}
                            <strong
                              className={
                                currentResult.aiInterpretation?.nivelConfiancaInterpretacao ===
                                'alta'
                                  ? 'text-emerald-400'
                                  : currentResult.aiInterpretation?.nivelConfiancaInterpretacao ===
                                      'media'
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                              }
                            >
                              {currentResult.aiInterpretation?.nivelConfiancaInterpretacao?.toUpperCase() ||
                                'N/A'}
                            </strong>
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-white">
                          {currentResult.deadlineMemorial?.legalRuleName || 'Regra Processual'}
                        </h3>
                        <p className="text-xs text-slate-300 font-mono">
                          {currentResult.deadlineMemorial?.legalRuleArticle}
                        </p>
                      </div>

                      {/* Dates Box */}
                      {currentResult.deadlineMemorial?.isDeterminable ? (
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[105px]">
                            <div className="text-[9px] font-mono uppercase text-slate-400">
                              Prazo Interno
                            </div>
                            <div className="text-xs font-bold text-amber-400 font-mono">
                              {currentResult.deadlineMemorial.internalDeadlineDate}
                            </div>
                            <div className="text-[8px] text-slate-500 font-mono">Garantia D-2</div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800 text-center min-w-[125px] shadow-lg shadow-rose-950/50">
                            <div className="text-[9px] font-mono uppercase text-rose-300 font-semibold">
                              Vencimento Fatal
                            </div>
                            <div className="text-base font-black text-rose-400 font-mono">
                              {currentResult.deadlineMemorial.finalDeadlineDate}
                            </div>
                            <div className="text-[8px] text-rose-300/80 font-mono">
                              {currentResult.deadlineMemorial.finalDeadlineTime || '23:59:59 (PJe)'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-center text-xs font-mono text-amber-300 max-w-[220px]">
                          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                          Cálculo automático bloqueado por segurança para evitar preclusão.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2-Layer Explanation Box (Qualitative AI + Deterministic Math) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                    {/* Layer 1: AI Qualitative Reasoning */}
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-2.5 nox-glass-card">
                      <div className="flex items-center justify-between border-b border-purple-800/40 pb-1.5">
                        <span className="font-bold text-purple-200 font-mono flex items-center gap-1.5 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Camada 1:
                          Interpretação IA
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono text-purple-300 border-purple-700"
                        >
                          {currentResult.aiInterpretation?.modeloUtilizado ||
                            'gemini-3.5-flash-lite'}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400 font-mono">
                            Ato Processual Identificado:
                          </span>
                          <div className="font-semibold text-slate-100">
                            {currentResult.aiInterpretation?.atoGerador}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 font-mono">
                            Regra do Preset Sugerida:
                          </span>
                          <div className="font-mono text-cyan-300">
                            {currentResult.aiInterpretation?.tipoPrazoSugerido}
                          </div>
                        </div>

                        <div>
                          <span className="text-slate-400 font-mono">Fundamentação:</span>
                          <div className="text-slate-300">
                            {currentResult.aiInterpretation?.fundamentacaoRegra}
                          </div>
                        </div>

                        {currentResult.aiInterpretation?.pontosDeAtencao && (
                          <div className="p-2 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[10px]">
                            <strong>Atenção:</strong>{' '}
                            {currentResult.aiInterpretation.pontosDeAtencao}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Layer 2: Deterministic Engine Math */}
                    <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/50 space-y-2.5 nox-glass-card">
                      <div className="flex items-center justify-between border-b border-cyan-800/40 pb-1.5">
                        <span className="font-bold text-cyan-200 font-mono flex items-center gap-1.5 text-[11px]">
                          <Scale className="w-3.5 h-3.5 text-cyan-400" /> Camada 2: Motor
                          Determinístico
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono text-cyan-300 border-cyan-700"
                        >
                          CPC/2015 Art. 219/224
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between font-mono">
                          <span className="text-slate-400">Marco Inicial (Disponibilização):</span>
                          <span className="text-slate-200">{dataDisponibilizacao} (Excluído)</span>
                        </div>

                        <div className="flex justify-between font-mono">
                          <span className="text-slate-400">1º Dia Útil Contado:</span>
                          <span className="text-cyan-300">
                            {currentResult.deadlineMemorial?.firstDayCounted || 'N/A'}
                          </span>
                        </div>

                        <div className="flex justify-between font-mono">
                          <span className="text-slate-400">Total de Dias e Tipo:</span>
                          <span className="text-slate-200 font-bold">
                            {currentResult.deadlineMemorial?.daysCount} dias{' '}
                            {currentResult.deadlineMemorial?.daysType}
                          </span>
                        </div>

                        <div className="flex justify-between font-mono">
                          <span className="text-slate-400">Feriados/Suspensões no Período:</span>
                          <span className="text-amber-400">
                            {currentResult.deadlineMemorial?.holidaysApplied?.length || 0}{' '}
                            aplicada(s)
                          </span>
                        </div>

                        {currentResult.motivoTravamentoSugerido && (
                          <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[10px]">
                            <strong>Motivo Travamento (Produção):</strong>{' '}
                            {currentResult.motivoTravamentoSugerido}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step-by-Step Calculation Steps */}
                  {currentResult.deadlineMemorial?.calculationSteps &&
                    currentResult.deadlineMemorial.calculationSteps.length > 0 && (
                      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            Passos Matemáticos da Contagem (
                            {currentResult.deadlineMemorial.calculationSteps.length} etapas)
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            Auditabilidade Absoluta
                          </span>
                        </div>

                        <div className="divide-y divide-slate-800/80 text-xs max-h-52 overflow-y-auto pr-1">
                          {currentResult.deadlineMemorial.calculationSteps.map((step, idx) => (
                            <div
                              key={idx}
                              className={`py-2 px-2.5 flex items-center justify-between rounded transition-colors ${
                                !step.isBusinessDay
                                  ? 'bg-slate-950/40 text-slate-400'
                                  : 'text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-[10px] text-slate-500 w-5">
                                  #{step.stepNumber}
                                </span>
                                <span className="font-mono text-cyan-400 font-semibold">
                                  {step.date}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  ({step.dayOfWeek})
                                </span>
                                <span className="text-slate-300 text-[11px] truncate max-w-[280px]">
                                  {step.description}
                                </span>
                              </div>
                              <Badge
                                className={`text-[9px] font-mono ${
                                  step.isBusinessDay
                                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                                }`}
                              >
                                {step.isBusinessDay ? 'ÚTIL' : 'SUSPENSO'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Homologation & Human Approval Actions */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5 text-slate-300">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Camada 3: Homologação
                        Humana Obrigatória
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Responsável Técnico: <strong>{lawyerProfile.nome}</strong> (
                        {lawyerProfile.oab})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleHomologate('REJEITADO')}
                        className="h-8 text-xs border-rose-800/80 text-rose-300 hover:bg-rose-950/60"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Rejeitar / Ajustar Regra
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleHomologate('ACEITO')}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Homologar Prazo
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[320px] rounded-2xl border border-slate-800 bg-slate-900/40 p-8 flex flex-col items-center justify-center text-center space-y-3">
                  <Clock className="w-10 h-10 text-purple-400/50" />
                  <div className="text-sm font-bold text-slate-300">
                    Aguardando execução do pipeline
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Clique em &quot;Executar Pipeline LEX TEMPUS&quot; para acionar a interpretação
                    via Google Gemini e a contagem matemática determinística.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contract' && (
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
              <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 font-mono text-[10px]">
                TypeScript Strict
              </Badge>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto leading-relaxed max-h-96">
              {JSON.stringify(
                {
                  version: '1.0.0',
                  systemSource: 'NOX-CONTROL-CENTER',
                  recordCode: `LEX-${numeroProcesso.replace(/\D/g, '').slice(0, 8)}`,
                  numeroProcesso,
                  tribunal,
                  orgaoJulgador,
                  classeJudicial,
                  assunto: 'Indenização / Obrigações',
                  partes,
                  dataDisponibilizacao,
                  conteudoPublicacao,
                  metadata: {
                    origem_sentinela: 'DJEN_API_CNJ',
                    antiPromptInjection: true,
                  },
                },
                null,
                2,
              )}
            </pre>
          </div>

          {/* Output Contract: LexTempusResultV1 */}
          <div className="nox-glass-card rounded-2xl p-5 space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-mono uppercase font-bold text-white">
                  Contrato de Saída Produzido (LexTempusResultV1)
                </h3>
              </div>
              <Badge className="bg-purple-950 text-purple-300 border-purple-800 font-mono text-[10px]">
                Ativo & Auditado
              </Badge>
            </div>

            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-300/90 overflow-x-auto leading-relaxed max-h-96">
              {JSON.stringify(
                currentResult || {
                  contractVersion: '1.0.0',
                  status: 'CALCULATED',
                  active: true,
                  disclaimer:
                    'A IA interpreta o ato e sugere a regra; o motor matemático calcula a data determinística; o ser humano homologa.',
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Trilha de Auditoria Exclusiva do LEX TEMPUS (audit_logs: categoria
              &apos;lex_tempus&apos;)
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Total de Registros: {recentAuditLogs.length}
            </span>
          </div>

          <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900/80 border border-slate-800 nox-glass-card overflow-hidden">
            {recentAuditLogs.length > 0 ? (
              recentAuditLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-2 hover:bg-slate-950/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-purple-950/60 text-purple-300 border-purple-800"
                      >
                        {log.action}
                      </Badge>
                      <span className="font-mono text-xs text-slate-200 font-bold">
                        {log.targetId || 'lex_tempus'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(log.createdAt).toLocaleString('pt-BR')} | Ator: {log.actor}
                    </span>
                  </div>

                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[10px] font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                Nenhum registro de auditoria do LEX TEMPUS gravado nesta sessão.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Architecture Overview Flowchart */}
      <div className="nox-glass-card rounded-2xl p-6 border border-slate-800 space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase font-bold text-white tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Pipeline Integrado do LEX TEMPUS: Da Publicação à Produção
          </h2>
          <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 font-mono text-[10px]">
            Fluxo Homologado
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">1. Ingestão & Sanitização</span>
              <Badge className="text-[9px] px-1 py-0 bg-slate-800 text-slate-300">Sentinela</Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Captura via DJEN/PJe com <code>sanitizeExternalText</code> e bloqueio de
              prompt-injection.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-purple-300 font-bold">2. IA Qualitativa</span>
              <Badge className="text-[9px] px-1 py-0 bg-purple-950 text-purple-400 border-purple-800">
                gemini-3.5-flash-lite
              </Badge>
            </div>
            <p className="text-[11px] text-purple-200/80 font-sans">
              Extrai <code>atoGerador</code> e sugere a regra do CPC/CLT sem nunca calcular datas.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-cyan-300 font-bold">3. Motor Determinístico</span>
              <Badge className="text-[9px] px-1 py-0 bg-cyan-950 text-cyan-400 border-cyan-800">
                100% CPC
              </Badge>
            </div>
            <p className="text-[11px] text-cyan-200/80 font-sans">
              <code>calculateLegalDeadline</code> calcula feriados, dias úteis e vencimento exato.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold">4. Homologação Humana</span>
              <Badge className="text-[9px] px-1 py-0 bg-emerald-950 text-emerald-400 border-emerald-800">
                Obrigatória
              </Badge>
            </div>
            <p className="text-[11px] text-emerald-200/80 font-sans">
              Advogado aprova o prazo, que sincroniza com Tarefas, Agenda e Produção NOX.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LexTempusPage
