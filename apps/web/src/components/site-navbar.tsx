import Link from 'next/link';

const navItems = [
  { href: '/agents', label: 'Agentlar' },
  { href: '/pricing', label: 'Fiyatlar' },
  { href: '/login', label: 'Giriş' },
  { href: '/signup', label: 'Kayıt' },
];

export function SiteNavbar() {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Koschei
        </Link>
        <nav className="flex items-center gap-2 sm:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-300 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
