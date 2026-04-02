import { cn } from '../../lib/utils'
import type * as React from 'react'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement>

export function Badge({ className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
