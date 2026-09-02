import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { pb } from '@/lib/pocketbase/client'

interface MovimentacaoProcesso {
  id: string
  numero_processo: string
  data_hora_movimento: string
  tipo_movimento: string
  descricao: string
  orgao: string
}

/**
 * Página de detalhe de um processo.
 * Exibe a linha do tempo cronológica das movimentações
 * (da mais antiga para a mais recente), conforme o CNJ.
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
          Linha do tempo cronológica das movimentações processuais.
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
            {movimentacoes.map((mov) => (
              <li key={mov.id} className="relative">
                <span
                  className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full bg-cyan-500 ring-4 ring-slate-900"
                  aria-hidden="true"
                />
                <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h2 className="text-sm font-semibold text-slate-100">{mov.tipo_movimento}</h2>
                  <p className="mt-1 text-sm text-slate-400">{mov.descricao}</p>
                  <time
                    dateTime={mov.data_hora_movimento}
                    className="mt-2 block text-xs text-slate-500"
                  >
                    {new Date(mov.data_hora_movimento).toLocaleString('pt-BR')}
                  </time>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
