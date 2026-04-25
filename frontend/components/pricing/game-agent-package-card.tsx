'use client';

import { useState } from 'react';
import type { GameAgentPackage } from '@/lib/game-agent-pricing';

type Props = {
  plan: GameAgentPackage;
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
      <p className="text-xs uppercase tracking-wide text-lilac">Game Factory Paketi</p>
      <h3 className="mt-1 text-2xl font-semibold">{plan.name}</h3>
      <p className="mt-2 text-xl font-bold text-neon">{plan.price}</p>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        {plan.features.map((feature) => (
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
      <p className="mt-3 text-xs text-white/60">Paket aktivasyonu, ödeme doğrulaması veya admin onayı sonrası yapılır.</p>
    </article>
  );
}
