import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon, ChevronRight } from 'lucide-react'

export interface NoxBreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

export interface NoxPageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  badge?: React.ReactNode
  breadcrumbs?: NoxBreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export const NoxPageHeader: React.FC<NoxPageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-3 pb-4 border-b border-slate-800/80', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1
            return (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                {isLast || !crumb.onClick ? (
                  <span className={cn(isLast ? 'text-slate-200 font-semibold' : 'text-slate-400')}>
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    {crumb.label}
                  </button>
                )}
              </React.Fragment>
            )
          })}
        </nav>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            {Icon && (
              <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
                <Icon className="w-4 h-4" />
              </div>
            )}
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">{description}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div>}
      </div>
    </div>
  )
}
