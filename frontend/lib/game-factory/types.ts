export const GAME_PROJECT_STATUSES = [
  'draft',
  'planned',
  'queued',
  'building',
  'build_succeeded',
  'build_failed',
  'ready_for_review',
  'approved',
  'rejected'
] as const;

export type GameProjectStatus = (typeof GAME_PROJECT_STATUSES)[number];
export type UnityGameProjectStatus =
  | 'draft'
  | 'planned'
  | 'queued'
  | 'building'
  | 'build_succeeded'
  | 'build_failed'
  | 'ready_for_review'
  | 'approved'
  | 'rejected';

export const UNITY_GAME_PROJECT_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type UnityGameProjectApprovalStatus = 'pending' | 'approved' | 'rejected';

export const UNITY_TARGET_PLATFORMS = ['android'] as const;
export type UnityTargetPlatform = 'android';

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
