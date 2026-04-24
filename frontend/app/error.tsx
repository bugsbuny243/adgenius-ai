'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const isServerActionVersionMismatch =
    error.message.includes('Failed to find Server Action') ||
    error.message.includes('older or newer deployment');

  return (
    <main className="panel mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Bir hata oluştu</h1>
      <p className="mt-2 text-sm text-white/70">
        {isServerActionVersionMismatch
          ? 'Uygulama yeni bir sürüme geçti. Lütfen sayfayı yenileyip tekrar dene.'
          : 'İşlem tamamlanamadı. Lütfen tekrar dene.'}
      </p>
      <p className="mt-2 text-xs text-red-300">{error.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={reset} className="rounded-lg border border-white/20 px-4 py-2">
          Tekrar Dene
        </button>
        {isServerActionVersionMismatch ? (
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-white/20 px-4 py-2"
          >
            Sayfayı Yenile
          </button>
        ) : null}
      </div>
    </main>
  );
}
