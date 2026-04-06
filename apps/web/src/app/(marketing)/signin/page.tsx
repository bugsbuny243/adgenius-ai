import Link from 'next/link';

import { AuthForm } from '@/components/ui/auth-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Giriş Yap</h1>
          <p className="text-sm text-zinc-400">Koschei hesabınızla devam edin.</p>
        </div>
        <AuthForm mode="login" />
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
