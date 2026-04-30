# KOSCHEI GAME FACTORY — EKSİK DOSYALAR

Bu dosyaları GitHub'a ekle. Hepsi `frontend/` altında.

---

## DOSYA 1: frontend/lib/server/unity-cloud-build.ts (YENİ KLASÖR + DOSYA)

```typescript
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
```

---

## DOSYA 2: frontend/lib/server/github-unity-build-config.ts (YENİ)

```typescript
import 'server-only';

interface WriteConfigParams {
  owner: string;
  repo: string;
  branch: string;
  payload: {
    project_id: string;
    build_job_id: string;
    app_name: string;
    package_name: string;
    version_code: number;
    version_name: string;
    target_platform: string;
  };
}

interface WriteConfigResult {
  branch: string;
  commitSha: string | null;
  path: string;
}

export async function writeUnityBuildConfigToRepo(
  params: WriteConfigParams
): Promise<WriteConfigResult> {
  const token = process.env.GITHUB_UNITY_REPO_TOKEN?.trim();
  if (!token) throw new Error('GITHUB_UNITY_REPO_TOKEN eksik.');

  const { owner, repo, branch, payload } = params;
  const path = 'Assets/Koschei/Generated/koschei-build-config.json';
  const content = JSON.stringify(payload, null, 2);
  const base64Content = Buffer.from(content).toString('base64');

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Mevcut dosyayı al (SHA için)
  let existingSha: string | undefined;
  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers }
    );
    if (getRes.ok) {
      const data = await getRes.json();
      existingSha = data.sha;
    }
  } catch {
    // Dosya yok, ilk kez oluşturulacak
  }

  // Dosyayı yaz
  const body: Record<string, unknown> = {
    message: `chore: update koschei build config for ${payload.package_name} v${payload.version_name}`,
    content: base64Content,
    branch,
  };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers, body: JSON.stringify(body) }
  );

  if (!putRes.ok) {
    const err = await putRes.text().catch(() => '');
    throw new Error(`GitHub config yazma hatası ${putRes.status}: ${err}`);
  }

  const putData = await putRes.json();
  const commitSha: string | null = putData?.commit?.sha ?? null;

  return { branch, commitSha, path };
}
```

---

## DOSYA 3: frontend/app/api/game-factory/_builds.ts (YENİ)

```typescript
import 'server-only';
import { getBuildStatus, getBuilds } from '@/lib/server/unity-cloud-build';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

interface ApiAuthContext {
  userId: string;
  workspaceId: string;
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>;
}

function mapUnityStatus(unityStatus: string): string {
  switch (unityStatus) {
    case 'success': return 'success';
    case 'failure': case 'failed': return 'failed';
    case 'canceled': case 'cancelled': return 'cancelled';
    case 'queued': return 'queued';
    default: return 'running';
  }
}

export async function refreshSingleBuildStatus(
  context: ApiAuthContext,
  jobId: string
): Promise<{ body: object; status: number }> {
  const service = getSupabaseServiceRoleClient();

  const { data: job } = await service
    .from('unity_build_jobs')
    .select('id, status, metadata, unity_game_project_id, workspace_id')
    .eq('id', jobId)
    .eq('workspace_id', context.workspaceId)
    .maybeSingle();

  if (!job) return { body: { ok: false, error: 'Build kaydı bulunamadı.' }, status: 404 };

  // Zaten bitti mi?
  if (job.status === 'success' || job.status === 'failed' || job.status === 'cancelled') {
    return { body: { ok: true, status: job.status, artifactUrl: (job.metadata as Record<string, unknown>)?.artifactUrl ?? null }, status: 200 };
  }

  const meta = (job.metadata ?? {}) as Record<string, unknown>;
  const buildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim();
  if (!buildTargetId) return { body: { ok: false, error: 'UNITY_BUILD_TARGET_ID eksik.' }, status: 500 };

  let unityBuildNumber = typeof meta.unityBuildNumber === 'number' ? meta.unityBuildNumber : null;

  // Build number yoksa en son build'i bul
  if (!unityBuildNumber) {
    try {
      const builds = await getBuilds(buildTargetId, 5);
      const latest = builds[0];
      if (latest?.build) unityBuildNumber = latest.build;
    } catch {
      return { body: { ok: true, status: 'queued', artifactUrl: null }, status: 200 };
    }
  }

  if (!unityBuildNumber) {
    return { body: { ok: true, status: 'queued', artifactUrl: null }, status: 200 };
  }

  let unityData;
  try {
    unityData = await getBuildStatus(buildTargetId, unityBuildNumber);
  } catch {
    return { body: { ok: true, status: job.status, artifactUrl: null }, status: 200 };
  }

  const newStatus = mapUnityStatus(unityData.status);
  const artifactUrl = unityData.links?.download_primary?.href ?? null;

  await service.from('unity_build_jobs').update({
    status: newStatus,
    started_at: unityData.created ?? null,
    finished_at: unityData.finished ?? null,
    artifact_url: artifactUrl,
    artifact_type: artifactUrl ? 'aab' : null,
    metadata: {
      ...meta,
      unityBuildNumber,
      unityStatus: unityData.status,
      artifactUrl,
    },
  }).eq('id', jobId);

  if (newStatus === 'success') {
    await service.from('unity_game_projects')
      .update({ status: 'build_ready' })
      .eq('id', job.unity_game_project_id);
  } else if (newStatus === 'failed') {
    await service.from('unity_game_projects')
      .update({ status: 'failed' })
      .eq('id', job.unity_game_project_id);
  }

  return { body: { ok: true, status: newStatus, artifactUrl }, status: 200 };
}
```

