'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient, getMissingPublicSupabaseConfig } from '@/lib/supabase-browser';

export default function SignupPage() {
  const router = useRouter();
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

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMessage('Kayıt başarısız. Bilgileri kontrol edip tekrar deneyin.');
        return;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        router.push('/confirm-email');
        return;
      }

      const bootstrapResponse = await fetch('/api/bootstrap', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!bootstrapResponse.ok) {
        setErrorMessage('Hesap oluşturuldu ancak çalışma alanı hazırlanamadı. Lütfen giriş yapın.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setErrorMessage('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Koschei AI Kayıt</h1>
      <p className="mb-6 text-sm text-white/70">Yeni hesabını oluştur ve agentlarını hemen kullanmaya başla.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">
          E-posta
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
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
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="En az 6 karakter"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Kayıt oluşturuluyor...' : 'Kayıt ol'}
        </button>
      </form>

      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}

      <p className="mt-6 text-sm text-white/80">
        Zaten hesabın var mı?{' '}
        <Link href="/signin" className="text-lilac underline underline-offset-4 hover:text-neon">
          Giriş yap
        </Link>
      </p>
    </main>
  );
}
