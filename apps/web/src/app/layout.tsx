import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdSenseScript } from '@/components/ads/adsense-script';

import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Koschei',
  description: 'Koschei AI agent çalışma alanı ve üretim platformu.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AdSenseScript />
        {children}
      </body>
    </html>
  );
}
