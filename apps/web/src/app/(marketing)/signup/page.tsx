import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';
import { AuthForm } from '@/components/ui/auth-form';

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-5">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Kayıt Ol</h1>
            <p className="text-sm text-zinc-400">Koschei ile task composer odaklı çalışma alanını başlatın.</p>
          </div>
          <AuthForm mode="signup" />
          <p className="text-center text-sm text-zinc-400">
            Zaten hesabın var mı?{' '}
            <Link href="/signin" className="text-indigo-300 hover:text-indigo-200">
              Giriş yap
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
