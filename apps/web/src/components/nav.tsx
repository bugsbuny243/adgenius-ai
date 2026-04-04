import Link from 'next/link'

const publicLinks = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/pricing', label: 'Fiyatlar' },
  { href: '/demo', label: 'Demo' },
]

const appLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agents' },
  { href: '/runs', label: 'Runs' },
  { href: '/knowledge', label: 'Knowledge' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/settings', label: 'Settings' },
]

export function TopNav() {
  return (
    <header className="border-b border-slate-800 bg-slate-950 text-slate-200">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4 text-sm">
        <Link href="/" className="mr-3 font-bold text-white">
          AgentForge
        </Link>
        {publicLinks.map((link) => (
          <Link key={link.href} href={link.href} className="text-slate-300 hover:text-white">
            {link.label}
          </Link>
        ))}
        <div className="mx-2 h-4 w-px bg-slate-700" />
        {appLinks.map((link) => (
          <Link key={link.href} href={link.href} className="text-slate-400 hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
