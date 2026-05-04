import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Koschei V5 · Premium Command Center',
  description:
    'Koschei V5 autonomous game intelligence platform. Cyberpunk precision with Apple-grade clarity.'
};

const footerLinks = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/about', label: 'Hakkımızda' },
  { href: '/contact', label: 'İletişim' },
  { href: '/privacy', label: 'Gizlilik' },
  { href: '/terms', label: 'Koşullar' },
  { href: '/pricing', label: 'Fiyatlandırma' }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body
        className={`${inter.variable} min-h-screen bg-slate-950 font-sans text-slate-200 antialiased selection:bg-cyan-400/30 selection:text-cyan-100`}
      >
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(139,92,246,0.2),transparent_28%),linear-gradient(180deg,#020617_0%,#020617_100%)]" />
        <div className="fixed inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_100%_60%_at_50%_0%,black_45%,transparent_100%)]" />

        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>

          <footer className="mx-auto w-full max-w-7xl px-4 pb-8 pt-10 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs tracking-[0.22em] text-slate-400">KOSCHEI V5 · AUTONOMOUS GAME INTELLIGENCE</p>
                <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                  {footerLinks.map((item) => (
                    <Link key={item.href} href={item.href} className="transition hover:text-cyan-300">
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
