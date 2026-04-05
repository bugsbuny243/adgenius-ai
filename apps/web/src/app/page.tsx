import Link from 'next/link';

import { SiteNavbar } from '@/components/site-navbar';

const howItWorks = [
  'Agent türünü seçin',
  'Görevinizi netçe yazın',
  'Gemini çıktısını alın ve kaydedin',
];

const agentTypes = ['İçerik', 'E-posta', 'Araştırma', 'E-ticaret', 'Sosyal', 'Raporlama'];

const faq = [
  {
    question: 'Koschei kimler için uygun?',
    answer: 'Pazarlama, operasyon, satış ve ürün ekipleri için tasarlanmıştır.',
  },
  {
    question: 'Kredi kartı gerekiyor mu?',
    answer: 'Hayır, ücretsiz deneme ile başlayabilirsiniz.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl space-y-16 px-4 py-14">
        <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Koschei</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
            İşini AI agent’lara devret
          </h1>
          <p className="max-w-3xl text-zinc-300 md:text-lg">
            Koschei, içerik, e-posta, araştırma, e-ticaret, raporlama ve daha fazlası için çalışan AI
            agent ekibiniz.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Ücretsiz Dene
            </Link>
            <Link
              href="/agents"
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              Agentları Gör
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <h2 className="md:col-span-3 text-2xl font-semibold">Nasıl çalışır?</h2>
          {howItWorks.map((item, index) => (
            <article key={item} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="mb-3 text-xs text-zinc-500">Adım {index + 1}</p>
              <p className="font-medium">{item}</p>
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Agent türleri</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {agentTypes.map((type) => (
              <div key={type} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-zinc-300">
                {type}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Fiyatlar</h2>
          <p className="text-zinc-300">Basit, ölçeklenebilir paketler. Ayrıntılar için fiyatlar sayfasına göz atın.</p>
          <Link href="/pricing" className="text-sm text-indigo-300 hover:text-indigo-200">
            Fiyatları incele →
          </Link>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Sık sorulan sorular</h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <article key={item.question} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="font-medium">{item.question}</h3>
                <p className="mt-1 text-zinc-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
