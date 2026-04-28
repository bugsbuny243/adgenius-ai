import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const features = [
  {
    title: '🎮 AI Brief',
    description: 'Oyun fikrine göre otomatik brief oluşturur.'
  },
  {
    title: '📱 Android App/Game Factory',
    description: 'Android oyun ve mobil uygulama üretim akışına odaklanır.'
  },
  {
    title: '📦 APK/AAB Build',
    description: 'Unity proje çıktısını APK/AAB olarak hazırlar.'
  },
  {
    title: '🚀 Play Store Yayın',
    description: 'Build’i doğrudan Google Play’e gönderir.'
  },
  {
    title: '🌐 Multiplayer/Sunucu Altyapısı',
    description: 'Multiplayer server, realtime gameplay server ve MMO/live-service altyapısı yakında.'
  }
] as const;

export default function HomePage() {
  return (
    <main className="panel space-y-10">
      <PublicSiteNav />

      <section className="space-y-5 rounded-2xl border border-white/10 bg-black/20 p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei AI • Game Factory</p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Oyununu AI ile Yönet</h1>
        <p className="max-w-3xl text-white/75">Oyun fikrinden Google Play&apos;e — tek platformda.</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/game-factory" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">
            Game Factory&apos;yi Dene
          </Link>
          <Link href="/signin" className="rounded-xl border border-white/20 px-5 py-3 hover:border-neon">
            Giriş Yap
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Özellikler</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {features.map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-white/70">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-6">
        <p className="text-sm text-amber-50/90">
          Koschei şu anda Android oyun ve Android mobil uygulama üretimi, APK/AAB build ve Google Play yayın akışına odaklanır. Multiplayer ve sunucu altyapısı yakında ayrı profesyonel paket olarak sunulacaktır.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
        <h2 className="text-3xl font-bold">Hemen Başla</h2>
        <p className="mt-2 text-white/75">Koschei Game Factory ile oyun üretim hattını tek panelden yönet.</p>
        <Link href="/signup" className="mt-4 inline-flex rounded-xl bg-neon px-5 py-3 font-semibold text-ink">
          Hemen Başla
        </Link>
      </section>
    </main>
  );
}
