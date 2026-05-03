'use client';

import { useState } from 'react';
import type { GameAgentPlan } from '@/lib/game-agent-plans';

type Props = {
  plan: GameAgentPlan;
};

export function GameAgentPackageCard({ plan }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckout() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pricing/game-agent-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey: plan.planKey })
      });
      if (!response.ok) throw new Error('checkout_request_failed');
      const payload = (await response.json()) as { checkoutUrl?: string };
      const checkoutUrl = payload.checkoutUrl || plan.shopierUrl;
      const opened = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.href = checkoutUrl;
    } catch (error) {
      console.error('checkout_error', error);
      window.location.href = plan.shopierUrl;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article className="rounded-3xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-wide text-violet-300">Game Agent Paketi</p>
      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-100">{plan.name}</h3>
      <p className="mt-1 text-sm text-zinc-400">{plan.summary}</p>
      <p className="mt-2 text-xl font-bold text-violet-300">{plan.priceLabel}</p>
      <h4 className="mt-4 text-sm font-semibold text-zinc-100">Dahil:</h4>
      <ul className="mt-2 space-y-1 text-sm text-zinc-300">{plan.includes.map((feature) => <li key={feature}>• {feature}</li>)}</ul>
      <h4 className="mt-4 text-sm font-semibold text-zinc-100">Dahil Değil:</h4>
      <ul className="mt-2 space-y-1 text-sm text-zinc-400">{plan.excludes.map((feature) => <li key={feature}>• {feature}</li>)}</ul>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="mt-6 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Yönlendiriliyor...' : 'Shopier ile öde'}
      </button>
    </article>
  );
}
