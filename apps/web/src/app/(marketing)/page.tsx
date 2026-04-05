import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

const howItWorks = [
  'İhtiyacınıza uygun agent türünü seçin.',
  'Hedefinizi ve bağlamı net bir şekilde tanımlayın.',
  'Tradepiglobal AI engine çıktısını üretin, düzenleyin ve kaydedin.',
];

const forWho = [
  'Pazarlama ve içerik ekipleri',
  'Satış ve müşteri iletişimi yöneten ekipler',
  'E-ticaret operasyonları ve ürün ekipleri',
  'Düzenli raporlama yapan bağımsız profesyoneller',
];

const faq = [
  {
    question: 'Tradepiglobal AI ne sunar?',
    answer:
      'Tekrarlayan üretim görevlerini hızlandıran, kurumsal düzende kullanılabilen AI agent çalışma alanı sunar.',
  },
  {
    question: 'Çıktılar doğrudan kullanılabilir mi?',
    answer:
      'Çıktılar üretim süresini kısaltır; yayın veya müşteri iletişimi öncesi nihai gözden geçirme kullanıcı sorumluluğundadır.',
  },
  {
    question: 'Küçük ekipler için uygun mu?',
    answer: 'Evet. Küçük ekiplerden büyüyen organizasyonlara kadar esnek kullanım senaryoları desteklenir.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl space-y-16 px-4 py-14">
        <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Tradepiglobal AI</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
            AI destekli agent çalışma alanı ile ekip üretimini hızlandırın
          </h1>
          <p className="max-w-3xl text-zinc-300 md:text-lg">
            Tradepiglobal AI; içerik, e-posta, araştırma ve operasyon görevlerinde düzenli, izlenebilir ve tekrar
            kullanılabilir bir üretim akışı sağlar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Ücretsiz Başla
            </Link>
            <Link
              href="/agents"
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              Agentları İncele
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-2xl font-semibold">Hakkımızda kısa özet</h2>
            <p className="mt-3 text-zinc-300">
              Tradepiglobal AI, ekiplerin tekrar eden dijital üretim işlerini daha hızlı ve daha tutarlı yönetmesi
              için tasarlanmış bir AI agent platformudur.
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-2xl font-semibold">Ne yapar?</h2>
            <p className="mt-3 text-zinc-300">
              Görev girdilerinizi yapılandırır, AI modeli ile çıktıları üretir ve sonuçları çalışma geçmişinde
              saklayarak ekip içi tekrar kullanım sağlar.
            </p>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <h2 className="md:col-span-3 text-2xl font-semibold">Nasıl çalışır?</h2>
          {howItWorks.map((item, index) => (
            <article key={item} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="mb-3 text-xs text-zinc-500">Adım {index + 1}</p>
              <p className="font-medium text-zinc-200">{item}</p>
            </article>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Kimler için?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {forWho.map((item) => (
              <article key={item} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-zinc-300">
                {item}
              </article>
            ))}
          </div>
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
      <SiteFooter />
    </div>
  );
}
