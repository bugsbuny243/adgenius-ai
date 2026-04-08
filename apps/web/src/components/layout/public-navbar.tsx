import Link from 'next/link';

const publicNavItems = [
  { href: '/pricing', label: 'Fiyatlar' },
  { href: '/about', label: 'Hakkımızda' },
  { href: '/contact', label: 'İletişim' },
  { href: '/signin', label: 'Giriş' },
  { href: '/signup', label: 'Kayıt' },
] as const;

export function PublicNavbar() {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Koschei
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5">
          {publicNavItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-zinc-300 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
