import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Koschei AI Command Center',
  description: 'Koschei AI branded, auth-protected growth and agent operations dashboard.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">{children}</div>
      </body>
    </html>
  );
}
