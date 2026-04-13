'use client';

import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setErrorMessage('Sistem ayarları eksik. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      const redirectTo = `${window.location.origin}/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setErrorMessage('Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin.');
        return;
      }

      setMessage('Şifre yenileme bağlantısı e-posta adresine gönderildi. Gelen kutunu kontrol et.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Şifreni yenile</h1>
      <p className="mb-6 text-sm text-white/70">Hesabına bağlı e-posta adresini gir, sana şifre yenileme bağlantısı gönderelim.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}
        </button>
      </form>

      {message ? <p className="mt-4 text-sm text-lilac">{message}</p> : null}
      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
    </main>
  );
}
