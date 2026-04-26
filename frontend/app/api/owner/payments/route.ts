import { NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

const VALID_STATUSES = ['approved', 'rejected', 'cancelled'] as const;

export async function PATCH(request: Request) {
  const owner = await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();

  const payload = (await request.json()) as { orderId?: string; status?: string; note?: string };
  const orderId = payload.orderId?.trim();

  if (!orderId || !VALID_STATUSES.includes((payload.status ?? '') as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json({ ok: false, error: 'order_id_and_valid_status_required' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from('payment_orders')
    .select('id, user_id, plan_key, amount, currency, status, metadata')
    .eq('id', orderId)
    .eq('provider', 'shopier')
    .maybeSingle();

  if (orderError || !order) {
    return NextResponse.json({ ok: false, error: orderError?.message ?? 'payment_order_not_found' }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const note = payload.note?.trim() || null;

  const nextMetadata = {
    ...(typeof order.metadata === 'object' && order.metadata ? order.metadata : {}),
    owner_note: note,
    owner_status_updated_at: nowIso
  };

  const { error: updateError } = await supabase
    .from('payment_orders')
    .update({
      status: payload.status,
      approved_at: payload.status === 'approved' ? nowIso : null,
      approved_by: payload.status === 'approved' ? owner.id : null,
      metadata: nextMetadata
    })
    .eq('id', orderId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  }

  if (payload.status === 'approved') {
    const [{ data: member }, { data: existingSubscription }] = await Promise.all([
      supabase.from('workspace_members').select('workspace_id').eq('user_id', order.user_id).order('created_at', { ascending: true }).limit(1).maybeSingle(),
      supabase.from('subscriptions').select('id').eq('user_id', order.user_id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    ]);

    const workspaceId = member?.workspace_id ?? null;

    if (workspaceId) {
      if (existingSubscription?.id) {
        await supabase
          .from('subscriptions')
          .update({ status: 'active', plan_name: order.plan_key, updated_at: nowIso })
          .eq('id', existingSubscription.id);
      } else {
        await supabase.from('subscriptions').insert({
          workspace_id: workspaceId,
          user_id: order.user_id,
          plan_name: order.plan_key,
          status: 'active'
        });
      }

      const { data: payment } = await supabase
        .from('payments')
        .insert({
          workspace_id: workspaceId,
          reference: `shopier:${order.id}`,
          amount: order.amount,
          currency: order.currency,
          status: 'paid',
          notes: note,
          updated_by: owner.id
        })
        .select('id')
        .maybeSingle();

      await supabase.from('transactions').insert({
        workspace_id: workspaceId,
        payment_id: payment?.id ?? null,
        transaction_type: 'manual_approval',
        status: 'approved',
        amount: order.amount,
        currency: order.currency,
        actor_user_id: owner.id
      });

      await supabase.from('billing_events').insert({
        workspace_id: workspaceId,
        payment_id: payment?.id ?? null,
        event_type: 'shopier_payment_order_approved',
        actor_user_id: owner.id,
        payload: { orderId: order.id, planKey: order.plan_key, provider: 'shopier', note }
      });
    }
  } else {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', order.user_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (member?.workspace_id) {
      await supabase.from('billing_events').insert({
        workspace_id: member.workspace_id,
        event_type: 'shopier_payment_order_rejected',
        actor_user_id: owner.id,
        payload: { orderId: order.id, status: payload.status, provider: 'shopier', note }
      });
    }
  }

  return NextResponse.json({ ok: true });
}
