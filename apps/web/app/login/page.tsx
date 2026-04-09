'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Magic link e-posta adresinize gönderildi. Linke tıklayıp devam edin.');
    }

    setLoading(false);
  }

  const loginError = searchParams.get('error');

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Koschei AI Giriş</h1>
      <p className="mb-6 text-sm text-white/70">Supabase magic-link ile güvenli giriş.</p>
      <form className="space-y-4" onSubmit={handleLogin}>
        <label className="block text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="you@company.com"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Gönderiliyor...' : 'Magic Link Gönder'}
        </button>
      </form>
      {message ? <p className="mt-4 text-sm text-lilac">{message}</p> : null}
      {loginError ? <p className="mt-4 text-sm text-red-300">Giriş hatası: {loginError}</p> : null}
    </main>
  );
}
