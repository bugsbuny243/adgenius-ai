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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planKey: plan.planKey })
      });

      if (!response.ok) {
        throw new Error('checkout_request_failed');
      }

      const payload = (await response.json()) as { checkoutUrl?: string };
      const checkoutUrl = payload.checkoutUrl || plan.shopierUrl;
      const opened = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');

      if (!opened) {
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('checkout_error', error);
      window.location.href = plan.shopierUrl;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-6">
      <p className="text-xs uppercase tracking-wide text-lilac">Game Agent Paketi</p>
      <h3 className="mt-1 text-2xl font-semibold">{plan.name}</h3>
      <p className="mt-1 text-sm text-white/75">{plan.summary}</p>
      <p className="mt-2 text-xl font-bold text-neon">{plan.priceLabel}</p>

      <h4 className="mt-4 text-sm font-semibold text-white">Dahil:</h4>
      <ul className="mt-2 space-y-1 text-sm text-white/80">
        {plan.includes.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>

      <h4 className="mt-4 text-sm font-semibold text-white">Dahil Değil:</h4>
      <ul className="mt-2 space-y-1 text-sm text-white/70">
        {plan.excludes.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={isLoading}
        className="mt-6 rounded-lg border border-neon/50 px-4 py-2 text-sm font-medium text-neon transition hover:border-neon disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Yönlendiriliyor...' : 'Shopier ile öde'}
      </button>

      <ul className="mt-3 space-y-1 text-xs text-white/60">
        {plan.warnings.map((warning) => (
          <li key={warning}>• {warning}</li>
        ))}
      </ul>
    </article>
  );
}
