import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Koschei',
  description: 'Koschei agent çalışma alanı ve üretim platformu.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
