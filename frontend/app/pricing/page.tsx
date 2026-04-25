import { PublicSiteNav } from '@/components/public-site-nav';
import { GameAgentPackageCard } from '@/components/pricing/game-agent-package-card';
import { GAME_AGENT_PACKAGES } from '@/lib/game-agent-pricing';

const OTHER_AGENTS = [
  'Blogger Agent',
  'YouTube Agent'
] as const;

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />

      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Koschei Paketleri</h1>
        <p className="max-w-2xl text-white/75">Game Agent / Game Factory paketleri ayrı sunulur. Diğer ajanlar için fiyatlandırma ayrıca yayınlanacaktır.</p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Game Agent / Game Factory Paketleri</h2>
          <p className="text-sm text-white/70">Bu Shopier ödeme bağlantıları yalnızca Game Agent paketleri için geçerlidir.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GAME_AGENT_PACKAGES.map((plan) => (
            <GameAgentPackageCard key={plan.planKey} plan={plan} />
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-6">
        <div>
          <h2 className="text-2xl font-semibold">Diğer Koschei Ajanları</h2>
          <p className="text-sm text-white/70">Diğer ajanların fiyatlandırması ayrı paketlerle sunulacaktır.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {OTHER_AGENTS.map((agent) => (
            <article key={agent} className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="font-medium text-white">{agent}</h3>
              <p className="mt-2 text-sm text-white/65">Yakında fiyatlandırılacak</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/75">
        <h2 className="text-lg font-semibold text-white">Ödeme ve Aktivasyon Notları</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Game Agent paketinde ödeme başlatıldığında kullanıcı giriş yapmışsa payment_orders kaydı pending olarak açılır.</li>
          <li>Paket aktivasyonu sadece ödeme doğrulaması veya owner/admin manuel onayı ile yapılır.</li>
          <li>Yalnızca ödeme bağlantısına tıklamak paket aktivasyonu sağlamaz.</li>
          <li>Ödeme sağlayıcısı: Shopier • Para birimi: TRY</li>
        </ul>
      </section>
    </main>
  );
}
