import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@/app/globals.css';

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const adsenseEnabled =
  process.env.NEXT_PUBLIC_ENABLE_ADSENSE === 'true' && !!adsenseClient;

export const metadata: Metadata = {
  title: 'Koschei AI',
  description: 'Koschei AI — Türkçe konuşan ekipler için AI agent çalışma alanı.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        {adsenseEnabled ? (
          <>
            <meta
              name="google-adsense-account"
              content={adsenseClient}
            />
            <script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
              crossOrigin="anonymous"
            />
          </>
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
