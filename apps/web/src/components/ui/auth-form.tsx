'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { signInWithEmail, signUpWithEmail } from '@/lib/auth';

type AuthMode = 'login' | 'signup';

type AuthFormProps = {
  mode: AuthMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const authFn = isLogin ? signInWithEmail : signUpWithEmail;
      const { data, error: authError } = await authFn(email, password);

      if (authError) {
        setError(authError.message);
        return;
      }

      const hasSession = Boolean(data?.session);

      if (isLogin || hasSession) {
        router.push('/dashboard');
        router.refresh();
        return;
      }

      setError('Kayıt başarılı. E-postanı doğruladıktan sonra giriş yapabilirsin.');
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
          placeholder="ornek@koschei.ai"
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
        <p className="rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading
          ? 'İşleniyor...'
          : isLogin
            ? 'Giriş Yap'
            : 'Hesap Oluştur'}
      </button>
    </form>
  );
}
