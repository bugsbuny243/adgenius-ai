import Link from 'next/link';

import { AuthForm } from '@/components/ui/auth-form';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Kayıt Ol</h1>
          <p className="text-sm text-zinc-400">Koschei ile agent iş akışını başlatın.</p>
        </div>
        <AuthForm mode="signup" />
        <p className="text-center text-sm text-zinc-400">
          Zaten hesabın var mı?{' '}
          <Link href="/login" className="text-indigo-300 hover:text-indigo-200">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}
