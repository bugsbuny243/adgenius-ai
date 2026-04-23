import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const faqItems = [
  {
    q: 'Koschei bugün ne sunuyor?',
    a: 'Koschei, içerik odaklı ekiplerin görevlerini tek ekranda izlemesine, brief hazırlamasına ve AI destekli taslak üretimine yardımcı olur.'
  },
  {
    q: 'Platform her şeyi otomatik olarak yayınlıyor mu?',
    a: 'Hayır. Platform öneriler üretir ve iş akışını hızlandırır. Yayınlama ve son onay adımları kullanıcı denetimi ile yapılır.'
  },
  {
    q: 'Kimler için uygun?',
    a: 'Küçük ekipler, ajanslar ve içerik operasyonunu daha düzenli yürütmek isteyen ürün/pazarlama ekipleri için uygundur.'
  },
  {
    q: 'Planlanan özellikler neler?',
    a: 'Geliştirme planında daha güçlü entegrasyonlar ve gelişmiş otomasyon araçları bulunur. Ancak bu özellikler hazır olduğunda ayrı olarak duyurulur.'
  }
];

export default function HomePage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />

      <section className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei AI</p>
        <h1 className="text-4xl font-bold">İçerik operasyonu için AI destekli çalışma alanı</h1>
        <p className="max-w-3xl text-white/75">
          Koschei, ekiplerin içerik görevlerini daha düzenli yönetmesine yardımcı olan bir iş akışı platformudur. Brief
          hazırlama, taslak üretimi ve süreç takibi gibi adımları tek yerde birleştirir.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">
            Hesap oluştur
          </Link>
          <Link href="/login" className="rounded-xl border border-white/20 px-5 py-3">
            Giriş yap
          </Link>
          <Link href="/articles" className="rounded-xl border border-white/20 px-5 py-3">
            Yazıları incele
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-2xl font-semibold">Kimler için?</h2>
          <p className="mt-2 text-white/75">
            İçerik üretiminde görev takibi zorlaşan küçük/orta ölçekli ekipler, ajanslar ve çoklu kanal içerik planlayan
            ekipler için tasarlanmıştır.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-2xl font-semibold">Bugün kullanılabilenler</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/75">
            <li>İçerik brief ve görev akışı yönetimi</li>
            <li>AI destekli taslak ve metin önerileri</li>
            <li>Proje ve çalışma adımlarını dashboard üzerinden takip</li>
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-2xl font-semibold">Planlanan geliştirmeler</h2>
        <p className="mt-2 text-white/75">
          Üçüncü taraf platform entegrasyonları ve daha gelişmiş otomasyon yetenekleri üzerinde çalışıyoruz. Bu alanlar
          aşamalı olarak yayınlanır ve canlıya alınan özellikler ürün duyurularında açıkça belirtilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Sık sorulan sorular</h2>
        <div className="space-y-3">
          {faqItems.map((item) => (
            <article key={item.q} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-1 text-white/75">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="text-sm text-white/70">
        <p>
          Yasal ve güven sayfaları: <Link href="/about" className="text-neon hover:underline">Hakkımızda</Link>,{' '}
          <Link href="/contact" className="text-neon hover:underline">İletişim</Link>,{' '}
          <Link href="/privacy" className="text-neon hover:underline">Gizlilik Politikası</Link>,{' '}
          <Link href="/terms" className="text-neon hover:underline">Kullanım Koşulları</Link> ve{' '}
          <Link href="/cookies" className="text-neon hover:underline">Çerez Politikası</Link>.
        </p>
      </section>
    </main>
  );
}
