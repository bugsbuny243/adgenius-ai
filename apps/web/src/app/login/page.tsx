import { loginAction } from '@/src/app/auth-actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null
  const success = typeof params.success === 'string' ? params.success : null

  return (
    <section className="panel auth-card">
      <h1 className="page-title">Giriş</h1>
      <p className="muted">Koschei çalışma alanınıza erişin.</p>
      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
      <form action={loginAction} className="form-stack">
        <label>
          E-posta
          <input name="email" type="email" required />
        </label>
        <label>
          Şifre
          <input name="password" type="password" required minLength={6} />
        </label>
        <button className="primary-button" type="submit">Giriş Yap</button>
      </form>
    </section>
  )
}
