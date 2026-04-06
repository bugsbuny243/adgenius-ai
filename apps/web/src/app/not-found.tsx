import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
        <h1 className="text-2xl font-semibold">Sayfa Bulunamadı</h1>
        <p className="mt-2 text-sm text-zinc-300">Aradığın sayfa mevcut değil.</p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Dashboard&apos;a Dön
        </Link>
      </div>
    </main>
  );
}
