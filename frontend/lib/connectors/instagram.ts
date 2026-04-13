import type { ConnectorAdapter } from '@/lib/connectors/types';

export const instagramConnector: ConnectorAdapter = {
  async getStatus() {
    return {
      platform: 'instagram',
      state: 'not_connected',
      label: 'Not connected',
      connectedAt: null
    };
  },
  async validateConfig() {
    return {
      valid: true,
      missingKeys: []
    };
  },
  async createDraft() {
    return {
      draftId: `ig-draft-${Date.now()}`,
      status: 'draft'
    };
  },
  async publish() {
    return {
      publishId: `ig-publish-${Date.now()}`,
      status: 'queued'
    };
  },
  async getAnalytics() {
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
};
