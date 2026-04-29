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
    metadata: {}
  }
];

export function normalizePackageName(appName: string): string {
  const slug =
    appName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .join('') || 'game';
  return `com.koschei.generated.${slug}`;
}

export function selectUnityTemplateForPrompt(prompt: string): UnityGameTemplate {
  void prompt;
  return UNITY_TEMPLATE_SEEDS[0];
}

export function createUnityGameBriefFromPrompt(prompt: string): Record<string, unknown> {
  return {
    sourcePrompt: prompt,
    templateSlug: UNITY_TEMPLATE_SEEDS[0].slug,
    targetPlatform: 'android'
  };
}

export function createUnityBuildJobPayload(input: {
  unityGameProjectId: string;
  appName: string;
  packageName: string;
  userPrompt: string;
  buildType?: 'development' | 'release';
  requestedOutput?: 'apk' | 'aab';
}): UnityBuildJob {
  return {
    unityGameProjectId: input.unityGameProjectId,
    appName: input.appName,
    packageName: input.packageName,
    templateSlug: UNITY_TEMPLATE_SEEDS[0].slug,
    targetPlatform: 'android',
    buildType: input.buildType ?? 'development',
    gameBrief: createUnityGameBriefFromPrompt(input.userPrompt),
    requestedOutput: input.requestedOutput ?? 'aab'
  };
}

export function validateUnityGameProjectDraft(input: Partial<UnityGameProjectDraft>): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.appName?.trim()) errors.push('App name is required.');
  if (!input.userPrompt?.trim()) errors.push('Prompt is required.');
  if (!input.packageName?.trim()) errors.push('Package name is required.');
  return { ok: errors.length === 0, errors };
}
