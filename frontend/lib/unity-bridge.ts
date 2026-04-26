import 'server-only';

const UNITY_BASE_URL = 'https://build-api.cloud.unity3d.com/api/v1';

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

function getConfig() {
  const orgId = process.env.UNITY_ORG_ID?.trim();
  const projectId = process.env.UNITY_PROJECT_ID?.trim();
  const keyId = process.env.UNITY_SERVICE_ACCOUNT_KEY_ID?.trim();
  const secretKey = process.env.UNITY_SERVICE_ACCOUNT_SECRET?.trim() || process.env.UNITY_SERVICE_ACCOUNT_SECRET_KEY?.trim();

  if (!orgId || !projectId || !keyId || !secretKey) {
    throw new Error('Unity build ayarları eksik. UNITY_ORG_ID, UNITY_PROJECT_ID ve servis anahtarlarını kontrol edin.');
  }

  const authorization = `Basic ${Buffer.from(`${keyId}:${secretKey}`, 'utf8').toString('base64')}`;

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
    throw new Error(text || `Unity API hatası: ${response.status}`);
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
