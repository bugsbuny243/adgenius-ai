import { PublicSiteNav } from '@/components/public-site-nav';
import { GameAgentPackageCard } from '@/components/pricing/game-agent-package-card';
import { GAME_AGENT_PLANS, GAME_AGENT_PUBLIC_NOTICES } from '@/lib/game-agent-plans';

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold tracking-tight">Game Agent / Game Factory Paketleri</h1>
        <p className="max-w-2xl text-zinc-400">Bu fiyatlar yalnızca Game Agent ürün kapsamı içindir.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GAME_AGENT_PLANS.map((plan) => <GameAgentPackageCard key={plan.planKey} plan={plan} />)}
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
        <h2 className="text-lg font-semibold text-zinc-100">Önemli Bilgilendirme</h2>
        <ul className="mt-2 space-y-1 text-sm text-zinc-400">{GAME_AGENT_PUBLIC_NOTICES.map((notice) => <li key={notice}>• {notice}</li>)}</ul>
      </section>
    </main>
  );
}
