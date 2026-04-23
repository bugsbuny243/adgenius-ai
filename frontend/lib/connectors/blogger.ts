import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull } from '@/lib/workspace';
import type { ConnectorAdapter, ConnectorStatus } from '@/lib/connectors/types';

async function getBloggerStatus(): Promise<ConnectorStatus> {
  const workspace = await getWorkspaceContextOrNull();
  if (!workspace) {
    return {
      platform: 'blogger',
      state: 'not_connected',
      label: 'Bağlantı bulunamadı',
      connectedAt: null,
      scopes: []
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('oauth_connections')
    .select('provider_account_id, scopes, metadata, created_at, updated_at, status')
    .eq('workspace_id', workspace.workspaceId)
    .eq('user_id', workspace.userId)
    .eq('provider', 'google')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const metadata = data?.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
    ? (data.metadata as Record<string, unknown>)
    : {};
  const profile = metadata.googleProfile && typeof metadata.googleProfile === 'object'
    ? (metadata.googleProfile as Record<string, unknown>)
    : {};
  const scopes = Array.isArray(data?.scopes) ? data.scopes.filter((scope): scope is string => typeof scope === 'string') : [];
  const blogId = typeof metadata.bloggerBlogId === 'string' ? metadata.bloggerBlogId : null;
  const accountLabel = typeof profile.email === 'string' ? profile.email : typeof profile.name === 'string' ? profile.name : null;

  if (!data || data.status !== 'active') {
    return {
      platform: 'blogger',
      state: 'not_connected',
      label: 'Bağlanmadı',
      connectedAt: null,
      blogId,
      scopes
    };
  }

  return {
    platform: 'blogger',
    state: 'connected',
    label: 'Bağlı',
    connectedAt: data.created_at ?? null,
    lastSyncedAt: data.updated_at ?? null,
    accountLabel,
    providerAccountId: data.provider_account_id ?? null,
    blogId,
    scopes
  };
}

export const bloggerConnector: ConnectorAdapter = {
  getStatus: getBloggerStatus,
  async validateConfig() {
    return { valid: true, missingKeys: [] };
  },
  async createDraft() {
    return { draftId: `blogger-draft-${Date.now()}`, status: 'draft' };
  },
  async publish() {
    return { publishId: `blogger-publish-${Date.now()}`, status: 'queued' };
  },
  async getAnalytics() {
    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }
};
