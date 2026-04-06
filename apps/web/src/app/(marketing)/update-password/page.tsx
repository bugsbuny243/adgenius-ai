'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';

function toFriendlyUpdateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('same password')) {
    return 'Yeni şifre mevcut şifre ile aynı olamaz.';
  }

  if (normalized.includes('password')) {
    return 'Şifreniz en az 6 karakter olmalıdır.';
  }

  return 'Şifre güncellenemedi. Lütfen tekrar deneyin.';
}

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    if (password !== passwordRepeat) {
      setError('Şifreler eşleşmiyor. Lütfen tekrar kontrol edin.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserSupabase();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(toFriendlyUpdateError(updateError.message));
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Şifre güncelleme sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Yeni Şifre Belirle</h1>
          <p className="text-sm text-zinc-400">Koschei hesabınız için yeni bir şifre belirleyin.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm text-zinc-300">
              Yeni Şifre
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password-repeat" className="text-sm text-zinc-300">
              Yeni Şifre (Tekrar)
            </label>
            <input
              id="password-repeat"
              type="password"
              autoComplete="new-password"
              value={passwordRepeat}
              onChange={(event) => setPasswordRepeat(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring"
              placeholder="••••••••"
            />
          </div>

          {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          Giriş ekranına dönmek için{' '}
          <Link href="/signin" className="text-indigo-300 hover:text-indigo-200">
            tıklayın
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
