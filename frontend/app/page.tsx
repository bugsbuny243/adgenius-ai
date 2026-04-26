import Link from 'next/link';
import { AdSenseSlot } from '@/components/ads/AdSenseSlot';
import { PublicSiteNav } from '@/components/public-site-nav';

const agentLibrary = [
  { name: 'Game Agent', desc: 'Oyun fikrini görevlere böler, üretim adımlarını planlar ve build sürecini görünür hale getirir.' },
  { name: 'YouTube Agent', desc: 'İçerik fikri, bölüm akışı, başlık ve yayın takvimi üretiminde ekiplere hız kazandırır.' },
  { name: 'Blogger Agent', desc: 'SEO uyumlu blog briefleri, içerik taslakları ve editoryal kontrol akışı oluşturur.' },
  { name: 'İşletme Agent', desc: 'Küçük ve orta ölçekli işletmeler için operasyon, raporlama ve planlama şablonları önerir.' }
] as const;

export default function HomePage() {
  return (
    <main className="panel space-y-10">
      <PublicSiteNav />

      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-6 md:p-8">
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Koschei nedir?</h1>
        <p className="max-w-4xl text-white/75">
          Koschei; içerik, oyun ve üretim operasyonlarını tek merkezde yöneten bir AI çalışma alanıdır. Sistem; fikir üretimi,
          görev takibi, yayın kuyruğu ve insan onayı adımlarını tek akışta birleştirir. Böylece ekipler dağınık araçlar arasında
          kaybolmadan planlı, ölçülebilir ve kontrollü şekilde üretim yapabilir.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/pricing" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">Fiyatlandırmayı gör</Link>
          <Link href="/blog" className="rounded-xl border border-white/20 px-5 py-3 hover:border-neon">Blog yazılarını oku</Link>
          <Link href="/guides" className="rounded-xl border border-white/20 px-5 py-3 hover:border-neon">Rehberleri incele</Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4 ana agent</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {agentLibrary.map((agent) => (
            <article key={agent.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="text-base font-semibold">{agent.name}</h3>
              <p className="mt-2 text-sm text-white/70">{agent.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-xl font-semibold">Kimler için?</h2>
          <p className="mt-2 text-white/75">
            Koschei; içerik ekipleri, yaratıcı ajanslar, bağımsız üreticiler, oyun stüdyoları ve küçük işletmeler için tasarlanmıştır.
            Az kişiyle çok iş yapan ekipler, bu modelle görevleri görünür hale getirip daha düzenli yayın ritmi yakalar.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-xl font-semibold">Nasıl çalışır?</h2>
          <p className="mt-2 text-white/75">
            Önce hedef ve brief tanımlanır, ardından ilgili agent taslak üretir. Ekip çıktıyı düzenler, kalite kontrolünden geçirir ve
            yayın kuyruğuna alır. Son adım insan onayıdır; bu sayede otomasyon hızı korunurken marka güveni de korunur.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <h2 className="text-2xl font-semibold">Daha fazla içerik</h2>
        <p className="mt-2 text-white/75">Koschei yaklaşımını detaylı anlamak için blog ve rehber sayfalarımızı ziyaret edin.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/blog" className="rounded-lg border border-white/20 px-3 py-2 hover:border-neon">Blog</Link>
          <Link href="/guides" className="rounded-lg border border-white/20 px-3 py-2 hover:border-neon">Rehberler</Link>
          <Link href="/about" className="rounded-lg border border-white/20 px-3 py-2 hover:border-neon">Hakkımızda</Link>
          <Link href="/contact" className="rounded-lg border border-white/20 px-3 py-2 hover:border-neon">İletişim</Link>
        </div>
      </section>

      <AdSenseSlot slot="1000000000" hasContent className="rounded-2xl border border-white/10 bg-black/20 p-4" />
    </main>
  );
}
