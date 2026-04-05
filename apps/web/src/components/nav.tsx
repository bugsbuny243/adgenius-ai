import Link from 'next/link'

const links = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/signup', label: 'Signup' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agents' },
  { href: '/runs', label: 'Runs' },
  { href: '/approvals', label: 'Approvals' },
]

export function TopNav() {
  return (
    <header className="nav">
      <nav className="nav-inner">
        <Link href="/" className="nav-brand">
          AgentForge
        </Link>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
