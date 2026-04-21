import { NextResponse } from 'next/server';
import { assertOwnerAccessOrThrow } from '@/lib/owner-access';

export async function POST(request: Request) {
  const context = await assertOwnerAccessOrThrow();
  const payload = (await request.json()) as {
    slot_name?: string;
    page_path?: string;
    position?: string;
    status?: string;
    internal_section?: string;
    notes?: string;
    config_metadata?: string;
  };

  if (!payload.slot_name || !payload.page_path || !payload.position) {
    return NextResponse.json({ ok: false, error: 'slot_name_page_path_position_required' }, { status: 400 });
  }

  const normalizedStatus = ['draft', 'active', 'paused'].includes(payload.status ?? '') ? payload.status ?? 'draft' : 'draft';

  const { data: placement, error: placementError } = await context.supabase
    .from('ad_placements')
    .insert({
      workspace_id: context.workspaceId,
      slot_name: payload.slot_name.trim(),
      page_path: payload.page_path.trim(),
      position: payload.position.trim(),
      internal_section: payload.internal_section?.trim() || null,
      status: normalizedStatus,
      notes: payload.notes?.trim() || null
    })
    .select('id')
    .single();

  if (placementError || !placement?.id) {
    return NextResponse.json({ ok: false, error: placementError?.message ?? 'ad_placement_insert_failed' }, { status: 400 });
  }

  const { error: configError } = await context.supabase.from('ad_slot_configs').insert({
    workspace_id: context.workspaceId,
    ad_placement_id: placement.id,
    provider: 'adsense',
    config_metadata: payload.config_metadata?.trim() || null,
    is_active: normalizedStatus === 'active'
  });

  if (configError) {
    return NextResponse.json({ ok: false, error: configError.message }, { status: 400 });
  }

  await context.supabase.from('ad_events').insert({
    workspace_id: context.workspaceId,
    ad_placement_id: placement.id,
    event_type: 'created',
    actor_user_id: context.userId,
    payload: {
      status: normalizedStatus,
      source: 'owner_panel'
    }
  });

  return NextResponse.json({ ok: true, placementId: placement.id });
}
