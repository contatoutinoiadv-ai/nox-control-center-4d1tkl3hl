import React, { useState, useEffect } from 'react'
import { NoxRecord, NoxClient } from '@/types/nox'
import {
  X,
  FileText,
  Database,
  GitCompare,
  History,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Tag,
  User,
  Calendar,
  DollarSign,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { NoxStatusBadge, NoxButton, NoxCard, NoxMono } from '@/design-system'
import { PreparacaoAudienciaControl } from '@/components/PreparacaoAudienciaControl'
import { dataStore } from '@/services/dataStore'
import { toast } from 'sonner'

interface ProcessDetailDrawerProps {
  record: NoxRecord
  onClose: () => void
  onUpdateRecord?: (updated: NoxRecord) => void
}

export const ProcessDetailDrawer: React.FC<ProcessDetailDrawerProps> = ({
  record,
  onClose,
  onUpdateRecord,
}) => {
  const [activeTab, setActiveTab] = useState<
    'resumo' | 'origem' | 'normalizacao' | 'historico' | 'lex_tempus'
  >('resumo')
  const [newNote, setNewNote] = useState('')
  const [currentRecord, setCurrentRecord] = useState<NoxRecord>(record)
  const [allClients, setAllClients] = useState<NoxClient[]>(dataStore.getClients())

  useEffect(() => {
    setCurrentRecord(record)
    setAllClients(dataStore.getClients())
  }, [record])

  const handleLinkClient = (clientId: string) => {
    if (!clientId) {
      if (currentRecord.clientId) {
        dataStore.unlinkProcessFromClient(
          currentRecord.clientId,
          currentRecord.numeroProcesso,
          'Operador NOX',
        )
        setCurrentRecord({ ...currentRecord, clientId: undefined, clientCode: undefined })
        toast.success('Processo desvinculado de qualquer cliente.')
      }
      return
    }

    const client = allClients.find((c) => c.id === clientId)
    if (!client) return

    dataStore.linkProcessToClient(client.id, currentRecord.numeroProcesso, 'Operador NOX')
    setCurrentRecord({
      ...currentRecord,
      clientId: client.id,
      clientCode: client.clientCode,
    })
    toast.success(`Processo vinculado ao cliente ${client.nome} (${client.clientCode}).`)
  }

  const handleAddNote = () => {
    if (!newNote.trim()) return
    dataStore.updateRecordDetails(currentRecord.id, { notes: newNote.trim() }, 'Operador NOX')
    const updated = dataStore.getRecordById(currentRecord.id)
    if (updated) {
      setCurrentRecord(updated)
      if (onUpdateRecord) onUpdateRecord(updated)
    }
    setNewNote('')
    toast.success('Nota operacional registrada no histórico.')
  }

  const handleStatusChange = (status: NoxRecord['status']) => {
    dataStore.updateRecordStatus(currentRecord.id, status, 'Operador NOX')
    const updated = dataStore.getRecordById(currentRecord.id)
    if (updated) {
      setCurrentRecord(updated)
      if (onUpdateRecord) onUpdateRecord(updated)
    }
    toast.success(`Status operacional alterado para "${status}".`)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[620px] lg:w-[680px] bg-slate-950/95 border-l border-slate-800 backdrop-blur-2xl z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      {/* Drawer Header padronizado com Design System */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <NoxMono className="font-bold text-cyan-300 text-xs">
              {currentRecord.recordCode}
            </NoxMono>
            <NoxStatusBadge status="RASCUNHO" customLabel={currentRecord.tribunal} size="sm" />
            <NoxStatusBadge
              status={
                currentRecord.severity === 'critico'
                  ? 'BLOQUEADO'
                  : currentRecord.severity === 'alto'
                    ? 'PENDENTE'
                    : 'RASCUNHO'
              }
              customLabel={currentRecord.severity}
              size="sm"
            />
          </div>
          <NoxMono className="text-sm text-slate-200 mt-2 truncate block font-bold">
            {currentRecord.numeroProcesso}
          </NoxMono>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Fechar painel de detalhes"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-5 border-b border-slate-800 bg-slate-900/20">
          <TabsList className="bg-transparent border-none p-0 h-10 gap-2">
            <TabsTrigger
              value="resumo"
              className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Resumo
            </TabsTrigger>
            <TabsTrigger
              value="origem"
              className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
            >
              <Database className="w-3.5 h-3.5 mr-1.5" /> Dados de Origem
            </TabsTrigger>
            <TabsTrigger
              value="normalizacao"
              className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
            >
              <GitCompare className="w-3.5 h-3.5 mr-1.5" /> Normalização
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono rounded-t-lg"
            >
              <History className="w-3.5 h-3.5 mr-1.5" /> Histórico
            </TabsTrigger>
            <TabsTrigger
              value="preparacao"
              className="data-[state=active]:bg-amber-950/80 data-[state=active]:text-amber-300 text-slate-400 text-xs font-mono"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" /> Preparação
            </TabsTrigger>
            <TabsTrigger
              value="lex_tempus"
              className="data-[state=active]:bg-cyan-950/80 data-[state=active]:text-cyan-300 text-slate-400 text-xs font-mono"
            >
              LEX TEMPUS
            </TabsTrigger>
          </TabsList>{' '}
        </div>

        {/* Tab 1: Resumo */}
        <TabsContent value="resumo" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          {/* Validation Warnings if any */}
          {currentRecord.validationErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Avisos de Qualidade / Quarentena</span>
              </div>
              {currentRecord.validationErrors.map((err, idx) => (
                <div key={idx} className="text-amber-200/90 pl-5 text-[11px]">
                  • <strong>{err.field}</strong>: {err.message}
                </div>
              ))}
            </div>
          )}

          {/* Alert Card */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                Alerta Detectado
              </span>
              <Badge className="text-[10px] uppercase font-mono">
                {currentRecord.alertType.replace('_', ' ')}
              </Badge>
            </div>
            <h3 className="text-sm font-bold text-white">{currentRecord.alertTitle}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentRecord.alertDescription}
            </p>
          </div>

          {/* Key Process Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Órgão Julgador</span>
              <div className="text-slate-200 font-medium mt-1">
                {currentRecord.orgaoJulgador || 'Não informado'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Classe Judicial
              </span>
              <div className="text-slate-200 font-medium mt-1">{currentRecord.classeJudicial}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Assunto Principal
              </span>
              <div className="text-slate-200 font-medium mt-1">{currentRecord.assunto}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Valor da Causa</span>
              <div className="text-emerald-400 font-mono font-bold mt-1">
                {currentRecord.valorCausa
                  ? currentRecord.valorCausa.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  : 'Não informado'}
              </div>
            </div>
          </div>

          {/* Partes */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Partes no Processo
            </span>
            <div className="text-xs text-slate-200 mt-1 font-mono leading-relaxed">
              {currentRecord.partes}
            </div>
          </div>

          {/* Operational Attributes & Client Link */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="text-[10px] font-mono text-slate-500 uppercase">
              Metadados Operacionais & Vínculo de Cliente
            </div>

            {/* Vínculo a Cliente (Requisito 3) */}
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-cyan-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Vincular a Cliente (Controladoria 360º):
                </span>
                {currentRecord.clientCode && (
                  <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px] font-mono">
                    {currentRecord.clientCode}
                  </Badge>
                )}
              </div>
              <select
                value={
                  currentRecord.clientId ||
                  allClients.find((c) =>
                    c.processosVinculados.includes(currentRecord.numeroProcesso),
                  )?.id ||
                  ''
                }
                onChange={(e) => handleLinkClient(e.target.value)}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- Sem vínculo com cliente (Não agrupado) --</option>
                {allClients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.clientCode} — {cli.nome} ({cli.demanda} / {cli.origem})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Responsável Atual:</span>
              <span className="text-slate-200 font-medium">{currentRecord.responsible}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Prioridade Operacional:</span>
              <Badge className="text-[10px] uppercase font-mono">{currentRecord.priority}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tags Associadas:</span>
              <div className="flex gap-1 flex-wrap">
                {currentRecord.tags.map((t, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[9px] font-mono border-slate-700 text-slate-300"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Dados de Origem (Untouched Sentinela CSV row) */}
        <TabsContent value="origem" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-slate-300">
                Preservação de Dados: Cópia idêntica da linha do CSV
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-slate-400">
              Linha #{currentRecord.sourceRowIndex}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Campos Originais Recebidos:
            </div>
            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              {Object.entries(currentRecord.rawSourceRow).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                >
                  <span className="font-mono text-cyan-400/90 font-semibold">{key}</span>
                  <span className="font-mono text-slate-300 break-all">
                    {String(val || '[CAMPO_EM_BRANCO]')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500 italic">
            * O NOX Control Center opera de forma passiva. Nenhum dado de origem é modificado ou
            sobrescrito.
          </div>
        </TabsContent>

        {/* Tab 3: Normalização (Comparison Original vs Normalized) */}
        <TabsContent value="normalizacao" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          <div className="text-xs text-slate-400">
            Comparativo entre o dado bruto recebido e a padronização realizada pelo motor NOX
            Intelligence.
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-500 uppercase">
                Número do Processo
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Original:</span>
                  <div className="font-mono text-slate-400 truncate">
                    {String(currentRecord.rawSourceRow['num_processo_cnj'] || '')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400 font-mono">Normalizado:</span>
                  <div className="font-mono text-cyan-300 truncate">
                    {currentRecord.normalizedData.processoFormatado}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Tribunal / Foro</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Original:</span>
                  <div className="font-mono text-slate-400">
                    {String(currentRecord.rawSourceRow['tribunal_sigla'] || '')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400 font-mono">Normalizado:</span>
                  <div className="font-mono text-cyan-300">
                    {currentRecord.normalizedData.tribunalPadrao} ({currentRecord.normalizedData.uf}
                    )
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-500 uppercase">
                Polos Processuais
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Polo Ativo:</span>
                  <div className="text-slate-300 font-mono text-xs">
                    {currentRecord.normalizedData.poloAtivo}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400 font-mono">Polo Passivo:</span>
                  <div className="text-slate-300 font-mono text-xs">
                    {currentRecord.normalizedData.poloPassivo}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-500 uppercase">
                Risco Estimado por Heurística
              </div>
              <Badge className="text-[10px] uppercase font-mono">
                {currentRecord.normalizedData.grauRiscoEstimado || 'Não avaliado'}
              </Badge>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Histórico & Notas */}
        <TabsContent value="historico" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Linha do Tempo de Ações:
            </div>
            <div className="space-y-2">
              {currentRecord.history.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs flex items-start gap-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>{h.actor}</span>
                      <span>{new Date(h.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-slate-200 mt-0.5">{h.action}</p>
                    {h.details && <p className="text-slate-400 text-[11px] mt-0.5">{h.details}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="pt-2">
              <div className="text-[11px] font-mono text-slate-400 uppercase mb-2">
                Notas da Equipe:
              </div>
              {currentRecord.notes.length === 0 ? (
                <div className="text-xs text-slate-500 italic">Nenhuma nota adicionada ainda.</div>
              ) : (
                <div className="space-y-2 mb-3">
                  {currentRecord.notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400">
                        <span>{n.author}</span>
                        <span>{new Date(n.createdAt).toLocaleTimeString('pt-BR')}</span>
                      </div>
                      <p className="text-slate-200 mt-1">{n.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escrever nota operacional..."
                  className="flex-1 h-8 bg-slate-900 border border-slate-700 rounded-md px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNote()
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  className="h-8 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs px-3"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab Preparação para Audiência */}
        <TabsContent value="preparacao" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          <PreparacaoAudienciaControl
            processNumber={currentRecord.numeroProcesso}
            clientId={currentRecord.clientId}
            title={`Preparação: Processo ${currentRecord.numeroProcesso}`}
          />
        </TabsContent>

        {/* Tab 5: LEX TEMPUS (Contract Preview) */}
        <TabsContent value="lex_tempus" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-300 font-mono flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" /> LEX TEMPUS v1.0 (Contrato
                Preparado)
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-mono text-purple-300 border-purple-700 bg-purple-950/60"
              >
                INTEGRAÇÃO FUTURA — DESATIVADA
              </Badge>
            </div>
            <p className="text-purple-200/80 leading-relaxed text-[11px]">
              O NOX Control Center já possui o contrato de interface padronizado (
              <code>LexTempusInputV1</code>). O cálculo preditivo de prazos jurídicos e regras
              processuais será ativado na próxima fase por feature flag.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-[11px] font-mono text-slate-400 uppercase">
              Payload Preparado para o LEX TEMPUS:
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90 overflow-x-auto leading-tight">
              {JSON.stringify(
                {
                  version: '1.0.0',
                  systemSource: 'NOX-CONTROL-CENTER',
                  recordCode: currentRecord.recordCode,
                  numeroProcesso: currentRecord.numeroProcesso,
                  tribunal: currentRecord.tribunal,
                  classeJudicial: currentRecord.classeJudicial,
                  assunto: currentRecord.assunto,
                  partes: currentRecord.partes,
                  statusFlag: 'DISABLED_BY_FEATURE_FLAG',
                },
                null,
                2,
              )}
            </pre>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1.5">
            <div className="font-mono text-slate-300 font-semibold">
              Garantia de Não-Intervenção:
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Nenhum prazo ou risco jurídico peremptório é inventado pelo NOX sem a validação do
              motor LEX TEMPUS ou revisão do operador.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Drawer Footer Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">Status:</span>
          <select
            value={currentRecord.status}
            onChange={(e) => handleStatusChange(e.target.value as NoxRecord['status'])}
            className="h-8 bg-slate-900 border border-slate-700 rounded-md px-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="novo">Novo</option>
            <option value="em_revisao">Em Revisão</option>
            <option value="processado">Processado</option>
            <option value="quarentena">Quarentena</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>

        <Button
          size="sm"
          onClick={onClose}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-8"
        >
          Fechar Painel
        </Button>
      </div>
    </div>
  )
}
