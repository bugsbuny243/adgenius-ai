'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Lock, Mail } from 'lucide-react';
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
      const bootstrapResponse = await fetch('/api/bootstrap', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-black to-black" />
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(139,92,246,0.2)]">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Create Account</p>
        <h1 className="mt-3 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">Join Koschei AI</h1>
        <p className="mt-2 text-sm text-zinc-500">Launch your first cyber-grade game pipeline in minutes.</p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-zinc-400">E-posta
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-black/50 py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500/50" placeholder="ornek@koschei.ai" />
            </div>
          </label>
          <label className="block text-sm text-zinc-400">Şifre
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-black/50 py-2.5 pl-10 pr-3 text-sm text-zinc-100 outline-none transition focus:border-violet-500/50" placeholder="En az 6 karakter" />
            </div>
          </label>
          <button disabled={loading} type="submit" className="w-full rounded-xl border border-violet-500/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-4 py-2.5 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_22px_-8px_rgba(139,92,246,0.8)] transition hover:brightness-110 disabled:opacity-50">{loading ? 'Kayıt oluşturuluyor...' : 'Kayıt ol'}</button>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
        <p className="mt-6 text-sm text-zinc-500">Zaten hesabın var mı? <Link href="/signin" className="text-violet-300 hover:text-violet-200">Giriş yap</Link></p>
      </section>
    </main>
  );
}
