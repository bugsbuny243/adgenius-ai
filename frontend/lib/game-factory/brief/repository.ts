import type { SupabaseClient } from '@supabase/supabase-js';

export async function saveGeneratedBrief(supabase: SupabaseClient, projectId: string, workspaceId: string, payload: Record<string, unknown>) {
  return supabase
    .from('unity_game_projects')
    .update({
      app_name: payload.title,
      package_name: payload.packageName,
      game_type: payload.gameType,
      metadata: payload,
      status: 'draft'
    })
    .eq('id', projectId)
    .eq('workspace_id', workspaceId);
}
