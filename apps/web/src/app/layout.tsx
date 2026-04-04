import './globals.css'
import type { ReactNode } from 'react'
import Script from 'next/script'
import { TopNav } from '@/src/components/nav'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <Script
          id="adsense-base-script"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6001394144742471"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <TopNav />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  )
}
