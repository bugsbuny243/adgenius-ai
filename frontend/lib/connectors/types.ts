export type ConnectorPlatform = 'youtube' | 'instagram' | 'tiktok';

export type ConnectorStatus = {
  platform: ConnectorPlatform;
  state: 'not_connected' | 'coming_soon' | 'connected';
  label: string;
  connectedAt: string | null;
};

export type ConnectorValidation = {
  valid: boolean;
  missingKeys: string[];
};

export type ConnectorDraftInput = {
  workspaceId: string;
  projectId: string | null;
  content: string;
  title?: string;
};

export type ConnectorPublishInput = {
  draftId: string;
  scheduledAt: string | null;
};

export type ConnectorAnalytics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

export type ConnectorAdapter = {
  getStatus: () => Promise<ConnectorStatus>;
  validateConfig: () => Promise<ConnectorValidation>;
  createDraft: (input: ConnectorDraftInput) => Promise<{ draftId: string; status: 'draft' }>;
  publish: (input: ConnectorPublishInput) => Promise<{ publishId: string; status: 'queued' | 'published' }>;
  getAnalytics: (publishId: string) => Promise<ConnectorAnalytics>;
};
