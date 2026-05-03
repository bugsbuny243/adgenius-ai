export type UnityGameTemplate = {
  slug: string;
  title: string;
  genre: 'runner' | 'quiz' | 'puzzle' | 'idle' | 'platformer' | '3d-puzzle' | '3d-platformer' | '3d-action';
  description: string;
  unityVersion: string;
  supportedPlatforms: Array<'android' | 'webgl'>;
  complexity: 'low' | 'medium' | 'high';
  metadata: Record<string, unknown>;
};

export type UnityGameProjectDraft = {
  appName: string;
  packageName: string;
  userPrompt: string;
  targetPlatform: 'android' | 'webgl';
  templateSlug: string;
};

export type UnityBuildJob = {
  unityGameProjectId: string;
  appName: string;
  packageName: string;
  templateSlug: string;
  targetPlatform: 'android' | 'webgl';
  buildType: 'development' | 'release';
  gameBrief: Record<string, unknown>;
  requestedOutput: 'apk' | 'aab' | 'webgl-build';
};

export const UNITY_TEMPLATE_SEEDS: UnityGameTemplate[] = [
  {
    slug: 'runner_2d_mobile',
    title: '2D Endless Runner',
    genre: 'runner',
    description: 'Fast arcade-style runner with lane switching and distance progression.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android', 'webgl'],
    complexity: 'low',
    metadata: { dimension: '2d', targetAudience: 'casual', features: ['lane-switching', 'distance-tracking'] }
  },
  {
    slug: 'puzzle_match_mobile',
    title: 'Match-3 Puzzle',
    genre: 'puzzle',
    description: 'Engaging tile-matching puzzle game with combos and power-ups.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android', 'webgl'],
    complexity: 'low',
    metadata: { dimension: '2d', targetAudience: 'casual', features: ['match-3', 'combos', 'power-ups'] }
  },
  {
    slug: 'idle_clicker_mobile',
    title: 'Idle Clicker',
    genre: 'idle',
    description: 'Incremental idle game with passive income and upgrades.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android', 'webgl'],
    complexity: 'low',
    metadata: { dimension: '2d', targetAudience: 'casual', features: ['passive-income', 'upgrades', 'prestige'] }
  },
  {
    slug: 'quiz_trivia_mobile',
    title: 'Quiz Trivia Game',
    genre: 'quiz',
    description: 'Educational trivia game with multiple-choice questions and leaderboards.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android', 'webgl'],
    complexity: 'low',
    metadata: { dimension: '2d', targetAudience: 'casual', features: ['questions', 'scoring', 'leaderboard'] }
  },
  {
    slug: 'platformer_2d_adventure',
    title: '2D Platformer Adventure',
    genre: 'platformer',
    description: 'Classic 2D platformer with enemies, obstacles, and multi-level progression.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android', 'webgl'],
    complexity: 'medium',
    metadata: { dimension: '2d', targetAudience: 'action', features: ['enemies', 'obstacles', 'multi-level'], levels: 'multi-scene' }
  },
  {
    slug: '3d_puzzle_explorer',
    title: '3D Puzzle Explorer',
    genre: '3d-puzzle',
    description: 'Immersive 3D puzzle game with interactive environments and physics-based solutions.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android'],
    complexity: 'high',
    metadata: { dimension: '3d', graphics: 'advanced', physics: true, targetAudience: 'hardcore', features: ['3d-objects', 'physics', 'puzzles'] }
  },
  {
    slug: '3d_platformer_quest',
    title: '3D Platformer Quest',
    genre: '3d-platformer',
    description: 'Dynamic 3D platformer with precise jumping mechanics and environmental challenges.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android'],
    complexity: 'high',
    metadata: { dimension: '3d', graphics: 'advanced', cameraControl: 'dynamic', targetAudience: 'hardcore', features: ['3d-movement', 'camera', 'challenges'] }
  },
  {
    slug: '3d_action_arcade',
    title: '3D Action Arcade',
    genre: '3d-action',
    description: 'Fast-paced 3D action game with real-time combat and enemy AI.',
    unityVersion: '2022.3 LTS',
    supportedPlatforms: ['android'],
    complexity: 'high',
    metadata: { dimension: '3d', graphics: 'advanced', ai: true, combat: true, targetAudience: 'hardcore', features: ['combat', 'ai', 'real-time'] }
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
  const lowerPrompt = prompt.toLowerCase();

  // Smart template selection based on keywords
  const keywords: Array<[string[], string]> = [
    [['3d', 'three-d', '3dimension', 'three dimension'], '3d-action'],
    [['puzzle', 'match', 'solve'], 'puzzle_match_mobile'],
    [['runner', 'endless', 'fast'], 'runner_2d_mobile'],
    [['idle', 'clicker', 'incremental', 'click'], 'idle_clicker_mobile'],
    [['quiz', 'trivia', 'question', 'educational'], 'quiz_trivia_mobile'],
    [['platformer', 'jump', 'platform', 'adventure'], 'platformer_2d_adventure'],
  ];

  for (const [words, genre] of keywords) {
    if (words.some(word => lowerPrompt.includes(word))) {
      const template = UNITY_TEMPLATE_SEEDS.find(t => t.slug === genre);
      if (template) return template;
    }
  }

  // Default to runner if no match
  return UNITY_TEMPLATE_SEEDS[0];
}

export function createUnityGameBriefFromPrompt(prompt: string): Record<string, unknown> {
  const template = selectUnityTemplateForPrompt(prompt);
  return {
    sourcePrompt: prompt,
    templateSlug: template.slug,
    targetPlatform: 'android',
    detectedGenre: template.genre,
    dimension: template.metadata?.dimension ?? '2d'
  };
}

export function createUnityBuildJobPayload(input: {
  unityGameProjectId: string;
  appName: string;
  packageName: string;
  userPrompt: string;
  buildType?: 'development' | 'release';
  requestedOutput?: 'apk' | 'aab' | 'webgl-build';
  targetPlatform?: 'android' | 'webgl';
}): UnityBuildJob {
  const template = selectUnityTemplateForPrompt(input.userPrompt);
  const targetPlatform = (input.targetPlatform ?? 'android') as 'android' | 'webgl';
  const requestedOutput = input.requestedOutput ?? (targetPlatform === 'webgl' ? 'webgl-build' : 'aab');

  return {
    unityGameProjectId: input.unityGameProjectId,
    appName: input.appName,
    packageName: input.packageName,
    templateSlug: template.slug,
    targetPlatform,
    buildType: input.buildType ?? 'development',
    gameBrief: createUnityGameBriefFromPrompt(input.userPrompt),
    requestedOutput: requestedOutput as 'apk' | 'aab' | 'webgl-build'
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
  if (!input.targetPlatform) errors.push('Target platform is required.');
  return { ok: errors.length === 0, errors };
                                                    }
