'use client';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">Dashboard yüklenemedi</h2>
      <p className="text-sm text-white/70">{error.message}</p>
      <button onClick={reset} className="mt-3 rounded-lg border border-white/20 px-3 py-1 text-sm">
        Yeniden Dene
      </button>
    </section>
  );
}
