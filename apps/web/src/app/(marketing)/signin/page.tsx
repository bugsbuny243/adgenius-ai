'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { AuthForm } from '@/components/ui/auth-form';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const passwordUpdated = searchParams.get('passwordUpdated') === '1';

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Giriş Yap</h1>
          <p className="text-sm text-zinc-400">Koschei hesabınızla devam edin.</p>
        </div>
        {passwordUpdated ? <p className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-3 text-sm text-emerald-200">Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.</p> : null}
        <AuthForm mode="login" />
        <p className="text-right text-sm">
          <Link href="/reset-password" className="text-zinc-400 hover:text-indigo-300">
            Şifreni mi unuttun?
          </Link>
        </p>
        <p className="text-center text-sm text-zinc-400">
          Hesabın yok mu?{' '}
          <Link href="/signup" className="text-indigo-300 hover:text-indigo-200">
            Kayıt ol
          </Link>
        </p>
      </div>
    </div>
  );
}
