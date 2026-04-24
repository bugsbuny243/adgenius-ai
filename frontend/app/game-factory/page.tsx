import { PublicSiteNav } from '@/components/public-site-nav';

export default function GameFactoryPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei Game Factory</p>
        <h1 className="text-4xl font-bold">Game Factory</h1>
        <p className="max-w-3xl text-white/75">
          Koschei Game Factory, oyun üretim sürecini fikirden build aşamasına kadar tek panelde yöneten ajan tabanlı bir
          çalışma akışıdır.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6">
        <ul className="list-disc space-y-1 pl-5 text-white/75">
          <li>Prompttan oyun fikri üretimi</li>
          <li>Template seçimi ve görev planı</li>
          <li>Unity destekli build pipeline hazırlığı</li>
          <li>APK/AAB üretim sürecinin yönetimi</li>
          <li>Build kredisi takibi ve kullanıcı onayı adımları</li>
        </ul>
      </section>

      <p className="text-sm text-white/60">
        Build ve yayın adımları kullanıcı onayı gerektirir; platform değerlendirmeleri dış süreçlere bağlıdır.
      </p>
    </main>
  );
}
