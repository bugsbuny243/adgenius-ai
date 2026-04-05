import './globals.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TopNav } from '@/src/components/nav'

export const metadata: Metadata = {
  title: 'Koschei — AI Agent Platform',
  description: 'İşini AI agent\'lara devret. Koschei ile agentlarını yönet, çalıştır ve çıktıları kaydet.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <TopNav />
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
