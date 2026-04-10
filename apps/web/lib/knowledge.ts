import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_CHUNK_SIZE = 1200;

function chunkText(rawText: string, chunkSize: number = DEFAULT_CHUNK_SIZE) {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    const content = normalized.slice(i, i + chunkSize).trim();
    if (content) chunks.push(content);
  }

  return chunks;
}

export async function createKnowledgeSource(params: {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string;
  projectId?: string | null;
  sourceType: 'file' | 'text' | 'url' | 'brief';
  title: string;
  rawText?: string | null;
  filePath?: string | null;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, workspaceId, userId, projectId = null, sourceType, title, rawText = null, filePath = null, sourceUrl = null, metadata = {} } =
    params;

  const { data: source, error: sourceError } = await supabase
    .from('knowledge_sources')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      user_id: userId,
      source_type: sourceType,
      title,
      raw_text: rawText,
      file_path: filePath,
      source_url: sourceUrl,
      status: rawText?.trim() ? 'ready' : 'draft',
      metadata
    })
    .select('id')
    .single();

  if (sourceError || !source) {
    throw new Error(sourceError?.message ?? 'Failed to create source');
  }

  const chunks = rawText ? chunkText(rawText) : [];

  if (chunks.length > 0) {
    const { error: chunkError } = await supabase.from('knowledge_chunks').insert(
      chunks.map((content, index) => ({
        workspace_id: workspaceId,
        project_id: projectId,
        source_id: source.id,
        chunk_index: index,
        content,
        token_estimate: Math.ceil(content.length / 4),
        metadata: { strategy: 'char-split-v1' }
      }))
    );

    if (chunkError) {
      throw new Error(chunkError.message);
    }
  }

  return { sourceId: source.id, chunkCount: chunks.length };
}
