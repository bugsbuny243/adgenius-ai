import type { ConnectorAdapter } from '@/lib/connectors/types';

export const youtubeConnector: ConnectorAdapter = {
  async getStatus() {
    return {
      platform: 'youtube',
      state: 'coming_soon',
      label: 'Coming soon',
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
      draftId: `yt-draft-${Date.now()}`,
      status: 'draft'
    };
  },
  async publish() {
    return {
      publishId: `yt-publish-${Date.now()}`,
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
