import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Koschei AI Agent Workspace',
  description: 'Koschei, içerik, yayın, iş akışları ve oyun üretimi için bağımsız AI ajan çalışma alanıdır.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
          {children}
          <footer className="mt-12 space-y-4 border-t border-white/10 pt-6 text-sm text-white/70">
            <nav className="flex flex-wrap gap-4">
              <Link href="/" className="transition hover:text-neon">Ana Sayfa</Link>
              <Link href="/about" className="transition hover:text-neon">Hakkımızda</Link>
              <Link href="/contact" className="transition hover:text-neon">İletişim</Link>
              <Link href="/privacy" className="transition hover:text-neon">Gizlilik Politikası</Link>
              <Link href="/terms" className="transition hover:text-neon">Kullanım Koşulları</Link>
              <Link href="/pricing" className="transition hover:text-neon">Fiyatlandırma</Link>
            </nav>
            <p className="text-xs text-white/50">
              Koschei bağımsız bir AI çalışma alanıdır. Üçüncü taraf platform adları yalnızca bağlantı ve uyumluluk
              bilgisini açıklamak için kullanılır.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
