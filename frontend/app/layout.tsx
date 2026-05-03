import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Koschei AI Agent Workspace',
  description: 'Koschei, içerik, yayın, iş akışları ve oyun üretimi için bağımsız AI ajan çalışma alanıdır.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased">
        {/* Sayfa içerikleri artık özgürce tam ekran yayılabilir */}
        <div className="flex-1">
          {children}
        </div>
        
        {/* Footer'ı aşağıya şık bir şekilde sabitledik */}
        <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-10 text-sm text-zinc-500">
          <div className="border-t border-white/5 pt-6">
            <nav className="flex flex-wrap gap-4">
              <Link href="/" className="transition hover:text-violet-400">Ana Sayfa</Link>
              <Link href="/about" className="transition hover:text-violet-400">Hakkımızda</Link>
              <Link href="/contact" className="transition hover:text-violet-400">İletişim</Link>
              <Link href="/privacy" className="transition hover:text-violet-400">Gizlilik Politikası</Link>
              <Link href="/terms" className="transition hover:text-violet-400">Kullanım Koşulları</Link>
              <Link href="/pricing" className="transition hover:text-violet-400">Fiyatlandırma</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
