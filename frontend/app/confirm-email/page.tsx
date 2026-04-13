import Link from 'next/link';

export default function ConfirmEmailPage() {
  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">E-postanı doğrula</h1>
      <p className="mb-6 text-sm text-white/70">Gelen kutunu kontrol et ve doğrulama bağlantısına tıklayarak hesabını etkinleştir.</p>
      <Link href="/signin" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-neon hover:text-neon">
        Giriş sayfasına dön
      </Link>
    </main>
  );
}
