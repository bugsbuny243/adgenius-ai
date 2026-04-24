import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const agentLibrary = [
  { name: 'Blogger Agent', desc: 'Blog içeriği, SEO başlığı ve yayın hazırlığı oluşturur.', status: 'Aktif' },
  { name: 'YouTube Channel Planner', desc: 'Video serisi planı, bölüm akışı ve yayın takvimi çıkarır.', status: 'Aktif' },
  { name: 'Game Factory', desc: 'Prompttan oyun üret, Unity build al, AAB çıktısını yönet.', status: 'Aktif' },
  { name: 'Play Publisher Assistant', desc: 'Mağaza metinleri, sürüm notları ve yayın öncesi kontrol listesi üretir.', status: 'Yayın akışı' },
  { name: 'Sheets Agent', desc: 'Tablo tabanlı iş takibi, içerik planı ve operasyon listeleri düzenler.', status: 'Aktif' },
  { name: 'Gmail Business Assistant', desc: 'İş e-postalarını taslaklar, yanıt önerileri ve takip aksiyonları hazırlar.', status: 'Aktif' },
  { name: 'SEO / Indexing Agent', desc: 'Teknik SEO kontrolü, başlık önerileri ve indeksleme hazırlığı yapar.', status: 'Yakında' },
  { name: 'Research Agent', desc: 'Konu analizi yapar, kaynak notları ve kısa araştırma raporları üretir.', status: 'Aktif' }
] as const;

export default function HomePage() {
  return (
    <main className="panel space-y-10">
      <PublicSiteNav />

      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei AI Agent Workspace</p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Fikirlerini çalışan AI ajanlarına dönüştür.</h1>
        <p className="max-w-3xl text-white/75">
          Koschei; içerik üretimi, oyun geliştirme, yayın hazırlığı ve iş akışlarını tek panelden yöneten AI ajan çalışma
          alanıdır.
        </p>
        <p className="max-w-3xl text-white/70">
          Koschei, fikirlerini çalışan yapay zekâ ajanlarına dönüştürür.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/agents" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">
            Ajanları keşfet
          </Link>
          <Link href="/game-factory" className="rounded-xl border border-white/20 px-5 py-3 hover:border-neon">
            Game Factory’yi incele
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Koschei ne yapar?</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            'Promptlarını görev akışlarına dönüştürür.',
            'Ajanlar plan çıkarır, taslak üretir, kontrol listesi hazırlar.',
            'Hassas işlemler kullanıcı onayıyla ilerler.'
          ].map((item) => (
            <article key={item} className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/80">
              {item}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Agent Library</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {agentLibrary.map((agent) => (
            <article key={agent.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold">{agent.name}</h3>
                <span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-1 text-xs text-neon">{agent.status}</span>
              </div>
              <p className="mt-2 text-sm text-white/70">{agent.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6 space-y-3">
        <h2 className="text-2xl font-semibold">Game Factory</h2>
        <p className="text-white/75">Prompttan oyun üret, Unity build al, AAB çıktısını yönet.</p>
        <ul className="list-disc space-y-1 pl-5 text-white/75">
          <li>Prompttan oyun fikri</li>
          <li>Template seçimi</li>
          <li>Unity build hazırlığı</li>
          <li>APK/AAB üretim süreci</li>
          <li>Build kredisi ve kullanıcı onayı</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6 space-y-2">
        <h2 className="text-2xl font-semibold">Onay temelli iş akışları</h2>
        <p className="text-white/75">
          Koschei; yayınlama, uygulama yükleme, ücretli işlem veya hesap bağlantısı gibi kritik adımları kullanıcı onayı
          olmadan başlatmaz.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6 space-y-2">
        <h2 className="text-2xl font-semibold">Entegrasyonlar ve bağlı araçlar</h2>
        <p className="text-white/75">
          Koschei; yayın, içerik, e-posta, tablo, oyun geliştirme ve mağaza süreçlerinde kullanılan harici hesaplarla
          bağlantılı çalışacak şekilde tasarlanır.
        </p>
        <p className="text-sm text-white/60">Desteklenen bağlantılar ürün içinde açıkça gösterilir.</p>
        <p className="text-sm text-white/60">
          Bağlanabilir servisler, yayın platformları, geliştirici araçları ve platform entegrasyonları iş akışına göre
          yönetilir.
        </p>
      </section>
    </main>
  );
}
