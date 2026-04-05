import { signupAction } from '@/src/app/auth-actions'

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const error = typeof params.error === 'string' ? params.error : null

  return (
    <section className="panel auth-card">
      <h1 className="page-title">Kayıt Ol</h1>
      <p className="muted">Koschei ile AI agent iş akışınızı başlatın.</p>
      {error ? <p className="error-text">{error}</p> : null}
      <form action={signupAction} className="form-stack">
        <label>
          Ad Soyad
          <input name="fullName" type="text" />
        </label>
        <label>
          E-posta
          <input name="email" type="email" required />
        </label>
        <label>
          Şifre
          <input name="password" type="password" required minLength={6} />
        </label>
        <button className="primary-button" type="submit">Hesap Oluştur</button>
      </form>
    </section>
  )
}
