import { NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export async function POST(request: Request) {
  await requirePlatformOwner();

  const body = await request.json().catch(() => null);
  const purchaseId = typeof body?.purchaseId === 'string' ? body.purchaseId.trim() : '';

  if (!purchaseId) {
    return NextResponse.json({ error: 'purchaseId zorunludur.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from('package_purchases')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', purchaseId)
    .eq('status', 'pending')
    .select('id,status,approved_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, purchase: data });
}
