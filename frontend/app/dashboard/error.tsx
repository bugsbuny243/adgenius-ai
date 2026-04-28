'use client';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  const isServerActionVersionMismatch =
    error.message.includes('Failed to find Server Action') ||
    error.message.includes('older or newer deployment');

  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">Dashboard yüklenemedi</h2>
      <p className="text-sm text-white/70">
        {isServerActionVersionMismatch
          ? 'Yeni bir dağıtıma geçildi. Lütfen sayfayı yenile ve tekrar dene.'
          : error.message}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={reset} className="rounded-lg border border-white/20 px-3 py-1 text-sm">
          Yeniden Dene
        </button>
        {isServerActionVersionMismatch ? (
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-white/20 px-3 py-1 text-sm"
          >
            Sayfayı Yenile
          </button>
        ) : null}
      </div>
    </section>
  );
}
