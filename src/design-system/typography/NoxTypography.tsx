import React from 'react'
import { cn } from '@/lib/utils'

export interface NoxTypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
}

/** Display: grandes títulos de destaque ou contadores épicos */
export const NoxDisplay: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'h1',
  ...props
}) => {
  return (
    <Component
      className={cn('text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

/** H1: Título principal de módulo ou página */
export const NoxH1: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'h1',
  ...props
}) => {
  return (
    <Component
      className={cn('text-2xl font-bold tracking-tight text-slate-100', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

/** H2: Título de seção ou card de destaque */
export const NoxH2: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'h2',
  ...props
}) => {
  return (
    <Component
      className={cn('text-lg font-semibold tracking-tight text-slate-200', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

/** H3: Subtítulo ou cabeçalho de lista */
export const NoxH3: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'h3',
  ...props
}) => {
  return (
    <Component className={cn('text-sm font-semibold text-slate-200', className)} {...props}>
      {children}
    </Component>
  )
}

/** Body: Texto padrão de leitura e formulários */
export const NoxBody: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'p',
  ...props
}) => {
  return (
    <Component className={cn('text-sm text-slate-300 leading-relaxed', className)} {...props}>
      {children}
    </Component>
  )
}

/** Small: Texto secundário de apoio e descrições */
export const NoxSmall: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'p',
  ...props
}) => {
  return (
    <Component className={cn('text-xs text-slate-400 leading-normal', className)} {...props}>
      {children}
    </Component>
  )
}

/** Caption: Legendas de gráficos, timestamps e rodapés */
export const NoxCaption: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'span',
  ...props
}) => {
  return (
    <Component
      className={cn('text-[11px] text-slate-400 font-mono tracking-wide', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

/** Label: Rótulos técnicos de campos e status */
export const NoxLabel: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'label',
  ...props
}) => {
  return (
    <Component
      className={cn(
        'text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

/** Mono: Números de processo CNJ, hashes, prazos, contadores */
export const NoxMono: React.FC<NoxTypographyProps> = ({
  children,
  className,
  as: Component = 'span',
  ...props
}) => {
  return (
    <Component
      className={cn('font-mono text-xs tabular-nums text-slate-200 tracking-tight', className)}
      {...props}
    >
      {children}
    </Component>
  )
}
