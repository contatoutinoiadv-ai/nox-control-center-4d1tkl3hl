import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo2,
  Redo2,
  Save,
  RotateCcw,
  Trash2,
  Printer,
  FileCheck2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

export interface DocumentReviewEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialHtml: string
  documentTitle: string
  clientName?: string
  templateName?: string
  onSaveAndFinalize: (finalHtml: string) => void
  onRegenerate?: () => void
  onDiscard?: () => void
}

export const DocumentReviewEditorModal: React.FC<DocumentReviewEditorModalProps> = ({
  open,
  onOpenChange,
  initialHtml,
  documentTitle,
  clientName,
  templateName,
  onSaveAndFinalize,
  onRegenerate,
  onDiscard,
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [currentHtml, setCurrentHtml] = useState<string>(initialHtml || '')
  const [hasChanges, setHasChanges] = useState<boolean>(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState<boolean>(false)
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState<boolean>(false)
  const [closeConfirmOpen, setCloseConfirmOpen] = useState<boolean>(false)

  // Quando o modal abre ou initialHtml muda, redefine o editor
  useEffect(() => {
    if (open) {
      setCurrentHtml(initialHtml || '')
      setHasChanges(false)
      if (editorRef.current) {
        editorRef.current.innerHTML = sanitizeHtml(initialHtml)
      }
    }
  }, [open, initialHtml])

  // Executa comandos de formatação usando document.execCommand
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    document.execCommand(command, false, value)
    handleEditorInput()
  }

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML
      setCurrentHtml(html)
      if (html !== initialHtml) {
        setHasChanges(true)
      }
    }
  }, [initialHtml])

  // Ações de Toolbar
  const handleBold = () => executeCommand('bold')
  const handleItalic = () => executeCommand('italic')
  const handleUnderline = () => executeCommand('underline')
  const handleUnorderedList = () => executeCommand('insertUnorderedList')
  const handleOrderedList = () => executeCommand('insertOrderedList')
  const handleAlignLeft = () => executeCommand('justifyLeft')
  const handleAlignCenter = () => executeCommand('justifyCenter')
  const handleAlignRight = () => executeCommand('justifyRight')
  const handleAlignJustify = () => executeCommand('justifyFull')
  const handleUndo = () => executeCommand('undo')
  const handleRedo = () => executeCommand('redo')

  // Salvar e Finalizar (usa o HTML exato do editor)
  const handleConfirmSave = () => {
    const finalHtml = editorRef.current ? editorRef.current.innerHTML : currentHtml
    if (!finalHtml || !finalHtml.trim()) {
      toast.error('O documento não pode estar vazio.')
      return
    }
    setHasChanges(false)
    onSaveAndFinalize(finalHtml)
  }

  // Imprimir diretamente a versão atual editada
  const handlePrint = () => {
    const finalHtml = editorRef.current ? editorRef.current.innerHTML : currentHtml
    const win = window.open('', '_blank', 'width=850,height=750')
    if (!win) {
      toast.error('Pop-up bloqueado pelo navegador. Permita pop-ups para imprimir.')
      return
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${documentTitle || 'Documento'} - ${clientName || 'NOX'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', serif; background: #fff; color: #000; padding: 48px 56px; line-height: 1.8; }
            h1, h2 { font-size: 15px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px; border-bottom: 1.5px solid #000; padding-bottom: 10px; }
            p { font-size: 12px; text-align: justify; margin-bottom: 14px; text-indent: 36px; }
            ul, ol { margin-left: 40px; margin-bottom: 14px; font-size: 12px; }
            .btn-print { position: fixed; top: 16px; right: 16px; background: #06b6d4; color: #000; border: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; z-index: 99; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
            @media print { .btn-print { display: none; } body { padding: 20px; } }
          </style>
        </head>
        <body>
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
          ${finalHtml}
        </body>
      </html>
    `)
    win.document.close()
  }

  // Tentar fechar / sair
  const handleRequestClose = () => {
    if (hasChanges) {
      setCloseConfirmOpen(true)
    } else {
      onOpenChange(false)
      if (onDiscard) onDiscard()
    }
  }

  // Confirmar Descarte
  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false)
    setCloseConfirmOpen(false)
    setHasChanges(false)
    onOpenChange(false)
    if (onDiscard) onDiscard()
    toast.info('Edição descartada.')
  }

  // Confirmar Gerar Novamente
  const handleConfirmRegenerate = () => {
    setRegenerateConfirmOpen(false)
    setHasChanges(false)
    if (onRegenerate) {
      onRegenerate()
      toast.info('Documento regerado a partir do modelo original.')
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleRequestClose()
          } else {
            onOpenChange(true)
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] bg-slate-950 border border-slate-800 text-slate-100 max-h-[94vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800/80 text-cyan-400">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                    <span>Etapa de Revisão: {documentTitle}</span>
                    {hasChanges && (
                      <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] font-mono">
                        Alterações não salvas
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 font-mono mt-0.5">
                    {clientName ? `Cliente: ${clientName} • ` : ''}
                    {templateName ? `Modelo: ${templateName}` : 'Edição rica'}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-950/70 text-cyan-300 border-cyan-800/80 text-[11px] font-mono flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Editor de Texto Rico NOX
                </Badge>
              </div>
            </div>

            {/* Toolbar de Formatação */}
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-1 flex-wrap bg-slate-950/60 p-1.5 rounded-lg border">
              {/* Desfazer / Refazer */}
              <div className="flex items-center gap-0.5 pr-1.5 border-r border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  title="Desfazer (Ctrl+Z)"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  title="Refazer (Ctrl+Y)"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Estilos Básicos: Negrito, Itálico, Sublinhado */}
              <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBold}
                  title="Negrito (Ctrl+B)"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 font-bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleItalic}
                  title="Itálico (Ctrl+I)"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUnderline}
                  title="Sublinhado (Ctrl+U)"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800 underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Listas */}
              <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUnorderedList}
                  title="Lista com marcadores"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <List className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOrderedList}
                  title="Lista numerada"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Alinhamento */}
              <div className="flex items-center gap-0.5 px-1.5 border-r border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAlignLeft}
                  title="Alinhar à esquerda"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAlignCenter}
                  title="Centralizar"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAlignRight}
                  title="Alinhar à direita"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAlignJustify}
                  title="Justificar"
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Botão de Impressão Rápida */}
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-7 px-2 text-[11px] border-slate-700 bg-slate-900 text-slate-300 hover:text-white gap-1"
                >
                  <Printer className="w-3 h-3 text-cyan-400" />
                  <span>Prévia Impressa</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Área do Documento A4 Editável */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900/50 flex justify-center">
            <div className="w-full max-w-3xl bg-white text-slate-950 p-8 md:p-12 rounded-xl shadow-2xl font-serif text-xs md:text-sm leading-relaxed border border-slate-300 min-h-[500px]">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onBlur={handleEditorInput}
                className="focus:outline-none min-h-[440px] select-text"
                style={{
                  minHeight: '440px',
                  color: '#0f172a',
                }}
              />
            </div>
          </div>

          {/* Footer com Botões Obrigatórios da Etapa de Revisão */}
          <DialogFooter className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-start">
              {/* Botão Descartar */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (hasChanges) {
                    setDiscardConfirmOpen(true)
                  } else {
                    handleConfirmDiscard()
                  }
                }}
                className="h-8 text-xs border-rose-900/50 text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Descartar
              </Button>

              {/* Botão Gerar Novamente */}
              {onRegenerate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (hasChanges) {
                      setRegenerateConfirmOpen(true)
                    } else {
                      handleConfirmRegenerate()
                    }
                  }}
                  className="h-8 text-xs border-slate-700 bg-slate-900 text-slate-300 hover:text-white gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  Gerar novamente
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Botão Salvar e Finalizar */}
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSave}
                className="h-8 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar e finalizar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Saída sem Salvar */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent className="bg-slate-950 border border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-400 text-base">
              <AlertTriangle className="w-5 h-5" />
              Descartar alterações na revisão?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-300">
              Você realizou edições no texto do documento que ainda não foram salvas. Se sair agora,
              todas as alterações manuais serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-900 border-slate-700 text-slate-200 text-xs">
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Sim, descartar e sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Descarte Direto */}
      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent className="bg-slate-950 border border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400 text-base">
              <Trash2 className="w-5 h-5" />
              Confirmar descarte do documento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-300">
              Tem certeza que deseja descartar esta minuta? O documento não será salvo na ficha do
              cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-900 border-slate-700 text-slate-200 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Confirmar Descarte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Regerar */}
      <AlertDialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <AlertDialogContent className="bg-slate-950 border border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-400 text-base">
              <RotateCcw className="w-5 h-5" />
              Regerar documento a partir do modelo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-300">
              Você possui edições não salvas no editor. Ao regerar o documento, todas as alterações
              manuais atuais serão substituídas pela estrutura padrão do modelo selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-900 border-slate-700 text-slate-200 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerate}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Regerar e Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
