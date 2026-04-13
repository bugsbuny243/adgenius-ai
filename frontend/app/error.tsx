'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="panel mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Bir hata oluştu</h1>
      <p className="mt-2 text-sm text-white/70">İşlem tamamlanamadı. Lütfen tekrar dene.</p>
      <p className="mt-2 text-xs text-red-300">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-lg border border-white/20 px-4 py-2">
        Tekrar Dene
      </button>
    </main>
  );
}
