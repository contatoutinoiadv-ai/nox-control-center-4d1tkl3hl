import React from 'react'
import { cn } from '@/lib/utils'
import { NOX_STATUS_CONFIG, NoxStatusType } from '../tokens/designTokens'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  Info,
  AlertCircle,
} from 'lucide-react'

export interface NoxStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: NoxStatusType | string
  customLabel?: string
  showIcon?: boolean
  showDot?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const NoxStatusBadge: React.FC<NoxStatusBadgeProps> = ({
  status,
  customLabel,
  showIcon = true,
  showDot = false,
  size = 'md',
  className,
  ...props
}) => {
  // Normalização caso venha lowercase ou com hífen
  const normalizedKey = status
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_') as NoxStatusType

  const config = NOX_STATUS_CONFIG[normalizedKey] || {
    label: customLabel || status,
    colorClass: 'text-slate-300',
    borderClass: 'border-slate-700/80',
    bgClass: 'bg-slate-900/60',
    dotClass: 'bg-slate-400',
    iconType: 'info' as const,
  }

  const label = customLabel || config.label

  const renderIcon = () => {
    const iconClass = 'w-3 h-3 shrink-0'
    switch (config.iconType) {
      case 'alert':
        return <AlertTriangle className={iconClass} />
      case 'check':
        return <CheckCircle2 className={iconClass} />
      case 'clock':
        return <Clock className={iconClass} />
      case 'activity':
        return <Activity className={iconClass} />
      case 'wifi':
        return status.toUpperCase() === 'OFFLINE' ? (
          <WifiOff className={iconClass} />
        ) : (
          <Wifi className={iconClass} />
        )
      default:
        return <Info className={iconClass} />
    }
  }

  const sizeClasses = {
    sm: 'text-[9px] px-1.5 py-0.5 gap-1',
    md: 'text-[10px] px-2 py-0.5 gap-1.5',
    lg: 'text-xs px-2.5 py-1 gap-2',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-bold tracking-wider uppercase rounded border select-none transition-colors shadow-sm',
        config.bgClass,
        config.borderClass,
        config.colorClass,
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotClass)}
          aria-hidden="true"
        />
      )}
      {showIcon && renderIcon()}
      <span>{label}</span>
    </span>
  )
}
