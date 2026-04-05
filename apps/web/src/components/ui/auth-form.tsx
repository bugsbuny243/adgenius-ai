'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { createBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

type AuthMode = 'login' | 'signup';

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        router.replace('/dashboard');
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setError('Kimlik doğrulama servisi şu anda yapılandırılmamış. Lütfen daha sonra tekrar dene.');
        return;
      }

      const supabase = createBrowserSupabase();
      const { data, error: authError } = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (authError) {
        setError(authError.message);
        return;
      }

      const sessionFromResponse = data?.session;
      if (sessionFromResponse?.access_token) {
        router.replace('/dashboard');
        router.refresh();
        return;
      }

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession?.access_token) {
        router.replace('/dashboard');
        router.refresh();
        return;
      }

      if (isLogin) {
        setError('Giriş işlemi tamamlanamadı. Lütfen bilgilerini kontrol edip tekrar dene.');
        return;
      }

      setSuccessMessage('Kayıt başarılı. E-postanı doğruladıktan sonra giriş yapabilirsin.');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Auth submit failed:', err);
      setError(err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm text-zinc-300">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring"
          placeholder="ornek@tradepiglobal.co"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm text-zinc-300">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring"
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{error}</p>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">
          {successMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'İşleniyor...' : isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
      </button>
    </form>
  );
}
