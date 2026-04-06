'use client';

import { useEffect } from 'react';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Application error boundary triggered:', {
      message: error.message,
      name: error.name,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 text-center">
        <h1 className="text-2xl font-semibold">Bir hata oluştu</h1>
        <p className="mt-3 text-sm text-zinc-300">Beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.</p>
        {isDevelopment ? (
          <p className="mt-4 rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2 text-left text-xs text-rose-200">
            Hata ayrıntısı geliştirici konsoluna yazdırıldı.{' '}
            {error.digest ? `Hata kimliği: ${error.digest}` : 'Hata kimliği alınamadı.'}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
        >
          Tekrar Dene
        </button>
      </section>
    </main>
  );
}
