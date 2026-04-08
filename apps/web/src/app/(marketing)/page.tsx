import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

const highlights = [
  'Task composer ile tek ekranda çalıştırma, sonuç alma ve kaydetme',
  'Auth sonrası doğrudan dashboard + agent akışı',
  'Run geçmişi ve kayıtlı çıktılarla tekrar kullanılabilir üretim',
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 md:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Koschei</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">
            AI çalışma alanını tek akışta yönet
          </h1>
          <p className="mt-4 max-w-3xl text-zinc-300">
            Koschei, ekiplerin agent tabanlı görevlerini başlatıp çıktıyı üretmesine, kaydetmesine ve tekrar
            kullanmasına odaklanan bir çalışma alanıdır.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400">
              Ücretsiz Başla
            </Link>
            <Link href="/agents" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500">
              Agentları İncele
            </Link>
            <Link href="/pricing" className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500">
              Planları Gör
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-300">
              {item}
            </article>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
