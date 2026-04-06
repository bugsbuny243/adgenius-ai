import Link from 'next/link';

import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';
import { createServerSupabase } from '@/lib/supabase/server';

const useCases = [
  {
    title: 'Pazarlama kampanyası üretimi',
    detail: 'Topluluktan yüksek performanslı şablonları klonlayıp ekip içinde tekrar kullanın.',
  },
  {
    title: 'Satış ekipleri için kişiselleştirme',
    detail: 'Creator marketplace içindeki outbound, follow-up ve toplantı sonrası akışları hızla devreye alın.',
  },
  {
    title: 'Operasyon SOP otomasyonu',
    detail: 'Standart çıktı üreten template kütüphanesi ile süreçleri ekipler arası ölçeklendirin.',
  },
];

type TemplateHighlight = {
  id: string;
  slug: string;
  title: string;
  description: string;
  clone_count: number;
  category: string;
};

export default async function HomePage() {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('templates')
    .select('id, slug, title, description, clone_count, category')
    .eq('is_public', true)
    .order('clone_count', { ascending: false })
    .limit(3);

  const popularTemplates = (data ?? []) as TemplateHighlight[];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-6xl space-y-16 px-4 py-14">
        <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Koschei v4.0</p>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
            AI agent araçlarından network etkisi üreten template ekosistemine geçin
          </h1>
          <p className="max-w-3xl text-zinc-300 md:text-lg">
            Public template marketplace, creator profilleri ve clone-to-workspace akışı ile bilgi birikimini ürün içine gömen
            paylaşılabilir bir büyüme motoru kurun.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/templates" className="rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400">
              Template Gallery&apos;yi Keşfet
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white"
            >
              Planları Gör
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold">Popüler Template&apos;ler</h2>
            <Link href="/templates" className="text-sm text-indigo-300 hover:text-indigo-200">
              Tümünü gör
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {popularTemplates.map((template) => (
              <article key={template.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{template.category}</p>
                <h3 className="mt-2 text-lg font-medium">{template.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{template.description}</p>
                <p className="mt-3 text-xs text-zinc-500">{template.clone_count} klon</p>
                <Link href={`/templates/${template.slug}`} className="mt-4 inline-flex text-sm text-indigo-300 hover:text-indigo-200">
                  Detayı İncele
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Örnek Kullanım Senaryoları</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {useCases.map((item) => (
              <article key={item.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <h3 className="text-lg font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-2xl font-semibold">SEO ve Public Discovery Odaklı İçerik Katmanı</h2>
          <p className="mt-3 text-zinc-300">
            Koschei template sayfaları kalıcı slug yapısı, creator profilleri ve detaylı örnek çıktı içerikleri ile organik arama
            trafiğini ürüne yönlendirir. Her public template hem keşif sayfası hem de aktivasyon giriş noktasıdır.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
