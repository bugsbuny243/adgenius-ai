import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">E-postanı doğrula</h1>
        <p className="mt-3 max-w-xl text-zinc-300">
          Koschei hesabını etkinleştirmek için gelen kutunu kontrol et ve doğrulama bağlantısına tıkla.
        </p>
        <Link
          href="/signin"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Giriş Yap
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
