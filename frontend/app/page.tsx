import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="panel space-y-5">
      <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei</p>
      <h1 className="text-4xl font-bold">Entegrasyonsuz çekirdek içerik akışı</h1>
      <p className="max-w-2xl text-white/70">
        Koschei ile ekipler içerik brief oluşturur, platform varyantları üretir, çalıştırmaları izler ve yayın kuyruğunu mock
        olarak yönetir.
      </p>
      <div className="flex gap-3">
        <Link href="/signin" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">
          Giriş Yap
        </Link>
        <Link href="/dashboard" className="rounded-xl border border-white/20 px-5 py-3">
          Gösterge
        </Link>
      </div>
    </main>
  );
}
