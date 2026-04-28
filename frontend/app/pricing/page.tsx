import { PublicSiteNav } from '@/components/public-site-nav';
import { GameAgentPackageCard } from '@/components/pricing/game-agent-package-card';
import { GAME_AGENT_PLANS, GAME_AGENT_PUBLIC_NOTICES } from '@/lib/game-agent-plans';

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />

      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Game Agent / Game Factory Paketleri</h1>
        <p className="max-w-2xl text-white/75">Bu fiyatlar yalnızca Game Agent ürün kapsamı içindir.</p>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GAME_AGENT_PLANS.map((plan) => (
            <GameAgentPackageCard key={plan.planKey} plan={plan} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/15 bg-black/20 p-4">
        <h2 className="text-lg font-semibold text-white">Yakında (Profesyonel Altyapı Paketi)</h2>
        <ul className="mt-2 space-y-1 text-sm text-white/80">
          <li>• Multiplayer server — <span className="font-semibold text-amber-300">Yakında</span></li>
          <li>• Realtime gameplay server — <span className="font-semibold text-amber-300">Yakında</span></li>
          <li>• MMO/live-service infrastructure — <span className="font-semibold text-amber-300">Yakında</span></li>
          <li>• Matchmaking/lobby/chat server — <span className="font-semibold text-amber-300">Yakında</span></li>
          <li>• Dedicated game server hosting — <span className="font-semibold text-amber-300">Yakında</span></li>
        </ul>
      </section>

      <section className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4">
        <h2 className="text-lg font-semibold text-amber-100">Önemli Bilgilendirme</h2>
        <ul className="mt-2 space-y-1 text-sm text-amber-50/90">
          {GAME_AGENT_PUBLIC_NOTICES.map((notice) => (
            <li key={notice}>• {notice}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
