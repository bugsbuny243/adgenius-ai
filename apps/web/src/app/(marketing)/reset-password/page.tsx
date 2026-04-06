'use client';

import Link from 'next/link';
import { useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';

function toFriendlyResetError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid email')) {
    return 'Geçerli bir e-posta adresi girin.';
  }

  if (normalized.includes('rate limit')) {
    return 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.';
  }

  return 'Şifre sıfırlama bağlantısı gönderilemedi. Lütfen tekrar deneyin.';
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const supabase = createBrowserSupabase();
      const sanitizedEmail = email.trim().toLowerCase();
      const redirectTo = `${window.location.origin}/update-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo,
      });

      if (resetError) {
        setError(toFriendlyResetError(resetError.message));
        return;
      }

      setSuccessMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      setEmail('');
    } catch {
      setError('Şifre sıfırlama isteği sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Şifremi Unuttum</h1>
          <p className="text-sm text-zinc-400">Koschei hesabınız için sıfırlama bağlantısı alın.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
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

          {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
          {successMessage ? <p className="rounded-lg border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">{successMessage}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
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
