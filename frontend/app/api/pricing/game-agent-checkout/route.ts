import { NextResponse } from 'next/server';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { GAME_AGENT_PLAN_MAP, type GameAgentPlanKey } from '@/lib/game-agent-plans';

type CheckoutPayload = {
  planKey?: GameAgentPlanKey;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as CheckoutPayload;
  const plan = payload.planKey ? GAME_AGENT_PLAN_MAP[payload.planKey] : null;

  if (!plan) {
    return NextResponse.json({ ok: false, error: 'invalid_plan_key' }, { status: 400 });
  }

  const supabase = await createSupabaseActionServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from('payment_orders').insert({
      user_id: user.id,
      plan_key: plan.planKey,
      provider: 'shopier',
      currency: plan.currency,
      amount: plan.amountTry,
      status: 'pending',
      checkout_url: plan.shopierUrl,
      metadata: {
        package_name: plan.name,
        package_price_label: plan.priceLabel,
        source: 'pricing_page',
        product_scope: 'game_agent',
        entitlement_tier: plan.planKey,
        requires_owner_approval: true
      }
    });
  }

  return NextResponse.json({ ok: true, checkoutUrl: plan.shopierUrl });
}
