'use client'
import type * as React from 'react'

import { cn } from '../../lib/utils'

type DialogProps = React.HTMLAttributes<HTMLDivElement>

export function Dialog({ className, children, ...props }: DialogProps) {
  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900', className)} {...props}>
      {children}
    </div>
  )
}
