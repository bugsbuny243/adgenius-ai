import Link from 'next/link'
import { getCurrentUser } from '@/src/lib/auth'
import { logoutAction } from '@/src/app/auth-actions'

export async function TopNav() {
  const user = await getCurrentUser()

  return (
    <header className="nav">
      <nav className="nav-inner">
        <Link href="/" className="nav-brand">
          Koschei
        </Link>

        {!user ? (
          <>
            <Link href="/pricing">Fiyatlandırma</Link>
            <Link href="/login">Giriş</Link>
            <Link href="/signup">Kayıt</Link>
          </>
        ) : (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/agents">Agentlar</Link>
            <Link href="/saved">Çıktılar</Link>
            <Link href="/settings">Ayarlar</Link>
            <form action={logoutAction}>
              <button type="submit" className="ghost-button">
                Çıkış
              </button>
            </form>
          </>
        )}
      </nav>
    </header>
  )
}
