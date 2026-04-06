import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';
import { AuthForm } from '@/components/ui/auth-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Giriş Yap</h1>
            <p className="text-sm text-zinc-400">Koschei hesabınızla görev akışına devam edin.</p>
          </div>
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
      </main>
      <SiteFooter />
    </div>
  );
}
