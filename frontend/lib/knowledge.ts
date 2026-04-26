import type { SupabaseClient } from '@supabase/supabase-js';

export async function createKnowledgeSource(_params: {
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
  throw new Error('Knowledge source kayıtları bu sürümde devre dışı bırakıldı.');
}
