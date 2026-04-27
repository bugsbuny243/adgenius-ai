// frontend/lib/unity-bridge.ts (SON SÜRÜM - TÜM FONKSİYONLAR DÜZELTİLDİ)

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
  const buildApiKey = process.env.UNITY_BUILD_API_KEY?.trim();

  if (!orgId || !projectId) {
    throw new Error('Unity yapılandırması eksik: UNITY_ORG_ID ve UNITY_PROJECT_ID zorunludur.');
  }

  if (!buildApiKey) {
    throw new Error('Unity API anahtarı eksik: UNITY_BUILD_API_KEY tanımlanmamış.');
  }

  // Unity Build Automation API anahtarı formatı:
  // Basic base64(apiKey:) yani anahtarın sonuna iki nokta üst üste konur, şifre yoktur.
  const encoded = Buffer.from(`${buildApiKey}:`, 'utf8').toString('base64');

  return {
    orgId,
    projectId,
    authorization: `Basic ${encoded}`,
    authMode: 'basic_api_key' as const,
  };
}

function normalizeStatus(value: unknown): UnityBuildStatus {
  if (typeof value !== 'string') return 'unknown';
  const validStatuses = ['queued', 'sentToBuilder', 'started', 'restarted', 'success', 'failure', 'canceled'];
  return validStatuses.includes(value) ? (value as UnityBuildStatus) : 'unknown';
}

async function unityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { authorization, authMode } = getConfig();
  const url = `${UNITY_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJsonResponse = contentType.toLowerCase().includes('application/json');
  const payload = isJsonResponse ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : (payload as { message?: string } | null | undefined)?.message;

    console.error('Unity API hatası:', {
      status: response.status,
      path,
      method: init?.method ?? 'GET',
      authMode,
      message,
    });

    throw new UnityApiError(
      message || `Unity API hatası: ${response.status}`,
      { status: response.status, endpointPath: path, authMode }
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return payload as T;
}

function mapBuild(raw: UnityBuildRaw): UnityBuildResponse {
  return {
    build: typeof raw.build === 'number' ? raw.build : 0,
    buildTargetId: raw.buildtargetid ?? '',
    status: normalizeStatus(raw.status),
    created: raw.created ?? new Date(0).toISOString(),
    links: raw.links?.download_primary?.href
      ? { download_primary: { href: raw.links.download_primary.href } }
      : undefined,
  };
}

/**
 * Hedef adı verilmişse gerçek build hedefi UUID'sini çözer.
 * Eğer zaten UUID formatında bir değer gönderilirse onu aynen kullanır.
 */
const UUID_V4_OR_GENERIC_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveBuildTargetId(nameOrId: string): Promise<string> {
  if (UUID_V4_OR_GENERIC_PATTERN.test(nameOrId)) {
    return nameOrId;
  }

  console.log(`Build hedefi adı kullanıldı, UUID çözülüyor: "${nameOrId}"`);

  try {
    const targets = await getBuildTargets();
    const match = targets.find(
      (t) => t.name === nameOrId || t.buildtargetid === nameOrId
    );

    if (!match) {
      throw new Error(
        `"${nameOrId}" adında bir build hedefi bulunamadı. Lütfen Unity Dashboard > Build Automation > Configurations sayfasından hedef adınızı kontrol edin.`
      );
    }

    console.log(`Hedef UUID bulundu: ${match.buildtargetid}`);
    return match.buildtargetid;
  } catch (error) {
    if (error instanceof UnityApiError) {
      throw error;
    }
    throw new UnityApiError(
      `Build hedefi çözülemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
    );
  }
}

// ========== TÜM FONKSİYONLAR GÜNCELLENDİ ==========

export async function triggerBuild(buildTargetIdOrName: string): Promise<UnityBuildResponse> {
  const { orgId, projectId } = getConfig();
  const targetId = await resolveBuildTargetId(buildTargetIdOrName);

  const data = await unityRequest<UnityBuildRaw>(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds`,
    {
      method: 'POST',
      body: JSON.stringify({ clean: false, delay: 0 }),
    }
  );

  return mapBuild({ ...data, buildtargetid: data.buildtargetid ?? targetId });
}

export async function getBuildStatus(
  buildTargetIdOrName: string,
  buildNumber: number
): Promise<UnityBuildResponse & { finished?: string }> {
  const { orgId, projectId } = getConfig();
  const targetId = await resolveBuildTargetId(buildTargetIdOrName); // <-- DÜZELTİLDİ

  const data = await unityRequest<UnityBuildRaw>(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds/${buildNumber}`
  );

  const mapped = mapBuild({ ...data, buildtargetid: data.buildtargetid ?? targetId });
  return { ...mapped, finished: data.finished };
}

export async function cancelBuild(
  buildTargetIdOrName: string,
  buildNumber: number
): Promise<void> {
  const { orgId, projectId } = getConfig();
  const targetId = await resolveBuildTargetId(buildTargetIdOrName); // <-- DÜZELTİLDİ

  await unityRequest<void>(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds/${buildNumber}`,
    { method: 'DELETE' }
  );
}

export async function getBuilds(
  buildTargetIdOrName: string,
  limit = 10
): Promise<(UnityBuildResponse & { finished?: string })[]> {
  const { orgId, projectId } = getConfig();
  const targetId = await resolveBuildTargetId(buildTargetIdOrName); // <-- DÜZELTİLDİ

  const data = await unityRequest<UnityBuildRaw[]>(
    `/orgs/${orgId}/projects/${projectId}/buildtargets/${targetId}/builds?per_page=${limit}`
  );

  return (Array.isArray(data) ? data : []).map((item) => ({
    ...mapBuild({ ...item, buildtargetid: item.buildtargetid ?? targetId }),
    finished: item.finished,
  }));
}

export async function getBuildTargets(): Promise<UnityBuildTarget[]> {
  const { orgId, projectId } = getConfig();
  const data = await unityRequest<UnityBuildTarget[]>(
    `/orgs/${orgId}/projects/${projectId}/buildtargets`
  );
  return Array.isArray(data) ? data : [];
}
