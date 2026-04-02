import Link from 'next/link'

const links = [
  { href: '/advertiser', label: 'Advertiser Dashboard' },
  { href: '/publisher', label: 'Publisher Dashboard' },
  { href: '/admin', label: 'Admin Dashboard' },
  { href: '/login', label: 'Login' },
]

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">AdGenius Next-Gen Foundation</h1>
      <p className="mt-3 text-sm text-gray-600">This web app talks only to the Go API gateway.</p>
      <ul className="mt-6 space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link className="text-blue-600 hover:underline" href={link.href}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
