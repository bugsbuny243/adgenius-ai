'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { createSupabaseBrowserClient, getMissingPublicSupabaseConfig } from '@/lib/supabase-browser';

function SignInContent() {
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
        const { missingKeys } = getMissingPublicSupabaseConfig();
        const detail = missingKeys.length ? ` Eksik değişkenler: ${missingKeys.join(', ')}` : '';
        setErrorMessage(`Uygulama yapılandırması tamamlanmamış.${detail}`);
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

      let redirectTo = '/dashboard';
      const redirectResponse = await fetch('/api/auth/redirect', { cache: 'no-store' });
      if (redirectResponse.ok) {
        const redirectPayload = await redirectResponse.json() as { redirectTo?: string };
        if (typeof redirectPayload.redirectTo === 'string' && redirectPayload.redirectTo.startsWith('/')) {
          redirectTo = redirectPayload.redirectTo;
        }
      }

      window.location.assign(redirectTo);
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
      <p className="mb-6 text-sm text-zinc-400">E-posta ve şifren ile hesabına güvenle giriş yap.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">
          E-posta
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-zinc-900/70 px-3 py-2 outline-none focus:border-violet-500"
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
            className="mt-2 w-full rounded-lg border border-white/20 bg-zinc-900/70 px-3 py-2 outline-none focus:border-violet-500"
            placeholder="••••••••"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 font-semibold text-white transition hover:scale-105 disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>


      <button
        type="button"
        className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:scale-105"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] font-bold text-blue-500">G</span>
        Google ile giriş yap
      </button>

      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
      {urlError ? <p className="mt-2 text-sm text-red-300">Hata: {urlError}</p> : null}

      <div className="mt-6 space-y-2 text-sm text-zinc-300">
        <p>
          Hesabın yok mu?{' '}
          <Link href="/signup" className="text-violet-300 underline underline-offset-4 hover:text-violet-200">
            Kayıt ol
          </Link>
        </p>
        <p>
          <Link href="/reset-password" className="text-violet-300 underline underline-offset-4 hover:text-violet-200">
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
