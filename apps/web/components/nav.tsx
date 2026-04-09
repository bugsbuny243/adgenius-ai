import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agents' }
];

export function Nav() {
  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-lilac">Koschei AI</p>
        <h1 className="text-2xl font-semibold">Command Center</h1>
      </div>
      <div className="flex gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-neon hover:text-neon"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
