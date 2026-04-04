import Link from 'next/link'

const links = ['dashboard', 'upload', 'work-items', 'customers', 'tasks', 'assets', 'pricing', 'demo']

export function TopNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4 text-sm">
        <Link href="/" className="font-bold text-slate-900">OperaAI</Link>
        {links.map((link) => (
          <Link key={link} href={`/${link}`} className="text-slate-600 hover:text-slate-900">
            {link}
          </Link>
        ))}
      </nav>
    </header>
  )
}
