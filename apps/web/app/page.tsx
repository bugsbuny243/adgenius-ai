import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="panel space-y-5">
      <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei AI</p>
      <h1 className="text-4xl font-bold">Next.js 16 + Supabase Command Center</h1>
      <p className="max-w-2xl text-white/70">
        Bu proje artık demo function paneli değil. Auth, middleware, dashboard ve agent operasyon sayfalarıyla
        ölçeklenebilir bir temel sunar.
      </p>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">
          Giriş Yap
        </Link>
        <Link href="/dashboard" className="rounded-xl border border-white/20 px-5 py-3">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
