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
          className="rounded-xl border border-white/10 px-3 py-2 transition hover:border-neon hover:text-neon"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
