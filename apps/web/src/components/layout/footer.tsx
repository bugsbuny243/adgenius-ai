import Link from 'next/link';

const footerLinks = [
  { href: '/about', label: 'Hakkımızda' },
  { href: '/privacy', label: 'Gizlilik' },
  { href: '/terms', label: 'Şartlar' },
  { href: '/contact', label: 'İletişim' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-base font-semibold text-white">Tradepiglobal AI</p>
          <p className="mt-1 text-sm text-zinc-400">
            AI destekli üretim ve operasyon akışlarını tek çalışma alanında toplayan agent platformu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-zinc-800/80">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-zinc-500">
          © {new Date().getFullYear()} Tradepiglobal AI. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
