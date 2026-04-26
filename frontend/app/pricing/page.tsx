import { PublicSiteNav } from '@/components/public-site-nav';
import { GameAgentPackageCard } from '@/components/pricing/game-agent-package-card';
import { GAME_AGENT_PACKAGES } from '@/lib/game-agent-pricing';

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />

      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Game Factory Paketleri</h1>
        <p className="max-w-2xl text-white/75">Aşağıdaki planlar, Game Factory için güncel paketlerdir.</p>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GAME_AGENT_PACKAGES.map((plan) => (
            <GameAgentPackageCard key={plan.planKey} plan={plan} />
          ))}
        </div>
      </section>
    </main>
  );
}
