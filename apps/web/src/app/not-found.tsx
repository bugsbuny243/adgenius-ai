import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
        <h1 className="text-3xl font-semibold">404 — Sayfa Bulunamadı</h1>
        <p className="mt-3 text-sm text-zinc-300">
          Aradığınız sayfa taşınmış, silinmiş veya bağlantı hatalı olabilir.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
        >
          Dashboard&apos;a Dön
        </Link>
      </section>
    </main>
  );
}
