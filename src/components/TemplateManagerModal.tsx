import React, { useState, useEffect, useRef } from 'react'
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  Plus,
  BookOpen,
  Sparkles,
  Search,
  CheckCircle2,
  FileUp,
  Type,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { documentTemplateService, DocumentTemplateItem } from '@/services/documentTemplateService'
import { parseDocxFile, textToFormattedHtml } from '@/lib/docxParser'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

export interface TemplateManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplateToUse?: (template: DocumentTemplateItem) => void
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  open,
  onOpenChange,
  onSelectTemplateToUse,
}) => {
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Modais internos
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplateItem | null>(null)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)

  // Formulário de Criação / Importação
  const [importMode, setImportMode] = useState<'docx' | 'texto'>('docx')
  const [templateName, setTemplateName] = useState('')
  const [templateDesc, setTemplateDesc] = useState('')
  const [templateArea, setTemplateArea] = useState('todos')
  const [rawTextContent, setRawTextContent] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedHtmlPreview, setParsedHtmlPreview] = useState('')
  const [isParsingFile, setIsParsingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const list = await documentTemplateService.listTemplates()
      setTemplates(list)
    } catch (err) {
      console.error('Erro ao carregar modelos:', err)
      toast.error('Não foi possível carregar os modelos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  useEffect(() => {
    const unsub = documentTemplateService.subscribe(() => {
      loadTemplates()
    })
    return unsub
  }, [])

  // Manipular upload de arquivo .docx ou texto
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    if (!templateName.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
      setTemplateName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
    }

    setIsParsingFile(true)
    try {
      const res = await parseDocxFile(file)
      setParsedHtmlPreview(res.html)
      toast.success(`Arquivo "${file.name}" processado com sucesso!`)
    } catch (err: any) {
      console.error('Erro ao processar arquivo:', err)
      toast.error(err.message || 'Erro ao processar o arquivo .docx')
    } finally {
      setIsParsingFile(false)
    }
  }

  // Salvar Novo Modelo na Biblioteca
  const handleSaveNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateName.trim()) {
      toast.error('Informe um nome para o modelo.')
      return
    }

    let finalHtml = ''
    if (importMode === 'docx') {
      if (!parsedHtmlPreview) {
        toast.error('Envie um arquivo .docx ou cole o texto do modelo.')
        return
      }
      finalHtml = parsedHtmlPreview
    } else {
      if (!rawTextContent.trim()) {
        toast.error('Digite ou cole o texto do modelo.')
        return
      }
      finalHtml = textToFormattedHtml(rawTextContent)
    }

    try {
      await documentTemplateService.createTemplate({
        nome: templateName.trim(),
        descricao: templateDesc.trim() || 'Modelo importado pelo usuário',
        area: templateArea,
        tipoOrigem: importMode,
        corpoHtml: finalHtml,
        arquivoNome: uploadedFile?.name,
        icone: importMode === 'docx' ? '📂' : '📝',
      })

      toast.success(`Modelo "${templateName}" salvo na sua biblioteca!`)
      setCreateModalOpen(false)
      resetCreateForm()
      await loadTemplates()
    } catch (err: any) {
      console.error('Erro ao salvar modelo:', err)
      toast.error(err.message || 'Erro ao salvar modelo.')
    }
  }

  const resetCreateForm = () => {
    setTemplateName('')
    setTemplateDesc('')
    setTemplateArea('todos')
    setRawTextContent('')
    setUploadedFile(null)
    setParsedHtmlPreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Excluir Modelo
  const handleConfirmDelete = async () => {
    if (!deleteTemplateId) return
    try {
      await documentTemplateService.deleteTemplate(deleteTemplateId)
      toast.success('Modelo excluído com sucesso.')
      setDeleteTemplateId(null)
      await loadTemplates()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir modelo.')
    }
  }

  const filteredTemplates = templates.filter((tpl) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      tpl.nome.toLowerCase().includes(q) ||
      (tpl.descricao && tpl.descricao.toLowerCase().includes(q)) ||
      (tpl.area && tpl.area.toLowerCase().includes(q))
    )
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl w-[95vw] bg-slate-950 border border-slate-800 text-slate-100 max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/70 shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <span>Biblioteca de Modelos de Documentos</span>
                    <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 text-[10px] font-mono">
                      {templates.length} Modelos
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 font-mono mt-0.5">
                    Importe arquivos .docx ou crie minutas de referência para geração contextual.
                  </DialogDescription>
                </div>
              </div>

              <Button
                onClick={() => {
                  resetCreateForm()
                  setCreateModalOpen(true)
                }}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-8 px-3 gap-1.5 shadow-lg shadow-cyan-500/20"
              >
                <Plus className="w-4 h-4" />+ Importar / Novo Modelo
              </Button>
            </div>

            {/* Search Bar */}
            <div className="mt-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nome do modelo, área jurídica ou descrição..."
                className="h-8 pl-8.5 pr-3 bg-slate-900/90 border-slate-700 text-xs text-slate-100 placeholder:text-slate-500 rounded-lg focus-visible:ring-cyan-500"
              />
            </div>
          </DialogHeader>

          {/* Lista de Modelos */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-900/30">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-mono">
                Carregando modelos da biblioteca...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 space-y-3">
                <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Nenhum modelo encontrado com os termos pesquisados.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(true)}
                  className="text-xs border-slate-700 text-cyan-300"
                >
                  Importar Primeiro Modelo (.docx)
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTemplates.map((tpl) => {
                  const isSystem = tpl.isGlobal || tpl.tipoOrigem === 'sistema'
                  return (
                    <div
                      key={tpl.id}
                      className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl shrink-0">{tpl.icone || '📄'}</span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 truncate">
                                {tpl.nome}
                              </h4>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {isSystem
                                  ? 'Padrão NOX'
                                  : `Personalizado (${tpl.tipoOrigem || 'custom'})`}
                                {tpl.arquivoNome ? ` • ${tpl.arquivoNome}` : ''}
                              </div>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-[9px] font-mono shrink-0 ${
                              isSystem
                                ? 'border-cyan-800 text-cyan-300 bg-cyan-950/40'
                                : 'border-purple-800 text-purple-300 bg-purple-950/40'
                            }`}
                          >
                            {isSystem ? 'Sistema' : 'Meu Escritório'}
                          </Badge>
                        </div>

                        {tpl.descricao && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                            {tpl.descricao}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewTemplate(tpl)}
                            className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
                          >
                            <Eye className="w-3 h-3 text-cyan-400" />
                            Visualizar
                          </Button>

                          {!isSystem && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTemplateId(tpl.id)}
                              className="h-7 px-2 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Excluir
                            </Button>
                          )}
                        </div>

                        {onSelectTemplateToUse && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              onSelectTemplateToUse(tpl)
                              onOpenChange(false)
                            }}
                            className="h-7 px-2.5 text-[11px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Usar Modelo
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">
              * Modelos salvos ficam vinculados exclusivamente à sua conta.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs border-slate-700 text-slate-300"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL INTERNO: CRIAR / IMPORTAR MODELO */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 border border-slate-800 text-slate-100 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FileUp className="w-5 h-5 text-cyan-400" />
              Importar Novo Modelo de Peça / Contrato
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-mono">
              Envie um arquivo .docx do seu computador ou cole o texto padrão para servir de base.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNewTemplate} className="space-y-4 pt-2">
            {/* Escolha do Método de Importação */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setImportMode('docx')}
                className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-all ${
                  importMode === 'docx'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Arquivo .docx
              </button>
              <button
                type="button"
                onClick={() => setImportMode('texto')}
                className={`py-1.5 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-all ${
                  importMode === 'texto'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                Colar Texto Direto
              </button>
            </div>

            {/* Metadados do Modelo */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300 font-semibold">Nome do Modelo *</Label>
                <Input
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Contestação Trabalhista — Horas Extras"
                  className="bg-slate-900 border-slate-700 text-xs text-slate-100 focus-visible:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300 font-semibold">Área do Direito</Label>
                  <select
                    value={templateArea}
                    onChange={(e) => setTemplateArea(e.target.value)}
                    className="w-full h-9 bg-slate-900 border border-slate-700 rounded-md px-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="todos">Geral / Todas</option>
                    <option value="civel">Cível</option>
                    <option value="trabalhista">Trabalhista</option>
                    <option value="consumidor">Consumidor</option>
                    <option value="bancario">Bancário</option>
                    <option value="criminal">Criminal</option>
                    <option value="familia">Família</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-300 font-semibold">Descrição Rápida</Label>
                  <Input
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Ex: Modelo com preliminares e jurisprudência STJ"
                    className="bg-slate-900 border-slate-700 text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* Upload de DOCX */}
              {importMode === 'docx' ? (
                <div className="space-y-2 pt-1">
                  <Label className="text-xs text-slate-300 font-semibold">
                    Selecione o arquivo .docx *
                  </Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-6 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/70 transition-all space-y-2"
                  >
                    <Upload className="w-7 h-7 text-cyan-400 mx-auto" />
                    <div className="text-xs text-slate-200 font-medium">
                      {uploadedFile ? uploadedFile.name : 'Clique para selecionar o arquivo .docx'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Formato .docx (Word) • Suporta extração estruturada de parágrafos e títulos
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {isParsingFile && (
                    <div className="text-xs text-cyan-300 font-mono flex items-center gap-1.5 py-1">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      Lendo estrutura do arquivo Word...
                    </div>
                  )}

                  {parsedHtmlPreview && (
                    <div className="mt-2 space-y-1">
                      <Label className="text-[11px] font-mono text-slate-400">
                        Prévia do Conteúdo Extraído:
                      </Label>
                      <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(parsedHtmlPreview) }}
                        className="max-h-48 overflow-y-auto p-3.5 bg-white text-slate-950 rounded-lg text-xs leading-relaxed font-serif"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs text-slate-300 font-semibold">
                    Texto do Modelo (com ou sem placeholders como [NOME], [CPF], [DEMANDA]) *
                  </Label>
                  <textarea
                    rows={8}
                    required
                    value={rawTextContent}
                    onChange={(e) => setRawTextContent(e.target.value)}
                    placeholder="Cole aqui o corpo da minuta ou petição modelo..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
                  />
                  <div className="text-[10px] text-slate-400 font-mono">
                    Dica: use tags como [NOME], [CPF], [RG], [ENDERECO], [TELEFONE], [DEMANDA],
                    [DATA] para preenchimento automático.
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs border-slate-700 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isParsingFile}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Salvar Modelo na Biblioteca
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL INTERNO: VISUALIZAR MODELO */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(op) => !op && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-3xl bg-slate-950 border border-slate-800 text-slate-100 max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/80">
            <DialogTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>{previewTemplate?.nome}</span>
              <Badge className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border-cyan-800">
                {previewTemplate?.area || 'Geral'}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-mono">
              {previewTemplate?.descricao || 'Visualização da estrutura do modelo'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50 flex justify-center">
            <div className="w-full max-w-2xl bg-white text-slate-950 p-8 rounded-lg shadow-xl font-serif text-xs leading-relaxed border border-slate-300 min-h-[300px]">
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(previewTemplate?.corpoHtml || '<p>Sem conteúdo</p>'),
                }}
              />
            </div>
          </div>

          <DialogFooter className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewTemplate(null)}
              className="text-xs border-slate-700 text-slate-300"
            >
              Fechar Visualização
            </Button>
            {onSelectTemplateToUse && previewTemplate && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const tpl = previewTemplate
                  setPreviewTemplate(null)
                  onSelectTemplateToUse(tpl)
                  onOpenChange(false)
                }}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Usar Este Modelo na Geração
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(deleteTemplateId)}
        onOpenChange={(op) => !op && setDeleteTemplateId(null)}
      >
        <AlertDialogContent className="bg-slate-950 border border-slate-800 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-400 text-base flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Excluir este modelo da sua biblioteca?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-300">
              Esta ação removerá o modelo permanentemente da biblioteca do seu escritório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-900 border-slate-700 text-slate-200 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
