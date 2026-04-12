'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const MAGIC_LINK_TIMEOUT_MS = 15_000;

function resolveEmailRedirectTo(): string {
  return `${window.location.origin}/auth/callback`;
}

function toErrorDetail(error: { message: string; status?: number }): string {
  return error.status ? `${error.message} (status: ${error.status})` : error.message;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl panel" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setMessage('Supabase ayarları eksik. Lütfen sistem yöneticin ile iletişime geç.');
        return;
      }

      const signInRequest = supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: resolveEmailRedirectTo() }
      });

      const timeoutRequest = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Magic link isteği 15 saniye içinde yanıt vermedi.'));
        }, MAGIC_LINK_TIMEOUT_MS);
      });

      const { error } = await Promise.race([signInRequest, timeoutRequest]);

      if (error) {
        setMessage(`Magic link gönderimi başarısız: ${toErrorDetail(error)}`);
        return;
      }

      setMessage('Magic link gönderildi. E-posta kutunu kontrol et.');
    } catch (error: unknown) {
      setMessage(`Magic link gönderimi başarısız: ${error instanceof Error ? error.message : 'bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  }

  const loginError = searchParams.get('error');

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Koschei Giriş</h1>
      <p className="mb-6 text-sm text-white/70">Magic link ile güvenli giriş.</p>
      <form className="space-y-4" onSubmit={handleLogin}>
        <label className="block text-sm">
          E-posta
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
