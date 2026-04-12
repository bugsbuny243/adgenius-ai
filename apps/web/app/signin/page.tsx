'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const MAGIC_LINK_TIMEOUT_MS = 15_000;

function mapSupabaseErrorToMessage(errorMessage: string): string {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes('rate limit')) {
    return 'Çok sık deneme yapıldı. Lütfen kısa bir süre sonra tekrar deneyin.';
  }

  if (normalized.includes('invalid email')) {
    return 'Geçerli bir e-posta adresi girin.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'E-posta doğrulaması tamamlanmamış görünüyor. Gelen kutunuzu kontrol edin.';
  }

  if (normalized.includes('network') || normalized.includes('failed to fetch')) {
    return 'Ağ bağlantısı nedeniyle istek gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  }

  return 'Magic link gönderilirken bir hata oluştu. Lütfen tekrar deneyin.';
}

function resolveEmailRedirectTo(): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = configuredSiteUrl && configuredSiteUrl.length > 0 ? configuredSiteUrl : window.location.origin;

  try {
    const redirectUrl = new URL('/auth/callback', baseUrl);
    return redirectUrl.toString();
  } catch (error: unknown) {
    console.error('Invalid redirect URL configuration for magic-link callback.', error);
    return `${window.location.origin}/auth/callback`;
  }
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
      const emailRedirectTo = resolveEmailRedirectTo();
      const signInRequest = supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo }
      });

      const timeoutRequest = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Magic link request timed out after 15 seconds.'));
        }, MAGIC_LINK_TIMEOUT_MS);
      });

      const { error } = await Promise.race([signInRequest, timeoutRequest]);

      if (error) {
        console.error('Supabase signInWithOtp returned an error.', error);
        setMessage(mapSupabaseErrorToMessage(error.message));
        return;
      }

      setMessage('Magic link gönderildi, e-postanı kontrol et.');
    } catch (error: unknown) {
      console.error('Magic-link submit flow failed.', error);
      const fallbackMessage = error instanceof Error ? mapSupabaseErrorToMessage(error.message) : mapSupabaseErrorToMessage('');
      setMessage(fallbackMessage);
    } finally {
      setLoading(false);
    }
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
