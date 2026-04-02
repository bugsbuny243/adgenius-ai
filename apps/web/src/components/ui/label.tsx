import type * as React from 'react'
import { cn } from '../../lib/utils'

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={cn('text-sm font-medium text-zinc-800 dark:text-zinc-200', className)} {...props}>
      {children}
    </label>
  )
}
