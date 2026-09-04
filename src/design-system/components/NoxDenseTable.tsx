import React from 'react'
import { cn } from '@/lib/utils'
import { NoxCard } from './NoxCards'
import { LucideIcon, ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

export interface NoxTableColumn<T> {
  key: string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (row: T, index: number) => React.ReactNode
}

export interface NoxDenseTableProps<T> {
  columns: NoxTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T, index: number) => string
  loading?: boolean
  emptyMessage?: string
  emptySubtext?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onRowClick?: (row: T) => void
  selectedId?: string
  pagination?: {
    currentPage: number
    totalPages: number
    totalItems: number
    onPageChange: (page: number) => void
  }
  className?: string
}

export function NoxDenseTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  emptySubtext,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  selectedId,
  pagination,
  className,
}: NoxDenseTableProps<T>) {
  return (
    <NoxCard variant="surface" className={cn('p-0 overflow-hidden flex flex-col', className)}>
      <div className="overflow-x-auto min-w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-[#080d1a] select-none">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'py-2.5 px-3 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.sortable && 'cursor-pointer hover:text-cyan-400 transition-colors',
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div
                    className={cn(
                      'flex items-center gap-1.5',
                      col.align === 'right' && 'justify-end',
                      col.align === 'center' && 'justify-center',
                    )}
                  >
                    <span>{col.title}</span>
                    {col.sortable && (
                      <ArrowUpDown
                        className={cn(
                          'w-3 h-3',
                          sortColumn === col.key ? 'text-cyan-400' : 'text-slate-600',
                        )}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span className="font-mono text-xs">
                      Carregando registros de alta precisão...
                    </span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-sm font-semibold text-slate-300">{emptyMessage}</span>
                    {emptySubtext && (
                      <span className="text-xs text-slate-500 font-mono">{emptySubtext}</span>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = keyExtractor(row, index)
                const isSelected = selectedId === key
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition-colors duration-150',
                      onRowClick && 'cursor-pointer hover:bg-slate-850/60',
                      isSelected
                        ? 'bg-cyan-950/40 border-l-2 border-l-cyan-400'
                        : 'hover:bg-slate-900/40',
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'py-2 px-3 text-slate-200 truncate max-w-xs',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                        )}
                      >
                        {col.render ? col.render(row, index) : (row as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-[#080d1a] text-xs font-mono">
          <span className="text-slate-400">
            Total de <strong className="text-slate-200">{pagination.totalItems}</strong> itens
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">
              Página {pagination.currentPage} de {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.currentPage <= 1}
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </NoxCard>
  )
}
