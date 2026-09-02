import React, { useState, useEffect, useMemo } from 'react'
import {
  Download,
  FileSpreadsheet,
  Code,
  ShieldCheck,
  Filter,
  CheckCircle2,
  Layers,
  FileCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { dataStore } from '@/services/dataStore'
import { sanitizeCsvField } from '@/services/csvEngine'
import { NoxRecord, ImportBatch } from '@/types/nox'
import { toast } from 'sonner'

export const ExportsPage: React.FC = () => {
  const [records, setRecords] = useState<NoxRecord[]>(dataStore.getRecords())
  const [imports, setImports] = useState<ImportBatch[]>(dataStore.getImports())

  // Export Filter Selection
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedTribunal, setSelectedTribunal] = useState<string>('all')
  const [neutralizeFormulas, setNeutralizeFormulas] = useState(true)

  useEffect(() => {
    const unsub = dataStore.subscribe(() => {
      setRecords(dataStore.getRecords())
      setImports(dataStore.getImports())
    })
    return unsub
  }, [])

  const tribunals = useMemo(
    () => Array.from(new Set(records.map((r) => r.tribunal))).sort(),
    [records],
  )

  const targetRecords = useMemo(() => {
    if (exportScope === 'all') return records
    return records.filter((r) => {
      if (selectedSeverity !== 'all' && r.severity !== selectedSeverity) return false
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false
      if (selectedTribunal !== 'all' && r.tribunal !== selectedTribunal) return false
      return true
    })
  }, [records, exportScope, selectedSeverity, selectedStatus, selectedTribunal])

  // Export 1: CSV Normalizado (Derived with CSV Injection Neutralization)
  const handleExportNormalizedCsv = () => {
    const headers = [
      'codigo_nox',
      'numero_processo_cnj',
      'tribunal_padrao',
      'uf',
      'orgao_julgador',
      'classe_judicial',
      'assunto_principal',
      'polo_ativo',
      'polo_passivo',
      'valor_causa',
      'status_operacional',
      'severidade_alerta',
      'tipo_alerta',
      'titulo_alerta',
      'responsavel',
      'prioridade',
      'tags',
      'data_atualizacao',
    ]

    const rows = targetRecords.map((r) => {
      const rowData = [
        r.recordCode,
        r.normalizedData.processoFormatado || r.numeroProcesso,
        r.normalizedData.tribunalPadrao || r.tribunal,
        r.normalizedData.uf,
        r.orgaoJulgador,
        r.classeJudicial,
        r.normalizedData.assuntoPrincipal || r.assunto,
        r.normalizedData.poloAtivo,
        r.normalizedData.poloPassivo,
        r.valorCausa ? String(r.valorCausa) : '',
        r.status,
        r.severity,
        r.alertType,
        r.alertTitle,
        r.responsible,
        r.priority,
        r.tags.join(';'),
        r.updatedAt,
      ]

      return rowData
        .map((val) => (neutralizeFormulas ? sanitizeCsvField(val) : String(val)))
        .join(';')
    })

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nox_processos_normalizados_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    dataStore.logAction('EXPORTACAO_CSV_NORMALIZADO', 'exportacao', 'Operador NOX', 'EXP-CSV-01', {
      total_registros: targetRecords.length,
      neutralizacao_formula: neutralizeFormulas,
      filtros: { severidade: selectedSeverity, status: selectedStatus, tribunal: selectedTribunal },
    })

    toast.success('CSV Normalizado gerado e auditado com sucesso.')
  }

  // Export 2: JSON Canônico Completo
  const handleExportCanonicalJson = () => {
    const exportPayload = {
      exportMetadata: {
        generator: 'NOX CONTROL CENTER v1.0',
        exportedAt: new Date().toISOString(),
        totalRecords: targetRecords.length,
        sanitizationPolicy: 'RFC4180-Safe',
        schemaVersion: '1.0.0',
      },
      records: targetRecords,
    }

    const jsonStr = JSON.stringify(exportPayload, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nox_dataset_canonico_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    dataStore.logAction('EXPORTACAO_JSON_CANONICO', 'exportacao', 'Operador NOX', 'EXP-JSON-01', {
      total_registros: targetRecords.length,
      filtros: { severidade: selectedSeverity, status: selectedStatus, tribunal: selectedTribunal },
    })

    toast.success('JSON Canônico exportado com sucesso.')
  }

  // Export 3: Untouched Raw CSV
  const handleExportOriginalCsv = (batch: ImportBatch) => {
    const blob = new Blob([batch.rawContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ORIGINAL_SENTINELA_${batch.filename}`
    a.click()
    URL.revokeObjectURL(url)

    dataStore.logAction(
      'EXPORTACAO_CSV_ORIGINAL_INTOCADO',
      'exportacao',
      'Operador NOX',
      batch.id,
      {
        filename: batch.filename,
        hash_sha256: batch.hash,
      },
    )

    toast.success('Arquivo original do Sentinela preservado exportado byte a byte.')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Download className="w-6 h-6 text-cyan-400" />
              Central de Exportações
            </h1>
            <Badge className="bg-cyan-950 text-cyan-400 border-cyan-800 font-mono text-xs">
              Múltiplos Formatos
            </Badge>
            {dataStore.isUsingRealImportedData() ? (
              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 font-mono text-xs flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LOTE ATIVO REAL ({targetRecords.length})
              </Badge>
            ) : (
              <Badge className="bg-amber-950/70 text-amber-300 border-amber-800 font-mono text-xs">
                DATASET SINTÉTICO (DEMO)
              </Badge>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Geração de dados em CSV original intocado, CSV normalizado com proteção contra CSV
            Formula Injection ou JSON Canônico.
          </p>
        </div>
      </div>

      {/* Export Configurations Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 nox-glass-card rounded-2xl p-6 space-y-5 border border-cyan-500/20">
          <div>
            <h2 className="text-sm font-mono uppercase font-bold text-white tracking-wider">
              1. Configuração de Escopo e Filtros
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina quais registros farão parte do pacote de exportação derivado.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setExportScope('filtered')
                }}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos os Status</option>
                <option value="novo">Novo</option>
                <option value="em_revisao">Em Revisão</option>
                <option value="processado">Processado</option>
                <option value="quarentena">Quarentena</option>
                <option value="resolvido">Resolvido</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                Severidade
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => {
                  setSelectedSeverity(e.target.value)
                  setExportScope('filtered')
                }}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todas Severidades</option>
                <option value="critico">Crítico</option>
                <option value="alto">Alto</option>
                <option value="medio">Médio</option>
                <option value="informativo">Informativo</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                Tribunal
              </label>
              <select
                value={selectedTribunal}
                onChange={(e) => {
                  setSelectedTribunal(e.target.value)
                  setExportScope('filtered')
                }}
                className="w-full h-8 bg-slate-900 border border-slate-700 rounded-md px-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos os Tribunais</option>
                {tribunals.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Neutralization Checkbox */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={neutralizeFormulas}
                  onChange={(e) => setNeutralizeFormulas(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-cyan-500"
                />
                <span className="text-xs font-semibold text-slate-200">
                  Neutralizar CSV Formula Injection (Prefixo &apos;)
                </span>
              </label>
              <Badge
                variant="outline"
                className="text-[9px] font-mono text-emerald-400 border-emerald-800"
              >
                SEGURANÇA RECOMENDADA
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
              Campos que começam com <code>=</code>, <code>+</code>, <code>-</code> ou{' '}
              <code>@</code> serão escapados com apóstrofo para impedir execução de macros no
              Microsoft Excel e LibreOffice. O CSV original intocado NÃO é modificado.
            </p>
          </div>

          {/* Export Action Cards */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono uppercase font-semibold text-slate-400">
              2. Escolha o Formato de Saída ({targetRecords.length} registros selecionados):
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option 1: CSV Normalizado */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>CSV Normalizado NOX</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Planilha padronizada com colunas CNJ, metadados de severidade, responsáveis,
                    tags e campos normalizados.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleExportNormalizedCsv}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Baixar CSV Normalizado
                </Button>
              </div>

              {/* Option 2: JSON Canônico */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                    <Code className="w-4 h-4" />
                    <span>JSON Canônico (API Ready)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Estrutura completa com objeto de origem bruto, dados enriquecidos, notas,
                    histórico e validações.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleExportCanonicalJson}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Baixar JSON Canônico
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Original Bytes Re-export Panel */}
        <div className="lg:col-span-4 nox-glass-card rounded-2xl p-6 space-y-4 border border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white font-mono uppercase">
                Reexportar CSV Original
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Baixe cópias idênticas dos arquivos brutos fornecidos pelo Sentinela NOX, preservando
              encoding original, delimitador e hash SHA-256 verificado.
            </p>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Lotes Armazenados:
              </span>
              {imports.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="font-mono font-bold text-slate-200 truncate">{b.filename}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    SHA: {b.hash.slice(0, 16)}...
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportOriginalCsv(b)}
                    className="w-full h-7 text-[11px] bg-slate-950 border-slate-700 text-cyan-300 hover:text-cyan-200 font-mono"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Baixar Original Intocado
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-500">
            Todas as exportações são registradas permanentemente no log de auditoria do sistema.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportsPage
