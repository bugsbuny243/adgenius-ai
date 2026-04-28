import 'server-only';

const BASE_URL = 'https://build-api.cloud.unity3d.com/api/v1';

function getAuth(): string {
  const keyId = process.env.UNITY_SERVICE_ACCOUNT_KEY_ID?.trim();
  const secret = process.env.UNITY_SERVICE_ACCOUNT_SECRET_KEY?.trim();
  if (!keyId || !secret) throw new UnityApiError('Unity kimlik bilgileri eksik.');
  return 'Basic ' + Buffer.from(`${keyId}:${secret}`).toString('base64');
}

function getOrgProject(): { orgId: string; projectId: string } {
  const orgId = process.env.UNITY_ORG_ID?.trim();
  const projectId = process.env.UNITY_PROJECT_ID?.trim();
  if (!orgId || !projectId) throw new UnityApiError('UNITY_ORG_ID veya UNITY_PROJECT_ID eksik.');
  return { orgId, projectId };
}

export class UnityApiError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'UnityApiError';
  }
}

export interface UnityBuildResponse {
  build: number;
  buildTargetId: string;
  status: string;
  created: string;
  finished?: string;
  links?: {
    download_primary?: { href: string };
  };
}

async function unityFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const auth = getAuth();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new UnityApiError(`Unity API hatası ${res.status}: ${text}`);
  }
  return res;
}

export async function triggerBuild(buildTargetId: string): Promise<UnityBuildResponse> {
  const { orgId, projectId } = getOrgProject();
  const res = await unityFetch(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds`,
    { method: 'POST', body: JSON.stringify({ clean: false, delay: 0 }) }
  );
  const json = await res.json();
  // Unity bazen array döndürür
  return Array.isArray(json) ? json[0] : json;
}

export async function getBuildStatus(
  buildTargetId: string,
  buildNumber: number
): Promise<UnityBuildResponse> {
  const { orgId, projectId } = getOrgProject();
  const res = await unityFetch(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds/${buildNumber}`
  );
  return res.json();
}

export async function getBuilds(
  buildTargetId: string,
  limit = 10
): Promise<UnityBuildResponse[]> {
  const { orgId, projectId } = getOrgProject();
  const res = await unityFetch(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds?per_page=${limit}`
  );
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

export async function cancelBuild(
  buildTargetId: string,
  buildNumber: number
): Promise<void> {
  const { orgId, projectId } = getOrgProject();
  await unityFetch(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${buildTargetId}/builds/${buildNumber}`,
    { method: 'DELETE' }
  );
}
