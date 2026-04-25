import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { GAME_AGENT_PACKAGE_MAP, type GameAgentPlanKey } from '@/lib/game-agent-pricing';

type CheckoutPayload = {
  planKey?: GameAgentPlanKey;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as CheckoutPayload;
  const plan = payload.planKey ? GAME_AGENT_PACKAGE_MAP[payload.planKey] : null;

  if (!plan) {
    return NextResponse.json({ ok: false, error: 'invalid_plan_key' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from('payment_orders').insert({
      user_id: user.id,
      plan_key: plan.planKey,
      provider: 'shopier',
      currency: 'TRY',
      amount: plan.amountTry,
      status: 'pending',
      checkout_url: plan.shopierUrl,
      metadata: {
        package_name: plan.name,
        source: 'pricing_page',
        product_scope: 'game_agent'
      }
    });
  }

  return NextResponse.json({ ok: true, checkoutUrl: plan.shopierUrl });
}
