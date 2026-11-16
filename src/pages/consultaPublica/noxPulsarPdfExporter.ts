import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { SentinelaCommunication } from '@/types/sentinela'

/**
 * NOX PULSAR: gerador de relatório em PDF, 100% client side.
 *
 * Nada é gravado em banco, localStorage ou memória do sistema: o arquivo
 * é montado na memória do navegador e baixado imediatamente.
 *
 * Sem menção a fontes técnicas (API, endpoint, serviço de comunicação):
 * apenas linguagem da marca ("Fonte oficial", "Varredura", "Malha de tribunais").
 *
 * Regra da ferramenta: nenhum travessão ou meia-risca em texto de interface.
 */

const AMARELO = '#F5B301'
const CIANO = '#22D3EE'
const TEXTO = '#1E293B'
const TEXTO_SUAVE = '#475569'
const LINHA = '#E2E8F0'

const cleanText = (value: unknown): string =>
  String(value ?? '')
    // Remove travessões e meia-riscas (regra da ferramenta)
    .replace(/[—–]/g, ' ')
    // Normaliza espaços e quebras para o fluxo do PDF
    .replace(/\s+/g, ' ')
    .trim()

const formatarDataBr = (iso?: string): string => {
  const raw = cleanText(iso)
  if (!raw) return 'não informada'
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[3]}/${match[2]}/${match[1]}`
  return raw
}

const formatarDataHora = (d: Date): string =>
  d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const TIPO_LABEL: Record<string, string> = {
  INTIMACAO: 'Intimação',
  CITACAO: 'Citação',
  NOTIFICACAO: 'Notificação',
  PUBLICACAO: 'Publicação',
  DESPACHO: 'Despacho',
  SENTENCA: 'Sentença',
  ACORDAO: 'Acórdão',
}

const tipoLabel = (raw: unknown): string => {
  const tipo = cleanText(raw).toUpperCase()
  return TIPO_LABEL[tipo] || (tipo ? tipo.charAt(0) + tipo.slice(1).toLowerCase() : 'não informado')
}

export interface PdfExportInput {
  /** Publicações da busca atual (já com o filtro de tipo aplicado) */
  publicacoes: SentinelaCommunication[]
  /** Âncora ativa, ex.: "OAB/MS 15.400" */
  ancora: string
  /** Parte monitorada informada no protocolo */
  parte: string
  /** Malha de tribunais selecionada */
  tribunalSigla: string
  /** Janela temporal da varredura */
  dataInicio: string
  dataFim: string
  /** Número de registros capturados antes do filtro de tipo */
  totalCapturado: number
}

const TRUNCAR_TEOR = 700

/**
 * Gera e baixa o PDF da varredura atual. Nada é gravado em banco, localStorage
 * ou memória do sistema: o arquivo vive apenas na memória do navegador e é
 * baixado imediatamente.
 */
export const gerarPdfNoxPulsar = (input: PdfExportInput): void => {
  const { publicacoes, ancora, parte, tribunalSigla, dataInicio, dataFim, totalCapturado } = input

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const MARGEM_X = 14
  const MARGEM_TOPO = 16
  const MARGEM_RODAPE = 16

  const citacoes = publicacoes.filter((c) => String(c.tipoComunicacao || '').includes('CIT')).length
  const intimacoes = publicacoes.filter((c) =>
    String(c.tipoComunicacao || '').includes('INTIM'),
  ).length
  const urgentes = publicacoes.filter(
    (c) => c.urgencyLevel === 'alta' || c.urgencyLevel === 'critica',
  ).length
  const buildTeor = (c: SentinelaCommunication): string => {
    const teor = cleanText(c.teorCompleto || c.teorResumido || 'Teor não informado.')
    if (teor.length <= TRUNCAR_TEOR) return teor
    return `${teor.slice(0, TRUNCAR_TEOR)}...`
  }

  // Cabeçalho com a identidade NOX Pulsar
  doc.setFillColor(AMARELO)
  doc.rect(0, 0, pageWidth, 6, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(AMARELO)
  doc.text('NOX Pulsar', MARGEM_X, 24)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(CIANO)
  doc.text('Varredura do Diário de Justiça Eletrônico Nacional', MARGEM_X, 30)

  doc.setFontSize(8.5)
  doc.setTextColor(TEXTO_SUAVE)
  doc.text('Uma criação de Higor Utinoi · NOX Intelligence', MARGEM_X, 35)

  // Identificação da emissão, à direita
  doc.setFontSize(9)
  doc.setTextColor(TEXTO)
  doc.text(`Emitido em: ${formatarDataHora(new Date())}`, pageWidth - MARGEM_X, 24, {
    align: 'right',
  })
  doc.setFontSize(9)
  doc.setTextColor(TEXTO_SUAVE)
  doc.text('Fonte oficial: Diário de Justiça Eletrônico Nacional', pageWidth - MARGEM_X, 29, {
    align: 'right',
  })

  // Bloco de âncora e filtros usados
  let y = 44
  doc.setDrawColor(LINHA)
  doc.line(MARGEM_X, y, pageWidth - MARGEM_X, y)
  y += 7

  const filtroTexto = [
    `Âncora profissional: ${ancora}`,
    `Parte monitorada: ${parte ? cleanText(parte) : 'todas'}`,
    `Malha de tribunais: ${tribunalSigla ? cleanText(tribunalSigla) : 'Todos os tribunais do Brasil'}`,
    `Janela temporal: ${formatarDataBr(dataInicio)} a ${formatarDataBr(dataFim)}`,
  ]
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(TEXTO)
  filtroTexto.forEach((linha) => {
    doc.text(linha, MARGEM_X, y)
    y += 5
  })

  // Resumo de telemetria
  y += 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(AMARELO)
  doc.text('Telemetria da varredura', MARGEM_X, y)
  y += 6

  const telemetria: [string, string][] = [
    ['Publicações Capturadas', String(totalCapturado)],
    ['Citações', String(citacoes)],
    ['Intimações', String(intimacoes)],
    ['Prazos Críticos', String(urgentes)],
  ]
  const caixaLarg = (pageWidth - MARGEM_X * 2 - 3 * 3) / 4
  telemetria.forEach(([rotulo, valor], i) => {
    const x = MARGEM_X + i * (caixaLarg + 3)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, y, caixaLarg, 16, 1.5, 1.5, 'F')
    doc.setDrawColor(LINHA)
    doc.roundedRect(x, y, caixaLarg, 16, 1.5, 1.5, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(CIANO)
    doc.text(valor, x + caixaLarg / 2, y + 7, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(TEXTO_SUAVE)
    doc.text(rotulo, x + caixaLarg / 2, y + 13, { align: 'center' })
  })
  y += 22

  // Tabela das publicações (jspdf autotable, com quebra de célula)
  const agora = new Date()
  autoTable(doc, {
    startY: y,
    head: [
      ['#', 'Data', 'Tipo', 'Tribunal', 'Unidade de origem', 'Processo', 'Resumo da publicação'],
    ],
    body: publicacoes.map((c, i) => [
      String(i + 1),
      formatarDataBr(c.dataDisponibilizacao),
      tipoLabel(c.tipoComunicacao),
      cleanText(c.tribunal) || 'não informado',
      cleanText(c.orgaoJulgador) || 'não informado',
      cleanText(c.numeroProcesso) || 'não informado',
      buildTeor(c),
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.8,
      overflow: 'linebreak',
      valign: 'top',
      lineColor: LINHA,
      lineWidth: 0.1,
      minCellHeight: 6,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 51],
      textColor: [245, 251, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { cellWidth: 30 },
      5: { cellWidth: 30 },
      6: { cellWidth: 'auto' },
    },
    margin: { left: MARGEM_X, right: MARGEM_X, top: 18, bottom: MARGEM_RODAPE },
  })

  // Rodapé em todas as páginas, com contagem exata (após a tabela saber quantas foram)
  const totalPaginasPdf = doc.getNumberOfPages()
  for (let p = 1; p <= totalPaginasPdf; p += 1) {
    doc.setPage(p)
    const rodapeY = pageHeight - 9
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(TEXTO_SUAVE)
    doc.text('NOX Pulsar · Uma criação de Higor Utinoi · NOX Intelligence', MARGEM_X, rodapeY)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(`Página ${p} de ${totalPaginasPdf}`, pageWidth - MARGEM_X, rodapeY, { align: 'right' })
  }

  const nomeArquivo = `NOX-Pulsar-Consulta-Publica_${agora.toISOString().slice(0, 10)}_OAB-${ancora.replace(/[^0-9A-Za-z]/g, '')}.pdf`
  doc.save(nomeArquivo)
}

export default gerarPdfNoxPulsar
