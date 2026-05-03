import { PublicSiteNav } from '@/components/public-site-nav';
import { GameAgentPackageCard } from '@/components/pricing/game-agent-package-card';
import { GAME_AGENT_PLANS, GAME_AGENT_PUBLIC_NOTICES } from '@/lib/game-agent-plans';

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <section className="mx-auto max-w-7xl space-y-8 rounded-3xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-violet-300">Fiyatlandırma</p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-100">Game Agent / Game Factory Paketleri</h1>
        <p className="max-w-2xl text-zinc-400">Bu fiyatlar yalnızca Game Agent ürün kapsamı içindir.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GAME_AGENT_PLANS.map((plan) => <GameAgentPackageCard key={plan.planKey} plan={plan} />)}
      </section>
      <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-zinc-100">Önemli Bilgilendirme</h2>
        <ul className="mt-2 space-y-1 text-sm text-zinc-400">{GAME_AGENT_PUBLIC_NOTICES.map((notice) => <li key={notice}>• {notice}</li>)}</ul>
      </section>
      </section>
    </main>
  );
}
