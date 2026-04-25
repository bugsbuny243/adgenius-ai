import type { ConnectorAdapter } from '@/lib/connectors/types';

export const tiktokConnector: ConnectorAdapter = {
  async getStatus() {
    return {
      platform: 'tiktok',
      state: 'not_connected',
      label: 'Bağlantı gerekli',
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
      draftId: `tt-draft-${Date.now()}`,
      status: 'draft'
    };
  },
  async publish() {
    return {
      publishId: `tt-publish-${Date.now()}`,
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
