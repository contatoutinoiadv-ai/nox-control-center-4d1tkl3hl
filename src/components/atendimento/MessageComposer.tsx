import React, { useState, useRef, useEffect } from 'react'
import { NoxButton } from '@/design-system'
import { cn } from '@/lib/utils'
import {
  Send,
  Paperclip,
  Lock,
  MessageSquare,
  Sparkles,
  Smile,
  AlertTriangle,
  AtSign,
  X,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

export type ComposerMode = 'CLIENT_MESSAGE' | 'INTERNAL_NOTE'

export interface MessageComposerProps {
  onSendMessage: (content: string, mentions?: string[]) => void
  onSendInternalNote: (content: string, mentions?: string[]) => void
  onAttachFile?: () => void
  disabled?: boolean
  className?: string
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onSendInternalNote,
  onAttachFile,
  disabled = false,
  className,
}) => {
  const [mode, setMode] = useState<ComposerMode>('CLIENT_MESSAGE')
  const [text, setText] = useState('')
  const [showMentionMenu, setShowMentionMenu] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Lista padronizada de usuários existentes para menções (@)
  const AVAILABLE_USERS = [
    { id: 'usr_higor', name: 'Higor Utinoi', role: 'Advogado Titular' },
    { id: 'usr_sec', name: 'Secretaria NOX', role: 'Controladoria' },
    { id: 'usr_gabriel', name: 'Gabriel Advogado', role: 'Advogado Associado' },
    { id: 'usr_triagem', name: 'Triagem IA', role: 'Oráculo Sentinela' },
  ]

  // Detecta digitação de @
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    // Se estiver no modo nota interna ou mensagem e digitou @
    const cursor = e.target.selectionStart || val.length
    const textBefore = val.slice(0, cursor)
    const atMatch = textBefore.match(/@(\w*)$/)
    if (atMatch) {
      setShowMentionMenu(true)
      setMentionFilter(atMatch[1].toLowerCase())
    } else {
      setShowMentionMenu(false)
    }
  }

  // Insere a menção no texto
  const insertMention = (userName: string) => {
    if (!textareaRef.current) return
    const cursor = textareaRef.current.selectionStart || text.length
    const textBefore = text.slice(0, cursor)
    const textAfter = text.slice(cursor)
    const newBefore = textBefore.replace(/@\w*$/, `@${userName} `)
    const newText = newBefore + textAfter
    setText(newText)
    setShowMentionMenu(false)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.selectionStart = newBefore.length
        textareaRef.current.selectionEnd = newBefore.length
      }
    }, 10)
  }

  // Extrai menções presentes no texto
  const extractMentions = (content: string): string[] => {
    const matches = content.match(/@([\w\s]+?)(?=\s|$|[.,!?])/g)
    if (!matches) return []
    return matches.map((m) => m.replace(/^@/, '').trim())
  }

  // Submissão do composer
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = text.trim()
    if (!clean || disabled) return

    const mentions = extractMentions(clean)

    if (mode === 'INTERNAL_NOTE') {
      onSendInternalNote(clean, mentions)
      toast.success('Nota interna registrada.', {
        description: 'Gravada com sucesso. Esta nota não é visível ao cliente.',
      })
    } else {
      onSendMessage(clean, mentions)
      toast.info('Mensagem enviada (MOCK/DEMO)', {
        description: 'Fase 5: Nenhum envio real ao WhatsApp disparado.',
      })
    }

    setText('')
    setShowMentionMenu(false)
  }

  // Tratamento de atalhos de teclado (Enter para enviar, Shift+Enter quebra linha)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Se o menu de menções estiver aberto, deixa o usuário escolher
      if (showMentionMenu) return
      e.preventDefault()
      handleSubmit()
    }
  }

  const isInternal = mode === 'INTERNAL_NOTE'

  const filteredUsers = AVAILABLE_USERS.filter((u) => u.name.toLowerCase().includes(mentionFilter))

  return (
    <div
      className={cn(
        'border-t transition-all select-none',
        isInternal ? 'bg-[#181106] border-amber-500/70' : 'bg-[#070c18] border-slate-800/80',
        className,
      )}
    >
      {/* SELETOR DE MODO: MENSAGEM AO CLIENTE vs NOTA INTERNA */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/40 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode('CLIENT_MESSAGE')}
            className={cn(
              'px-2.5 py-1 rounded-md font-mono text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 border',
              !isInternal
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60 shadow-sm'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200',
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Mensagem ao Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('INTERNAL_NOTE')}
            className={cn(
              'px-2.5 py-1 rounded-md font-mono text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 border',
              isInternal
                ? 'bg-amber-950 text-amber-300 border-amber-500/80 shadow-md shadow-amber-950'
                : 'bg-transparent text-slate-400 border-transparent hover:text-amber-300',
            )}
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Nota Interna</span>
          </button>
        </div>

        {/* ALERTA CRÍTICO: RÓTULO TEXTUAL INDELÉVEL EM MODO NOTA */}
        {isInternal ? (
          <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[10px] font-extrabold uppercase animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>NOTA INTERNA — NÃO SERÁ ENVIADA AO CLIENTE</span>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-slate-500">
            Enter envia &bull; Shift+Enter quebra linha
          </div>
        )}
      </div>

      {/* ÁREA DE DIGITAÇÃO E MENTIONS */}
      <div className="p-3 relative">
        {/* Menu Flutuante de Menções (@mentions) */}
        {showMentionMenu && filteredUsers.length > 0 && (
          <div className="absolute left-4 bottom-full mb-2 w-64 bg-[#0d1629] border border-cyan-600/60 rounded-lg shadow-xl shadow-black z-50 overflow-hidden">
            <div className="p-2 border-b border-slate-800 text-[10px] font-mono font-semibold uppercase text-slate-400 flex items-center justify-between">
              <span>Mencionar Colega</span>
              <X
                className="w-3 h-3 cursor-pointer hover:text-slate-200"
                onClick={() => setShowMentionMenu(false)}
              />
            </div>
            <div className="divide-y divide-slate-800/60 max-h-40 overflow-y-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => insertMention(u.name)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/80 flex items-center justify-between group transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                      @{u.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{u.role}</div>
                  </div>
                  <AtSign className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              isInternal
                ? 'Digite uma nota interna da equipe (ex: @Higor verificar documento de citação)...'
                : 'Digite a resposta ao cliente... (Fase 5: MOCK/DEMO operacional)'
            }
            className={cn(
              'w-full min-h-[72px] max-h-36 p-3 rounded-lg text-xs font-sans transition-all resize-y focus:outline-none',
              isInternal
                ? 'bg-[#0f0b04] text-amber-100 placeholder:text-amber-400/50 border border-amber-600/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40'
                : 'bg-[#050811] text-slate-100 placeholder:text-slate-500 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40',
            )}
          />

          {/* BARRA DE AÇÕES DO COMPOSER */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={
                  onAttachFile ||
                  (() =>
                    toast.info('Anexar arquivo', {
                      description: 'Janela de upload seguro de custódia NOX.',
                    }))
                }
                title="Anexar documento ou evidência"
                className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setText((prev) => prev + ' @')
                  setShowMentionMenu(true)
                }}
                title="Mencionar membro da equipe (@)"
                className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
              >
                <AtSign className="w-4 h-4" />
              </button>
            </div>

            {/* BOTÃO DE ENVIO COM RÓTULO E COMPORTAMENTO VISUALMENTE DISTINTOS */}
            <div className="flex items-center gap-2">
              <NoxButton
                type="submit"
                disabled={!text.trim() || disabled}
                size="sm"
                icon={isInternal ? Lock : Send}
                className={cn(
                  'h-8 px-4 text-xs font-mono font-bold tracking-wider uppercase transition-all',
                  isInternal
                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-950',
                )}
              >
                {isInternal ? 'Gravar Nota Interna' : 'Enviar Mensagem'}
              </NoxButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
