import { serviceRoleClient } from '../../src/auth.js';
import { getBuildStatus } from '../../src/unity-bridge.js';
import { publishAutomated } from '../../src/google-play.js';

const BACKOFF_STEPS_MS = [10_000, 30_000, 60_000, 300_000] as const;
let backoffIndex = 0;
let timer: NodeJS.Timeout | null = null;

async function validateArtifact(url: string) {
  const lower = url.toLowerCase();
  if (!lower.endsWith('.aab') && !lower.endsWith('.apk')) throw new Error('Artifact .aab veya .apk değil.');
  const res = await fetch(url, { method: 'HEAD' });
  if (!res.ok) throw new Error(`Artifact erişilemez: ${res.status}`);
}

async function tick(): Promise<number> {
  const { data: jobs } = await serviceRoleClient
    .from('unity_build_jobs')
    .select('id, unity_game_project_id, metadata, artifact_url, status')
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: true })
    .limit(10);

  for (const job of jobs ?? []) {
    const metadata = (job.metadata ?? {}) as Record<string, unknown>;
    const buildTargetId = String(metadata.unityBuildTargetId ?? '').trim();
    const buildNumber = Number(metadata.unityBuildNumber ?? 0);
    if (!buildTargetId || !Number.isInteger(buildNumber) || buildNumber <= 0) continue;

    const unity = await getBuildStatus(buildTargetId, buildNumber);
    if (unity.status !== 'success' && unity.status !== 'failure' && unity.status !== 'canceled') continue;

    const artifactUrl = unity.links?.download_primary?.href ?? job.artifact_url;
    if (!artifactUrl) {
      await serviceRoleClient.from('unity_build_jobs').update({ status: 'failed', error_message: 'artifact_url missing' }).eq('id', job.id);
      continue;
    }

    try {
      await validateArtifact(artifactUrl);
      await serviceRoleClient.from('unity_build_jobs').update({ status: unity.status === 'success' ? 'succeeded' : 'failed', artifact_url: artifactUrl }).eq('id', job.id);

      if (unity.status === 'success') {
        const { data: project } = await serviceRoleClient
          .from('unity_game_projects')
          .select('package_name, metadata')
          .eq('id', job.unity_game_project_id)
          .maybeSingle();
        const projectMetadata = (project?.metadata ?? {}) as Record<string, unknown>;
        const refreshToken = String(projectMetadata.googleRefreshToken ?? '').trim();
        if (project?.package_name && refreshToken) {
          await publishAutomated({
            packageName: project.package_name,
            artifactUrl,
            refreshToken,
            releaseNotes: String(projectMetadata.releaseNotes ?? 'Automated internal release'),
            track: 'internal'
          });
        }
      }
    } catch (error) {
      await serviceRoleClient.from('unity_build_jobs').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'worker_error' }).eq('id', job.id);
    }
  }

  return jobs?.length ?? 0;
}

async function loop() {
  try {
    const count = await tick();
    backoffIndex = count > 0 ? 0 : Math.min(backoffIndex + 1, BACKOFF_STEPS_MS.length - 1);
  } finally {
    timer = setTimeout(() => void loop(), BACKOFF_STEPS_MS[backoffIndex]);
  }
}

void loop();
