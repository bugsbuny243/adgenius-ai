export type UnityBuildStatus = 'queued' | 'claimed' | 'running' | 'succeeded' | 'failed' | 'cancelled';

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

export type UnityApprovalStatus = 'pending' | 'approved' | 'rejected';

export type UnityGameTemplate = {
  slug: string;
  title: string;
  genre: 'runner' | 'quiz' | 'puzzle' | 'idle' | 'platformer';
  description: string;
  unityVersion: string;
  supportedPlatforms: Array<'android'>;
  complexity: 'low' | 'medium' | 'high';
  metadata: Record<string, unknown>;
};

export type UnityGameProjectDraft = {
  appName: string;
  packageName: string;
  userPrompt: string;
  targetPlatform: 'android';
  templateSlug: string;
};

export type UnityBuildJob = {
  unityGameProjectId: string;
  appName: string;
  packageName: string;
  templateSlug: string;
  targetPlatform: 'android';
  buildType: 'development' | 'release';
  gameBrief: Record<string, unknown>;
  requestedOutput: 'apk' | 'aab';
};

export const UNITY_TEMPLATE_SEEDS: UnityGameTemplate[] = [
  {
    slug: 'runner_2d_mobile',
    title: '2D Endless Runner',
    genre: 'runner',
    description: 'Fast arcade-style runner with lane switching and distance progression.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android'],
    complexity: 'low',
    metadata: { camera: 'side', sessionLengthMinutes: 3 }
  },
  {
    slug: 'quiz_mobile',
    title: 'Mobile Quiz Challenge',
    genre: 'quiz',
    description: 'Prompt-driven quiz shell with categories, scoring, and streak bonuses.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android'],
    complexity: 'low',
    metadata: { rounds: 10, supportsLocalization: true }
  },
  {
    slug: 'idle_clicker_mobile',
    title: 'Idle Clicker Tycoon',
    genre: 'idle',
    description: 'Idle and tap progression loop with upgrade systems and balancing hooks.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android'],
    complexity: 'medium',
    metadata: { offlineProgress: true, economyLayers: 2 }
  },
  {
    slug: 'puzzle_match_mobile',
    title: 'Puzzle Match Mobile',
    genre: 'puzzle',
    description: 'Grid puzzle gameplay with combo scoring and level-based challenge curves.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android'],
    complexity: 'medium',
    metadata: { boardSize: '8x8', moveLimitMode: true }
  },
  {
    slug: 'platformer_2d_mobile',
    title: '2D Platformer Mobile',
    genre: 'platformer',
    description: 'Touch-friendly platformer framework with checkpoints and stage progression.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android'],
    complexity: 'medium',
    metadata: { controls: 'touch', checkpointSystem: true }
  }
];

export const UNITY_BUILD_STATUS_LABELS: Record<UnityBuildStatus, string> = {
  queued: 'Queued',
  claimed: 'Claimed by worker',
  running: 'Running build',
  succeeded: 'Build succeeded',
  failed: 'Build failed',
  cancelled: 'Cancelled'
};

export const UNITY_PROJECT_STATUS_LABELS: Record<UnityGameProjectStatus, string> = {
  draft: 'Draft',
  planned: 'Planned',
  queued: 'Queued',
  building: 'Building',
  build_succeeded: 'Build succeeded',
  build_failed: 'Build failed',
  ready_for_review: 'Ready for review',
  approved: 'Approved',
  rejected: 'Rejected'
};

const PROMPT_GENRE_MAP: Array<{ genre: UnityGameTemplate['genre']; keywords: string[] }> = [
  { genre: 'runner', keywords: ['runner', 'endless run', 'running game'] },
  { genre: 'quiz', keywords: ['quiz', 'trivia', 'question'] },
  { genre: 'puzzle', keywords: ['puzzle', 'match', 'logic'] },
  { genre: 'idle', keywords: ['idle', 'clicker', 'incremental'] },
  { genre: 'platformer', keywords: ['platformer', 'jump', 'side scroller'] }
];

export function normalizePackageName(appName: string): string {
  const normalizedGame = appName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join('_')
    .replace(/_+/g, '_') || 'game';

  return `com.koschei.generated.${normalizedGame}`;
}

export function createUnityGameBriefFromPrompt(prompt: string): Record<string, unknown> {
  const template = selectUnityTemplateForPrompt(prompt);
  const cleanPrompt = prompt.trim();

  return {
    planningOnly: true,
    sourcePrompt: cleanPrompt,
    detectedGenre: template.genre,
    templateSlug: template.slug,
    suggestedCoreLoop: `${template.genre} gameplay loop with mobile-first controls`,
    targetPlatform: 'android',
    notes: 'Mock planning brief only. No Unity execution performed in Next.js.'
  };
}

export function selectUnityTemplateForPrompt(prompt: string): UnityGameTemplate {
  const normalized = prompt.toLowerCase();
  const detectedGenre = PROMPT_GENRE_MAP.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)))?.genre;

  if (!detectedGenre) {
    return UNITY_TEMPLATE_SEEDS[0];
  }

  return UNITY_TEMPLATE_SEEDS.find((template) => template.genre === detectedGenre) ?? UNITY_TEMPLATE_SEEDS[0];
}

export function createMockUnityBuildJobPayload(input: {
  unityGameProjectId: string;
  appName: string;
  packageName: string;
  userPrompt: string;
  buildType?: 'development' | 'release';
  requestedOutput?: 'apk' | 'aab';
}): UnityBuildJob {
  const template = selectUnityTemplateForPrompt(input.userPrompt);

  return {
    unityGameProjectId: input.unityGameProjectId,
    appName: input.appName,
    packageName: input.packageName,
    templateSlug: template.slug,
    targetPlatform: 'android',
    buildType: input.buildType ?? 'development',
    gameBrief: createUnityGameBriefFromPrompt(input.userPrompt),
    requestedOutput: input.requestedOutput ?? 'aab'
  };
}

export function validateUnityGameProjectDraft(input: Partial<UnityGameProjectDraft>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.appName?.trim()) {
    errors.push('App name is required.');
  }

  if (!input.userPrompt?.trim()) {
    errors.push('Prompt is required.');
  }

  if (!input.packageName?.trim()) {
    errors.push('Package name is required.');
  } else if (!/^com\.[a-z0-9_]+(?:\.[a-z0-9_]+)+$/.test(input.packageName)) {
    errors.push('Package name must follow reverse-domain style (e.g. com.koschei.generated.my_game).');
  }

  if (input.targetPlatform && input.targetPlatform !== 'android') {
    errors.push('Only android target platform is supported in this planning layer.');
  }

  if (input.templateSlug && !UNITY_TEMPLATE_SEEDS.some((template) => template.slug === input.templateSlug)) {
    errors.push('Template slug is not recognized.');
  }

  return { ok: errors.length === 0, errors };
}
