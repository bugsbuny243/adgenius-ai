import { createHmac, timingSafeEqual } from 'node:crypto';

import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type UnityCallbackBody = {
  buildNumber?: number;
  buildStatus?: string;
  status?: string;
  links?: {
    share_url?: { href?: string };
    download_primary?: { href?: string };
    log?: { href?: string };
    artifacts?: Array<{ files?: Array<{ href?: string }> }>;
  };
  build?: {
    buildNumber?: number;
    status?: string;
    links?: UnityCallbackBody['links'];
  };
};

function safeEqualHex(expectedHex: string, providedHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const provided = Buffer.from(providedHex, 'hex');
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

function extractUrls(body: UnityCallbackBody) {
  const links = body.links ?? body.build?.links;
  return {
    artifactUrl:
      links?.download_primary?.href ??
      links?.share_url?.href ??
      links?.artifacts?.[0]?.files?.[0]?.href ??
      null,
    logsUrl: links?.log?.href ?? null
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.UNITY_WEBHOOK_SECRET?.trim();
  const signatureHeader = request.headers.get('x-unity-signature') ?? request.headers.get('x-signature') ?? '';

  if (secret) {
    if (!signatureHeader) {
      return Response.json({ ok: false, error: 'Missing webhook signature.' }, { status: 401 });
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = signatureHeader.replace(/^sha256=/, '').toLowerCase();

    if (!/^[0-9a-f]+$/i.test(provided) || !safeEqualHex(expected, provided)) {
      return Response.json({ ok: false, error: 'Invalid webhook signature.' }, { status: 401 });
    }
  }

  const body = (JSON.parse(rawBody || '{}') ?? {}) as UnityCallbackBody;
  const buildNumber = Number(body.buildNumber ?? body.build?.buildNumber ?? 0);
  const statusValue = String(body.buildStatus ?? body.status ?? body.build?.status ?? '').toLowerCase();
  const { artifactUrl, logsUrl } = extractUrls(body);

  const serviceRole = getSupabaseServiceRoleClient();

  if (buildNumber > 0) {
    const terminal = statusValue.includes('success') || statusValue.includes('succeeded') || statusValue.includes('failure') || statusValue.includes('failed') || statusValue.includes('cancel');
    const mappedStatus =
      statusValue.includes('success') || statusValue.includes('succeeded')
        ? 'succeeded'
        : statusValue.includes('failure') || statusValue.includes('failed')
          ? 'failed'
          : statusValue.includes('cancel')
            ? 'cancelled'
            : statusValue.includes('start') || statusValue.includes('builder')
              ? 'running'
              : 'queued';

    const patch: Record<string, unknown> = {
      status: mappedStatus,
      logs_url: logsUrl,
      ...(artifactUrl ? { artifact_url: artifactUrl, artifact_type: 'aab' } : {}),
      ...(terminal ? { finished_at: new Date().toISOString() } : {})
    };

    await serviceRole.from('unity_build_jobs').update(patch).contains('metadata', { unityBuildNumber: buildNumber });

    if (mappedStatus === 'succeeded' && artifactUrl) {
      const { data: jobs } = await serviceRole
        .from('unity_build_jobs')
        .select('id, unity_game_project_id, workspace_id, requested_by')
        .contains('metadata', { unityBuildNumber: buildNumber });

      for (const job of jobs ?? []) {
        await serviceRole.from('game_artifacts').upsert(
          {
            unity_game_project_id: job.unity_game_project_id,
            unity_build_job_id: job.id,
            workspace_id: job.workspace_id,
            user_id: job.requested_by,
            artifact_type: 'aab',
            file_url: artifactUrl,
            status: 'ready'
          },
          { onConflict: 'unity_build_job_id,artifact_type' }
        );
      }
    }
  }

  return Response.json({ ok: true });
}
