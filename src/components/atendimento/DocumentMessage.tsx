import React from 'react'
import { MessageMediaAttachment } from '@/types/atendimento'
import { FileText, FileImage, FileCode, Download, Eye, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface DocumentMessageProps {
  attachment: MessageMediaAttachment
  isIncoming: boolean
  className?: string
}

export const DocumentMessage: React.FC<DocumentMessageProps> = ({
  attachment,
  isIncoming,
  className,
}) => {
  const { fileName, fileSize = '1.2 MB', mimeType } = attachment

  const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')
  const isImage = mimeType.includes('image') || /\.(jpg|jpeg|png|webp)$/i.test(fileName)
  const isDoc =
    mimeType.includes('word') ||
    mimeType.includes('officedocument') ||
    /\.(docx|doc)$/i.test(fileName)

  const getFileIcon = () => {
    if (isPdf) return <FileText className="w-5 h-5 text-rose-400 shrink-0" />
    if (isImage) return <FileImage className="w-5 h-5 text-cyan-400 shrink-0" />
    return <FileCode className="w-5 h-5 text-amber-400 shrink-0" />
  }

  const handlePreview = () => {
    toast.info(`Visualizar documento: ${fileName}`, {
      description: 'Ambiente seguro de sandbox NOX: execução de código e scripts desabilitada.',
    })
  }

  const handleDownload = () => {
    toast.info(`Download de custódia: ${fileName}`, {
      description: 'Arquivo demonstrativo de mock gravado com hash de integridade.',
    })
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-slate-700/80 bg-[#060a15]/90 space-y-2 max-w-sm',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
          {getFileIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-100 truncate" title={fileName}>
            {fileName}
          </div>
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span className="uppercase">
              {isPdf ? 'PDF' : isDoc ? 'DOCX' : isImage ? 'IMAGEM' : 'DOC'}
            </span>
            <span>&bull;</span>
            <span>{fileSize}</span>
          </div>
        </div>
      </div>

      {/* Ações Seguras de Sandbox */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
        <button
          onClick={handlePreview}
          className="flex-1 py-1 px-2 rounded bg-slate-800/80 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono font-semibold flex items-center justify-center gap-1 transition-colors"
        >
          <Eye className="w-3 h-3" />
          <span>Visualizar</span>
        </button>

        <button
          onClick={handleDownload}
          className="py-1 px-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-[11px] font-mono flex items-center justify-center gap-1 transition-colors"
          title="Baixar arquivo seguro"
        >
          <Download className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
