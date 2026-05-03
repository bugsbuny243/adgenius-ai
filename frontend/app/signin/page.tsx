'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { Lock, Mail, Chrome } from 'lucide-react';
import { createSupabaseBrowserClient, getMissingPublicSupabaseConfig } from '@/lib/supabase-browser';

function SignInContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

      const bootstrapResponse = await fetch('/api/bootstrap', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` } });
      if (!bootstrapResponse.ok) {
        setErrorMessage('Çalışma alanı hazırlanamadı. Lütfen tekrar deneyin.');
        return;
      }

      let redirectTo = '/dashboard';
      const redirectResponse = await fetch('/api/auth/redirect', { cache: 'no-store' });
      if (redirectResponse.ok) {
        const redirectPayload = (await redirectResponse.json()) as { redirectTo?: string };
        if (typeof redirectPayload.redirectTo === 'string' && redirectPayload.redirectTo.startsWith('/')) redirectTo = redirectPayload.redirectTo;
      }
      window.location.assign(redirectTo);
    } catch {
      setErrorMessage('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        const { missingKeys } = getMissingPublicSupabaseConfig();
        const detail = missingKeys.length ? ` Eksik değişkenler: ${missingKeys.join(', ')}` : '';
        setErrorMessage(`Uygulama yapılandırması tamamlanmamış.${detail}`);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
        }
      });

      if (error) {
        setErrorMessage('Google oturum açma başarısız oldu. Lütfen tekrar deneyin.');
      }
    } catch {
      setErrorMessage('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setGoogleLoading(false);
    }
  }

  const urlError = searchParams.get('error');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950 to-zinc-950" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:14px_24px]" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/5 bg-zinc-900/50 p-8 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(139,92,246,0.2)]">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Welcome Back</p>
        <h1 className="mt-3 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">Sign in to Koschei</h1>
        <p className="mt-2 text-sm text-zinc-500">Access your premium build control room.</p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-zinc-400">E-posta
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-zinc-800 bg-black/50 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-600 transition focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
            </div>
          </label>
          <label className="block text-sm text-zinc-400">Şifre
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-zinc-800 bg-black/50 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder-zinc-600 transition focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
            </div>
          </label>
          <button disabled={loading || googleLoading} type="submit" className="w-full rounded-xl border border-violet-500/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-4 py-2.5 font-semibold text-white transition hover:border-violet-500/50 hover:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900/50 px-2 text-zinc-500">Ya da</span>
            </div>
          </div>

          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={handleGoogleSignIn}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-700 hover:bg-zinc-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Chrome className="h-4 w-4" />
            {googleLoading ? 'Google\'a bağlanılıyor...' : 'Google ile Giriş Yap'}
          </button>
        </div>

        {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
        {urlError ? <p className="mt-2 text-sm text-red-300">Hata: {urlError}</p> : null}

        <div className="mt-6 space-y-2 text-sm text-zinc-500">
          <p>Hesabın yok mu? <Link href="/signup" className="text-violet-300 hover:text-violet-200 transition">Kayıt ol</Link></p>
          <p><Link href="/reset-password" className="text-violet-300 hover:text-violet-200 transition">Şifreni mi unuttun?</Link></p>
        </div>
      </section>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl" />}>
      <SignInContent />
    </Suspense>
  );
}
