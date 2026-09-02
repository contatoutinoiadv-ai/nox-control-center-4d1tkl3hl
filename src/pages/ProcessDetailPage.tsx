import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { SIGILO_DESCRICOES } from '@/services/datajudService'

/**
 * Espelha o schema real da collection `movimentacoes_processo`
 * (ver src/lib/pocketbase/schema.json e MovimentacaoProcesso em
 * src/services/datajudService.ts). O teor do movimento é o campo
 * `nome_movimento` e os detalhes complementares ficam em `complementos_json`.
 */
interface ComplementoMovimento {
  codigo?: number
  nome?: string
  valor?: any
  descricao?: string
}

interface MovimentacaoProcesso {
  id: string
  numero_processo: string
  tribunal_alias: string
  datajud_id?: string
  codigo_movimento: number
  nome_movimento: string
  data_hora_movimento: string
  orgao_codigo_movimento?: number
  orgao_nome_movimento?: string
  complementos_json?: ComplementoMovimento[] | null
  nivel_sigilo_processo: number
  hash_dedup: string
  sigilo_descricao?: string
}

/** Normaliza o JSON de complementos, que pode chegar como string ou array. */
function parseComplementos(raw: MovimentacaoProcesso['complementos_json']): ComplementoMovimento[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

/** Texto do complemento em ordem de prioridade: valor, descrição, nome. */
function textoComplemento(comp: ComplementoMovimento): string {
  const partes: string[] = []
  const rotulo = comp.nome || comp.descricao || ''
  const valor =
    comp.valor !== undefined && comp.valor !== null && String(comp.valor).trim() !== ''
      ? String(comp.valor)
      : ''
  if (rotulo) partes.push(rotulo)
  if (valor && valor !== rotulo) partes.push(valor)
  return partes.join(': ')
}

/**
 * Página de detalhe de um processo.
 * Exibe a linha do tempo cronológica das movimentações (da mais antiga para a
 * mais recente), com o teor completo de cada movimento visível sem expandir.
 */
export default function ProcessDetailPage() {
  const { numeroProcesso } = useParams<{ numeroProcesso: string }>()
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoProcesso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      try {
        setCarregando(true)
        setErro(null)

        const resultado = await pb
          .collection('movimentacoes_processo')
          .getFullList<MovimentacaoProcesso>({
            filter: pb.filter('numero_processo = {:num}', { num: numeroProcesso ?? '' }),
            sort: 'data_hora_movimento',
          })

        if (ativo) setMovimentacoes(resultado)
      } catch {
        if (ativo) setErro('Não foi possível carregar as movimentações do processo.')
      } finally {
        if (ativo) setCarregando(false)
      }
    }

    carregar()

    return () => {
      ativo = false
    }
  }, [numeroProcesso])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <Link to="/processos" className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline">
          ← Voltar para a lista de processos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">Processo {numeroProcesso}</h1>
        <p className="mt-1 text-sm text-slate-400">
          Linha do tempo cronológica das movimentações processuais, com o teor completo de cada
          movimento.
        </p>
      </header>

      <section aria-label="Linha do tempo de movimentações">
        {carregando ? (
          <p className="text-sm text-slate-400" role="status">
            Carregando movimentações…
          </p>
        ) : erro ? (
          <p className="text-sm text-rose-400" role="alert">
            {erro}
          </p>
        ) : movimentacoes.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhuma movimentação registrada para este processo.
          </p>
        ) : (
          <ol className="space-y-4 border-l-2 border-slate-700 pl-6">
            {movimentacoes.map((mov) => {
              const sigiloso = (mov.nivel_sigilo_processo ?? 0) > 0
              const complementos = sigiloso ? [] : parseComplementos(mov.complementos_json)

              return (
                <li key={mov.id} className="relative">
                  <span
                    className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full bg-cyan-500 ring-4 ring-slate-900"
                    aria-hidden="true"
                  />
                  <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono uppercase text-cyan-300">
                        {mov.tribunal_alias}
                      </span>
                      <time
                        dateTime={mov.data_hora_movimento}
                        className="text-xs font-mono text-slate-400"
                      >
                        {new Date(mov.data_hora_movimento).toLocaleString('pt-BR')}
                      </time>
                      {sigiloso && (
                        <span className="rounded bg-amber-950 px-2 py-0.5 text-[10px] font-mono uppercase text-amber-300">
                          {mov.sigilo_descricao ||
                            SIGILO_DESCRICOES[mov.nivel_sigilo_processo] ||
                            'Sigilo'}
                        </span>
                      )}
                    </div>

                    <h2
                      className={`mt-2 text-sm font-semibold ${
                        sigiloso ? 'text-amber-200 italic' : 'text-slate-100'
                      }`}
                    >
                      {sigiloso ? 'Movimento protegido por sigilo' : mov.nome_movimento}
                    </h2>

                    {!sigiloso && (
                      <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-slate-200">
                        {mov.nome_movimento}
                      </p>
                    )}

                    {mov.orgao_nome_movimento && (
                      <p className="mt-2 text-xs font-mono text-slate-400">
                        Órgão: {mov.orgao_nome_movimento}
                      </p>
                    )}

                    {complementos.length > 0 && (
                      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Complementos do movimento
                        </p>
                        <ul className="mt-1 space-y-1">
                          {complementos.map((comp, idx) => {
                            const texto = textoComplemento(comp)
                            if (!texto) return null
                            return (
                              <li key={idx} className="text-xs font-mono text-slate-300">
                                • {texto}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </article>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
