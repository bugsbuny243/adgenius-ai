'use client';

export default function GlobalError({
  reset,
}: {
  _error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 text-center">
        <h1 className="text-2xl font-semibold">Bir hata oluştu</h1>
        <p className="mt-2 text-sm text-zinc-300">Lütfen tekrar dene veya sayfayı yenile.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Tekrar Dene
        </button>
      </div>
    </main>
  );
}
