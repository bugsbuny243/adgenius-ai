import { NextResponse } from 'next/server';
import { assertOwnerAccessOrThrow } from '@/lib/owner-access';

const VALID_STATUSES = ['pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'];

export async function POST(request: Request) {
  const context = await assertOwnerAccessOrThrow();
  const payload = (await request.json()) as {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    notes?: string;
  };

  if (!payload.reference || typeof payload.amount !== 'number' || payload.amount <= 0) {
    return NextResponse.json({ ok: false, error: 'reference_and_positive_amount_required' }, { status: 400 });
  }

  const status = VALID_STATUSES.includes(payload.status ?? '') ? (payload.status as string) : 'pending';

  const { data: payment, error: paymentError } = await context.supabase
    .from('payments')
    .insert({
      workspace_id: context.workspaceId,
      reference: payload.reference.trim(),
      amount: payload.amount,
      currency: (payload.currency || 'USD').toUpperCase(),
      status,
      notes: payload.notes?.trim() || null,
      updated_by: context.userId
    })
    .select('id')
    .single();

  if (paymentError || !payment?.id) {
    return NextResponse.json({ ok: false, error: paymentError?.message ?? 'payment_insert_failed' }, { status: 400 });
  }

  await context.supabase.from('transactions').insert({
    workspace_id: context.workspaceId,
    payment_id: payment.id,
    transaction_type: 'manual_entry',
    status,
    amount: payload.amount,
    currency: (payload.currency || 'USD').toUpperCase(),
    actor_user_id: context.userId
  });

  await context.supabase.from('billing_events').insert({
    workspace_id: context.workspaceId,
    payment_id: payment.id,
    event_type: 'payment_created',
    actor_user_id: context.userId,
    payload: { status, source: 'owner_panel' }
  });

  return NextResponse.json({ ok: true, paymentId: payment.id });
}

export async function PATCH(request: Request) {
  const context = await assertOwnerAccessOrThrow();
  const payload = (await request.json()) as { payment_id?: string; status?: string; notes?: string };

  if (!payload.payment_id || !VALID_STATUSES.includes(payload.status ?? '')) {
    return NextResponse.json({ ok: false, error: 'payment_id_and_valid_status_required' }, { status: 400 });
  }

  const { error: updateError } = await context.supabase
    .from('payments')
    .update({
      status: payload.status,
      notes: payload.notes?.trim() || null,
      updated_by: context.userId,
      updated_at: new Date().toISOString()
    })
    .eq('workspace_id', context.workspaceId)
    .eq('id', payload.payment_id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  }

  await context.supabase.from('billing_events').insert({
    workspace_id: context.workspaceId,
    payment_id: payload.payment_id,
    event_type: 'payment_status_updated',
    actor_user_id: context.userId,
    payload: { status: payload.status, source: 'owner_panel' }
  });

  return NextResponse.json({ ok: true });
}
