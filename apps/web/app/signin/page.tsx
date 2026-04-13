'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setErrorMessage('Uygulama yapılandırması tamamlanmamış. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session?.access_token) {
        setErrorMessage('Giriş başarısız. E-posta veya şifreyi kontrol edin.');
        return;
      }

      const bootstrapResponse = await fetch('/api/bootstrap', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`
        }
      });

      if (!bootstrapResponse.ok) {
        setErrorMessage('Çalışma alanı hazırlanamadı. Lütfen tekrar deneyin.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setErrorMessage('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  const urlError = searchParams.get('error');

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Koschei AI Giriş</h1>
      <p className="mb-6 text-sm text-white/70">E-posta ve şifren ile hesabına güvenle giriş yap.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">
          E-posta
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="ornek@koschei.ai"
          />
        </label>

        <label className="block text-sm">
          Şifre
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="••••••••"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>

      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
      {urlError ? <p className="mt-2 text-sm text-red-300">Hata: {urlError}</p> : null}

      <div className="mt-6 space-y-2 text-sm text-white/80">
        <p>
          Hesabın yok mu?{' '}
          <Link href="/signup" className="text-lilac underline underline-offset-4 hover:text-neon">
            Kayıt ol
          </Link>
        </p>
        <p>
          <Link href="/reset-password" className="text-lilac underline underline-offset-4 hover:text-neon">
            Şifreni mi unuttun?
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl panel" />}>
      <SignInContent />
    </Suspense>
  );
}
