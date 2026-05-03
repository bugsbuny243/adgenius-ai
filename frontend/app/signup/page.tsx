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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Create Account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100">Koschei AI Kayıt</h1>
        <p className="mt-2 text-sm text-zinc-400">Yeni hesabını oluştur ve agentlarını hemen kullanmaya başla.</p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-zinc-400">E-posta
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-3 text-sm text-zinc-100 transition-all outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/50" placeholder="ornek@koschei.ai" />
            </div>
          </label>
          <label className="block text-sm text-zinc-400">Şifre
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input required type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-3 text-sm text-zinc-100 transition-all outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/50" placeholder="En az 6 karakter" />
            </div>
          </label>
          <button disabled={loading} type="submit" className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">{loading ? 'Kayıt oluşturuluyor...' : 'Kayıt ol'}</button>
        </form>

        {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
        <p className="mt-6 text-sm text-zinc-400">Zaten hesabın var mı? <Link href="/signin" className="text-violet-300 transition-transform hover:scale-[1.02] hover:text-violet-200">Giriş yap</Link></p>
      </section>
    </main>
  );
}
