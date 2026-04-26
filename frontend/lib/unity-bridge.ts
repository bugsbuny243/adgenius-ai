const UNITY_BASE_URL = 'https://build-api.cloud.unity3d.com/api/v1';
const UNITY_AUTH_MODE = 'basic_service_account';

export type UnityBuildStatus =
  | 'queued'
  | 'sentToBuilder'
  | 'started'
  | 'restarted'
  | 'success'
  | 'failure'
  | 'canceled'
  | 'unknown';

export interface UnityBuildResponse {
  build: number;
  buildTargetId: string;
  status: UnityBuildStatus;
  created: string;
  links?: { download_primary?: { href: string } };
}

export interface UnityBuildTarget {
  buildtargetid: string;
  name?: string;
  platform?: string;
  [key: string]: unknown;
}

type UnityBuildRaw = {
  build?: number;
  buildtargetid?: string;
  status?: string;
  created?: string;
  finished?: string;
  links?: { download_primary?: { href?: string } };
};

export class UnityApiError extends Error {
  status?: number;
  endpointPath?: string;
  authMode: string;

  constructor(message: string, options?: { status?: number; endpointPath?: string; authMode?: string }) {
    super(message);
    this.name = 'UnityApiError';
    this.status = options?.status;
    this.endpointPath = options?.endpointPath;
    this.authMode = options?.authMode ?? UNITY_AUTH_MODE;
  }
}

function getConfig() {
  const orgId = process.env.UNITY_ORG_ID?.trim();
  const projectId = process.env.UNITY_PROJECT_ID?.trim();
  const keyId = process.env.UNITY_SERVICE_ACCOUNT_KEY_ID?.trim();
  const secretKey = process.env.UNITY_SERVICE_ACCOUNT_SECRET?.trim() || process.env.UNITY_SERVICE_ACCOUNT_SECRET_KEY?.trim();

  if (!orgId || !projectId || !keyId || !secretKey) {
    throw new Error('Unity build ayarları eksik. UNITY_ORG_ID, UNITY_PROJECT_ID ve servis anahtarlarını kontrol edin.');
  }

  const raw = `${keyId}:${secretKey}`;
  const encoded = Buffer.from(raw, 'utf8').toString('base64');
  const authorization = `Basic ${encoded}`;

  return { orgId, projectId, authorization };
}

function normalizeStatus(value: unknown): UnityBuildStatus {
  if (typeof value !== 'string') return 'unknown';
  if (value === 'queued' || value === 'sentToBuilder' || value === 'started' || value === 'restarted' || value === 'success' || value === 'failure' || value === 'canceled') {
    return value;
  }
  return 'unknown';
}

async function unityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { authorization } = getConfig();
  const response = await fetch(`${UNITY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new UnityApiError(text || `Unity API hatası: ${response.status}`, { status: response.status, endpointPath: path });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function mapBuild(raw: UnityBuildRaw): UnityBuildResponse {
  return {
    build: typeof raw.build === 'number' ? raw.build : 0,
    buildTargetId: raw.buildtargetid ?? '',
    status: normalizeStatus(raw.status),
    created: raw.created ?? new Date(0).toISOString(),
    links: raw.links?.download_primary?.href ? { download_primary: { href: raw.links.download_primary.href } } : undefined
  };
}

export async function triggerBuild(buildTargetId: string): Promise<UnityBuildResponse> {
  const { orgId, projectId } = getConfig();
  const data = await unityRequest<UnityBuildRaw>(`/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds`, {
    method: 'POST',
    body: JSON.stringify({ clean: false, delay: 0 })
  });

  return mapBuild({ ...data, buildtargetid: data.buildtargetid ?? buildTargetId });
}

export async function getBuildStatus(buildTargetId: string, buildNumber: number): Promise<UnityBuildResponse & { finished?: string }> {
  const { orgId, projectId } = getConfig();
  const data = await unityRequest<UnityBuildRaw>(`/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds/${buildNumber}`);
  const mapped = mapBuild({ ...data, buildtargetid: data.buildtargetid ?? buildTargetId });
  return { ...mapped, finished: data.finished };
}

export async function cancelBuild(buildTargetId: string, buildNumber: number): Promise<void> {
  const { orgId, projectId } = getConfig();
  await unityRequest<void>(`/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds/${buildNumber}`, {
    method: 'DELETE'
  });
}

export async function getBuilds(buildTargetId: string, limit = 10): Promise<(UnityBuildResponse & { finished?: string })[]> {
  const { orgId, projectId } = getConfig();
  const data = await unityRequest<UnityBuildRaw[]>(`/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds?per_page=${limit}`);
  return (Array.isArray(data) ? data : []).map((item) => ({ ...mapBuild({ ...item, buildtargetid: item.buildtargetid ?? buildTargetId }), finished: item.finished }));
}

export async function getBuildTargets(): Promise<UnityBuildTarget[]> {
  const { orgId, projectId } = getConfig();
  const data = await unityRequest<UnityBuildTarget[]>(`/orgs/${orgId}/projects/${projectId}/buildtargets`);
  return Array.isArray(data) ? data : [];
}

// Geriye dönük uyumluluk (owner araçları).
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
  const slug = appName
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

export function validateUnityGameProjectDraft(input: Partial<UnityGameProjectDraft>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.appName?.trim()) errors.push('App name is required.');
  if (!input.userPrompt?.trim()) errors.push('Prompt is required.');
  if (!input.packageName?.trim()) errors.push('Package name is required.');
  return { ok: errors.length === 0, errors };
}
