import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-100">
      <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Koschei AI</p>
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
          Koschei AI production health isolation mode
        </h1>
        <p className="text-zinc-300">
          Bu sayfa geçici olarak tamamen statik hale getirildi. Auth, session, Supabase ve workspace çözümleme
          çağrıları devre dışı bırakıldı.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/api/health"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Health endpoint
          </Link>
          <Link
            href="/signin"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
