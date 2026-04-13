import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="panel mx-auto max-w-xl text-center">
      <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-white/70">Aradığın sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link href="/dashboard" className="mt-4 inline-block rounded-lg border border-white/20 px-4 py-2">
        Göstergeye Dön
      </Link>
    </main>
  );
}
