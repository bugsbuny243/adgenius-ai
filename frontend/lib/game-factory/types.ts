export const GAME_PROJECT_STATUSES = [
  'draft',
  'generating',
  'generated',
  'committing',
  'ready_for_build',
  'building',
  'build_succeeded',
  'build_failed',
  'release_preparing',
  'release_ready',
  'publishing',
  'published',
  'publish_failed',
  'archived'
] as const;

export type GameProjectStatus = (typeof GAME_PROJECT_STATUSES)[number];

export const GAME_BUILD_STATUSES = ['queued', 'triggered', 'building', 'succeeded', 'failed', 'canceled'] as const;
export type GameBuildStatus = (typeof GAME_BUILD_STATUSES)[number];

export const GAME_RELEASE_STATUSES = [
  'draft',
  'awaiting_user_approval',
  'preparing',
  'uploading',
  'uploaded',
  'committing',
  'published',
  'failed',
  'blocked_by_platform_requirement'
] as const;

export type GameReleaseStatus = (typeof GAME_RELEASE_STATUSES)[number];

export type BuildTriggerResult = {
  externalBuildId: string | null;
  status: GameBuildStatus;
  message?: string;
};

export type BuildStatusResult = {
  status: GameBuildStatus;
  logsUrl?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
};

export type ArtifactResult = {
  artifactType: 'aab' | 'apk' | 'build_report' | 'logs';
  fileName?: string;
  fileUrl?: string;
  fileSizeBytes?: number;
};
