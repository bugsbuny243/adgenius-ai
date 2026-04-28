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
  build: number | null;
  buildTargetId: string;
  status: UnityBuildStatus;
  created: string;
  finished?: string;
  links?: { download_primary?: { href: string } };
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
    this.authMode = options?.authMode ?? 'basic_api_key';
  }
}

function getConfig() {
  const orgId = process.env.UNITY_ORG_ID?.trim();
  const projectId = process.env.UNITY_PROJECT_ID?.trim();
  const apiKey = process.env.UNITY_BUILD_API_KEY?.trim();

  if (!orgId || !projectId || !apiKey) {
    throw new Error('Unity yapılandırması eksik.');
  }

  const encoded = Buffer.from(`${apiKey}:`, 'utf8').toString('base64');
  return { orgId, projectId, authorization: `Basic ${encoded}`, authMode: 'basic_api_key' as const };
}

function normalizeStatus(value: unknown): UnityBuildStatus {
  if (typeof value !== 'string') return 'unknown';
  const validStatuses = ['queued', 'sentToBuilder', 'started', 'restarted', 'success', 'failure', 'canceled'];
  return validStatuses.includes(value) ? (value as UnityBuildStatus) : 'unknown';
}

async function unityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { authorization, authMode } = getConfig();
  const response = await fetch(`${UNITY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.toLowerCase().includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : (payload as { message?: string })?.message;
    throw new UnityApiError(message || `Unity API hatası: ${response.status}`, {
      status: response.status,
      endpointPath: path,
      authMode
    });
  }

  return payload as T;
}

function mapBuild(raw: UnityBuildRaw): UnityBuildResponse {
  return {
    build: typeof raw.build === 'number' && Number.isInteger(raw.build) && raw.build > 0 ? raw.build : null,
    buildTargetId: raw.buildtargetid ?? '',
    status: normalizeStatus(raw.status),
    created: raw.created ?? new Date(0).toISOString(),
    finished: raw.finished,
    links: raw.links?.download_primary?.href ? { download_primary: { href: raw.links.download_primary.href } } : undefined
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveBuildTargetId(nameOrId: string): Promise<string> {
  if (UUID_PATTERN.test(nameOrId)) return nameOrId;
  const targets = await unityRequest<Array<{ buildtargetid: string; name?: string }>>(
    `/orgs/${getConfig().orgId}/projects/${getConfig().projectId}/buildtargets`
  );
  const match = targets.find((target) => target.name === nameOrId || target.buildtargetid === nameOrId);
  if (!match) throw new Error(`Build target bulunamadı: ${nameOrId}`);
  return match.buildtargetid;
}

export async function triggerBuild(buildTargetIdOrName: string): Promise<UnityBuildResponse> {
  const { orgId, projectId } = getConfig();
  const targetId = await resolveBuildTargetId(buildTargetIdOrName);
  const data = await unityRequest<UnityBuildRaw>(`/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds`, {
    method: 'POST',
    body: JSON.stringify({ clean: false, delay: 0 })
  });
  return mapBuild({ ...data, buildtargetid: data.buildtargetid ?? targetId });
}

export async function getBuildStatus(buildTargetIdOrName: string, buildNumber: number): Promise<UnityBuildResponse> {
  const { orgId, projectId } = getConfig();
  const targetId = await resolveBuildTargetId(buildTargetIdOrName);
  const data = await unityRequest<UnityBuildRaw>(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds/${buildNumber}`
  );
  return mapBuild({ ...data, buildtargetid: data.buildtargetid ?? targetId });
}

export async function getBuilds(buildTargetIdOrName: string, limit = 10): Promise<UnityBuildResponse[]> {
  const { orgId, projectId } = getConfig();
  const targetId = await resolveBuildTargetId(buildTargetIdOrName);
  const data = await unityRequest<UnityBuildRaw[]>(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds?per_page=${limit}`
  );
  return (Array.isArray(data) ? data : []).map((item) => mapBuild({ ...item, buildtargetid: item.buildtargetid ?? targetId }));
}
