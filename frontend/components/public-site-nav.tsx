import Link from 'next/link';

const links = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/pricing', label: 'Fiyatlandırma' },
  { href: '/about', label: 'Hakkımızda' },
  { href: '/contact', label: 'İletişim' },
  { href: '/privacy', label: 'Gizlilik Politikası' },
  { href: '/terms', label: 'Kullanım Koşulları' },
  { href: '/signin', label: 'Giriş' }
] as const;

export function PublicSiteNav() {
  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-zinc-300 transition hover:scale-105 hover:border-violet-400/60 hover:text-violet-300"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