---

## DOSYA 4: frontend/app/game-factory/[id]/StartBuildButton.tsx (YENİ)

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StartBuildButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const session = await (await import('@/lib/supabase-browser')).createSupabaseBrowserClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { setError('Oturum bulunamadı.'); return; }

      const res = await fetch('/api/game-factory/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId }),
      });

      const data = await res.json();
      if (!data.ok) { setError(data.error ?? 'Build başlatılamadı.'); return; }

      router.refresh();
    } catch {
      setError('Bağlantı hatası. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {loading ? 'Build başlatılıyor...' : 'Yeni Build Başlat'}
      </button>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  );
}
```

---

## DOSYA 5: frontend/app/game-factory/[id]/BuildStatusPoller.tsx (YENİ)

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function BuildStatusPoller({ jobId, token }: { jobId: string; token: string }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/game-factory/build-status?jobId=${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === 'success' || data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // sessizce devam et
      }
    }, 20_000); // 20 saniyede bir

    return () => clearInterval(interval);
  }, [jobId, token, router]);

  return null;
}
```

---

## DOSYA 6: frontend/app/game-factory/[id]/builds/page.tsx (YENİDEN YAZ)

```typescript
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { StartBuildButton } from '../StartBuildButton';
import { BuildStatusPoller } from '../BuildStatusPoller';

export const dynamic = 'force-dynamic';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    queued: 'bg-amber-500/20 text-amber-300',
    running: 'bg-blue-500/20 text-blue-300',
    success: 'bg-emerald-500/20 text-emerald-300',
    failed: 'bg-rose-500/20 text-rose-300',
    cancelled: 'bg-zinc-500/20 text-zinc-300',
  };
  const label: Record<string, string> = {
    queued: '⏳ Sırada',
    running: '🔄 Devam Ediyor',
    success: '✅ Başarılı',
    failed: '❌ Hata',
    cancelled: '⛔ İptal',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-zinc-700 text-zinc-300'}`}>
      {label[status] ?? status}
    </span>
  );
}

export default async function BuildsPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const { data: project } = await supabase
    .from('unity_game_projects')
    .select('id, app_name, package_name, status, approval_status')
    .eq('id', params.id)
    .maybeSingle();

  if (!project) redirect('/game-factory');

  const { data: jobs } = await supabase
    .from('unity_build_jobs')
    .select('id, status, queued_at, started_at, finished_at, artifact_url, metadata, version_name, version_code')
    .eq('unity_game_project_id', params.id)
    .order('created_at', { ascending: false });

  const activeJob = jobs?.find(j => j.status === 'queued' || j.status === 'running');

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{project.app_name}</h1>
          <p className="text-sm text-white/50">{project.package_name}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/game-factory/${params.id}`} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-white/40">
            Projeye Dön
          </a>
          {project.approval_status === 'approved' && (
            <StartBuildButton projectId={params.id} />
          )}
        </div>
      </div>

      {activeJob && <BuildStatusPoller jobId={activeJob.id} token={token} />}

      <div className="rounded-2xl border border-white/10 bg-black/20 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="text-left text-white/50">
              <th className="px-4 py-3">Build</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">Başlangıç</th>
              <th className="px-4 py-3">Süre</th>
              <th className="px-4 py-3">İndir</th>
            </tr>
          </thead>
          <tbody>
            {!jobs?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Henüz build yok.
                </td>
              </tr>
            )}
            {jobs?.map((job, i) => {
              const meta = (job.metadata ?? {}) as Record<string, unknown>;
              const buildNum = meta.unityBuildNumber as number | undefined;
              const start = job.started_at ? new Date(job.started_at) : null;
              const end = job.finished_at ? new Date(job.finished_at) : null;
              const durationSec = start && end ? Math.round((end.getTime() - start.getTime()) / 1000) : null;
              const duration = durationSec
                ? durationSec >= 60
                  ? `${Math.floor(durationSec / 60)}d ${durationSec % 60}s`
                  : `${durationSec}s`
                : '-';

              return (
                <tr key={job.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono">
                    #{buildNum ?? (jobs.length - i)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(job.status)}</td>
                  <td className="px-4 py-3 text-white/60">
                    {start ? start.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-white/60">{duration}</td>
                  <td className="px-4 py-3">
                    {job.artifact_url ? (
                      <a
                        href={job.artifact_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/30"
                      >
                        ⬇ AAB İndir
                      </a>
                    ) : (
                      <span className="text-white/30">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## NOTLAR

**Bu dosyaları GitHub'da oluştur:**
1. `frontend/lib/server/` klasörü yeni — içine `unity-cloud-build.ts` ve `github-unity-build-config.ts` ekle
2. `frontend/app/api/game-factory/_builds.ts` — mevcut `_auth.ts`'nin yanına ekle
3. `frontend/app/game-factory/[id]/StartBuildButton.tsx` — mevcut dosyaların yanına ekle
4. `frontend/app/game-factory/[id]/BuildStatusPoller.tsx` — ekle
5. `frontend/app/game-factory/[id]/builds/page.tsx` — mevcut dosyayı değiştir

**Supabase'de eksik kolon:**
`unity_build_jobs` tablosunda `user_id` kolonu yoksa ekle:
```sql
ALTER TABLE public.unity_build_jobs 
ADD COLUMN IF NOT EXISTS user_id uuid references auth.users(id);
```
