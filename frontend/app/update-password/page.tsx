'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== passwordRepeat) {
      setErrorMessage('Girilen şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setErrorMessage('Sistem ayarları eksik. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage('Şifre güncellenemedi. Lütfen tekrar deneyin.');
        return;
      }

      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Yeni şifre belirle</h1>
      <p className="mb-6 text-sm text-white/70">Güvenli bir şifre oluştur ve hesabına devam et.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          Yeni şifre
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
        </label>

        <label className="block text-sm">
          Yeni şifre (tekrar)
          <input
            required
            type="password"
            minLength={6}
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
        </button>
      </form>

      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
    </main>
  );
}
