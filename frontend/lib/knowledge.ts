import type { SupabaseClient } from '@supabase/supabase-js';

export async function createKnowledgeSource(params: {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string;
  projectId?: string | null;
  sourceType: 'file' | 'text' | 'url' | 'brief';
  title: string;
  rawText?: string | null;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, workspaceId, userId, projectId = null, sourceType, title, rawText = null, sourceUrl = null, metadata = {} } = params;

  const content = [
    rawText?.trim() || null,
    sourceUrl?.trim() ? `URL: ${sourceUrl.trim()}` : null,
    `source_type: ${sourceType}`,
    Object.keys(metadata).length > 0 ? `metadata: ${JSON.stringify(metadata)}` : null
  ]
    .filter(Boolean)
    .join('\n');

  const { data: entry, error } = await supabase
    .from('project_knowledge_entries')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      source_id: null,
      entry_type: 'source',
      title,
      content,
      metadata,
      created_by: userId
    })
    .select('id')
    .single();

  if (error || !entry) {
    throw new Error(error?.message ?? 'Failed to create knowledge entry');
  }

  return { sourceId: entry.id, chunkCount: 0 };
}
