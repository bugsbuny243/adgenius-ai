'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { createBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

type AuthMode = 'login' | 'signup';

type AuthFormProps = {
  mode: AuthMode;
};

const DEFAULT_POST_AUTH_REDIRECT = '/dashboard';

function resolveRedirectTarget(nextValue: string | null) {
  if (!nextValue || !nextValue.startsWith('/')) {
    return DEFAULT_POST_AUTH_REDIRECT;
  }

  if (nextValue.startsWith('//')) {
    return DEFAULT_POST_AUTH_REDIRECT;
  }

  return nextValue;
}

function toFriendlyAuthError(message: string, mode: AuthMode) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı. Lütfen bilgilerini kontrol et.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'E-posta adresini doğruladıktan sonra giriş yapabilirsin.';
  }

  if (normalizedMessage.includes('user already registered')) {
    return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyebilirsin.';
  }

  if (normalizedMessage.includes('password')) {
    return mode === 'signup'
      ? 'Şifren en az 6 karakter olmalı ve kolay tahmin edilememeli.'
      : 'Şifre doğrulanamadı. Lütfen tekrar dene.';
  }

  if (normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
    return 'Ağ bağlantısı kurulamadı. İnternetini kontrol edip tekrar dene.';
  }

  return mode === 'login'
    ? 'Giriş sırasında bir sorun oluştu. Lütfen tekrar dene.'
    : 'Kayıt sırasında bir sorun oluştu. Lütfen tekrar dene.';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const submitRequestRef = useRef(0);

  const isLogin = mode === 'login';
  const [redirectTarget, setRedirectTarget] = useState(DEFAULT_POST_AUTH_REDIRECT);


  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextValue = new URLSearchParams(window.location.search).get('next');
    setRedirectTarget(resolveRedirectTarget(nextValue));
  }, []);
  useEffect(() => {
    isMountedRef.current = true;

    if (!isSupabaseConfigured()) {
      return () => {
        isMountedRef.current = false;
      };
    }

    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        router.replace(redirectTarget);
        router.refresh();
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [redirectTarget, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    const submitRequestId = submitRequestRef.current + 1;
    submitRequestRef.current = submitRequestId;
    const shouldUpdateState = () => isMountedRef.current && submitRequestRef.current === submitRequestId;

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setError('Kimlik doğrulama servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.');
        return;
      }

      const supabase = createBrowserSupabase();
      const sanitizedEmail = email.trim().toLowerCase();

      const { data, error: authError } = isLogin
        ? await supabase.auth.signInWithPassword({ email: sanitizedEmail, password })
        : await supabase.auth.signUp({ email: sanitizedEmail, password });

      if (authError) {
        if (shouldUpdateState()) {
          setError(toFriendlyAuthError(authError.message, mode));
        }
        return;
      }

      const hasSessionFromResponse = Boolean(data.session?.access_token);
      const isEmailConfirmationFlow = mode === 'signup' && !hasSessionFromResponse;

      if (isEmailConfirmationFlow) {
        if (shouldUpdateState()) {
          setSuccessMessage('Kayıt tamamlandı. Devam etmek için e-posta adresini doğrula ve ardından giriş yap.');
          setPassword('');
        }
        return;
      }

      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        if (shouldUpdateState()) {
          setError('Oturum doğrulanamadı. Lütfen tekrar giriş yapmayı dene.');
        }
        return;
      }

      if (!currentSession?.access_token) {
        if (shouldUpdateState()) {
          setError(isLogin ? 'Giriş tamamlanamadı. Lütfen bilgilerini kontrol ederek tekrar dene.' : 'Kayıt tamamlandı ancak oturum açılamadı. Giriş yaparak devam edebilirsin.');
        }
        return;
      }

      router.replace(redirectTarget);
      router.refresh();
    } catch (err) {
      console.error('Auth submit failed:', err);
      if (shouldUpdateState()) {
        if (err instanceof TypeError) {
          setError('Ağ hatası oluştu. İnternet bağlantını kontrol edip tekrar dene.');
        } else {
          setError(isLogin ? 'Giriş sırasında beklenmeyen bir hata oluştu. Lütfen tekrar dene.' : 'Kayıt sırasında beklenmeyen bir hata oluştu. Lütfen tekrar dene.');
        }
      }
    } finally {
      if (shouldUpdateState()) {
        setLoading(false);
      }
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
          placeholder="ornek@adgenius.ai"
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
