import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TopNav } from '@/src/components/nav'

export const metadata: Metadata = {
  title: 'AgentForge',
  description: 'Create and run business agents powered by Gemini.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
