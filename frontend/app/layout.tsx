import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Koschei İçerik Platformu',
  description: 'Koschei, ekiplerin içerik üretim süreçlerini tek merkezden yönetmesini sağlar.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Script
          id="adsense-script"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6081394144742471"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
          {children}
          <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-white/70">
            <nav className="flex flex-wrap gap-4">
              <Link href="/" className="transition hover:text-neon">
                Ana Sayfa
              </Link>
              <Link href="/about" className="transition hover:text-neon">
                Hakkımızda
              </Link>
              <Link href="/contact" className="transition hover:text-neon">
                İletişim
              </Link>
              <Link href="/articles" className="transition hover:text-neon">
                Yazılar
              </Link>
              <Link href="/privacy-policy" className="transition hover:text-neon">
                Gizlilik Politikası
              </Link>
              <Link href="/terms" className="transition hover:text-neon">
                Kullanım Koşulları
              </Link>
              <Link href="/cookies" className="transition hover:text-neon">
                Çerez Politikası
              </Link>
              <Link href="/login" className="transition hover:text-neon">
                Giriş
              </Link>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
