import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type UnityBuildJobRow = {
  id: string;
  unity_game_project_id: string;
  status: string | null;
  artifact_url: string | null;
  started_at: string | null;
  metadata: Record<string, unknown> | null;
  external_build_id: string | null;
  build_target_id: string | null;
};

type UnityGameProjectRow = {
  id: string;
  package_name: string | null;
};

type MatchedBy = 'external_build_id' | 'metadata.unityBuildNumber' | 'metadata.unityBuildTargetId' | 'fallback';

type ParsedUnityEvent = {
  eventTopic: string | null;
  mappedStatus: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | null;
  unityBuildNumber: number | null;
  unityBuildTargetId: string | null;
  unityBuildTargetName: string | null;
  unityProjectId: string | null;
  unityOrgId: string | null;
  externalBuildId: string | null;
  artifactUrl: string | null;
  logsUrl: string | null;
  errorMessage: string | null;
};

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase env eksik: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY zorunlu.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickInteger(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
    if (typeof value === 'string') {
      const n = Number.parseInt(value.trim(), 10);
      if (Number.isInteger(n) && n > 0) return n;
    }
  }
  return null;
}

function pickFromRecord(record: Record<string, unknown> | null | undefined, key: string): unknown {
  if (!record || typeof record !== 'object') return undefined;
  return record[key];
}

function mapEventToStatus(topic: string | null): ParsedUnityEvent['mappedStatus'] {
  if (!topic) return null;
  const normalized = topic.toLowerCase();
  if (normalized.includes('queued')) return 'queued';
  if (normalized.includes('started') || normalized.includes('start')) return 'running';
  if (normalized.includes('success') || normalized.includes('succeed')) return 'succeeded';
  if (normalized.includes('failure') || normalized.includes('failed') || normalized.includes('error')) return 'failed';
  if (normalized.includes('canceled') || normalized.includes('cancelled') || normalized.includes('canceled')) return 'cancelled';
  return null;
}

function parseUnityPayload(payload: unknown, headers: Headers): ParsedUnityEvent {
  const root = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const data = (pickFromRecord(root, 'data') ?? {}) as Record<string, unknown>;
  const build = (pickFromRecord(root, 'build') ?? pickFromRecord(data, 'build') ?? {}) as Record<string, unknown>;
  const links = (pickFromRecord(root, 'links') ?? pickFromRecord(build, 'links') ?? pickFromRecord(data, 'links') ?? {}) as Record<
    string,
    unknown
  >;

  const eventTopic = pickString(
    pickFromRecord(root, 'topic'),
    pickFromRecord(root, 'event'),
    pickFromRecord(root, 'status'),
    pickFromRecord(data, 'topic'),
    pickFromRecord(data, 'event'),
    pickFromRecord(data, 'status'),
    pickFromRecord(build, 'status'),
    headers.get('x-unity-event'),
    headers.get('x-event-key')
  );

  const externalBuildId = pickString(
    pickFromRecord(root, 'external_build_id'),
    pickFromRecord(root, 'buildId'),
    pickFromRecord(root, 'build_id'),
    pickFromRecord(data, 'external_build_id'),
    pickFromRecord(data, 'buildId'),
    pickFromRecord(data, 'build_id'),
    pickFromRecord(build, 'build'),
    pickFromRecord(build, 'buildNumber')
  );

  const unityBuildTargetId = pickString(
    pickFromRecord(root, 'buildTargetId'),
    pickFromRecord(root, 'build_target_id'),
    pickFromRecord(data, 'buildTargetId'),
    pickFromRecord(data, 'build_target_id'),
    pickFromRecord(build, 'buildtargetid'),
    pickFromRecord(build, 'buildTargetId'),
    pickFromRecord(build, 'targetid'),
    pickFromRecord(build, 'targetId')
  );

  const artifactUrl = pickString(
    pickFromRecord(root, 'artifact_url'),
    pickFromRecord(data, 'artifact_url'),
    pickFromRecord(build, 'artifact_url'),
    pickFromRecord(links, 'download_primary') &&
      pickFromRecord(pickFromRecord(links, 'download_primary') as Record<string, unknown>, 'href'),
    pickFromRecord(links, 'download') && pickFromRecord(pickFromRecord(links, 'download') as Record<string, unknown>, 'href'),
    pickFromRecord(links, 'artifact') && pickFromRecord(pickFromRecord(links, 'artifact') as Record<string, unknown>, 'href')
  );

  const logsUrl = pickString(
    pickFromRecord(root, 'logs_url'),
    pickFromRecord(data, 'logs_url'),
    pickFromRecord(build, 'logs_url'),
    pickFromRecord(links, 'log') && pickFromRecord(pickFromRecord(links, 'log') as Record<string, unknown>, 'href'),
    pickFromRecord(links, 'logs') && pickFromRecord(pickFromRecord(links, 'logs') as Record<string, unknown>, 'href')
  );

  const errorMessage = pickString(
    pickFromRecord(root, 'error'),
    pickFromRecord(root, 'error_message'),
    pickFromRecord(data, 'error'),
    pickFromRecord(data, 'error_message'),
    pickFromRecord(build, 'error'),
    pickFromRecord(build, 'error_message')
  );

  return {
    eventTopic,
    mappedStatus: mapEventToStatus(eventTopic),
    unityBuildNumber: pickInteger(
      pickFromRecord(root, 'buildNumber'),
      pickFromRecord(root, 'build_number'),
      pickFromRecord(data, 'buildNumber'),
      pickFromRecord(data, 'build_number'),
      pickFromRecord(build, 'build'),
      pickFromRecord(build, 'buildNumber')
    ),
    unityBuildTargetId,
    unityBuildTargetName: pickString(
      pickFromRecord(root, 'buildTargetName'),
      pickFromRecord(data, 'buildTargetName'),
      pickFromRecord(build, 'buildTargetName'),
      pickFromRecord(build, 'targetName')
    ),
    unityProjectId: pickString(
      pickFromRecord(root, 'projectId'),
      pickFromRecord(root, 'project_id'),
      pickFromRecord(data, 'projectId'),
      pickFromRecord(data, 'project_id'),
      pickFromRecord(build, 'projectid')
    ),
    unityOrgId: pickString(
      pickFromRecord(root, 'orgId'),
      pickFromRecord(root, 'org_id'),
      pickFromRecord(data, 'orgId'),
      pickFromRecord(data, 'org_id')
    ),
    externalBuildId,
    artifactUrl,
    logsUrl,
    errorMessage
  };
}

function normalizeSignature(signature: string): string {
  const trimmed = signature.trim();
  if (trimmed.startsWith('sha256=')) return trimmed.slice(7);
  return trimmed;
}

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function verifyWebhookSignature(rawBody: string, headers: Headers, secret: string): boolean | null {
  const incoming = headers.get('x-unity-signature') ?? headers.get('x-hub-signature-256') ?? headers.get('x-webhook-signature');

  if (!incoming) return null;

  const hmac = createHmac('sha256', secret);
  hmac.update(rawBody, 'utf8');
  const digestHex = hmac.digest('hex');
  const digestBase64 = Buffer.from(digestHex, 'hex').toString('base64');
  const normalizedIncoming = normalizeSignature(incoming);

  return safeCompare(normalizedIncoming, digestHex) || safeCompare(normalizedIncoming, digestBase64);
}

function mapProjectStatus(status: ParsedUnityEvent['mappedStatus']): string | null {
  if (status === 'queued' || status === 'running') return 'building';
  if (status === 'succeeded') return 'build_succeeded';
  if (status === 'failed' || status === 'cancelled') return 'build_failed';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const payload = rawBody ? (JSON.parse(rawBody) as unknown) : {};
    const parsed = parseUnityPayload(payload, request.headers);

    const webhookSecret = process.env.UNITY_WEBHOOK_SECRET?.trim() ?? '';
    if (webhookSecret) {
      const signatureOk = verifyWebhookSignature(rawBody, request.headers, webhookSecret);
      if (signatureOk === false) {
        return NextResponse.json({ ok: false, error: 'Invalid webhook signature.' }, { status: 401 });
      }
    } else {
      console.warn('[unity-build-callback] UNITY_WEBHOOK_SECRET boş; callback doğrulaması devre dışı.');
    }

    const status = parsed.mappedStatus;
    if (!status) {
      return NextResponse.json({ ok: false, error: 'Desteklenmeyen event/status.' }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    let matchedBy: MatchedBy | null = null;
    let matchedJob: UnityBuildJobRow | null = null;

    if (parsed.externalBuildId) {
      const { data } = await supabase
        .from('unity_build_jobs')
        .select('id, unity_game_project_id, status, artifact_url, started_at, metadata, external_build_id, build_target_id')
        .eq('external_build_id', parsed.externalBuildId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<UnityBuildJobRow>();

      if (data) {
        matchedJob = data;
        matchedBy = 'external_build_id';
      }
    }

    if (!matchedJob && parsed.unityBuildNumber) {
      const { data } = await supabase
        .from('unity_build_jobs')
        .select('id, unity_game_project_id, status, artifact_url, started_at, metadata, external_build_id, build_target_id')
        .eq('metadata->>unityBuildNumber', String(parsed.unityBuildNumber))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<UnityBuildJobRow>();

      if (data) {
        matchedJob = data;
        matchedBy = 'metadata.unityBuildNumber';
      }
    }

    if (!matchedJob && parsed.unityBuildTargetId) {
      const { data } = await supabase
        .from('unity_build_jobs')
        .select('id, unity_game_project_id, status, artifact_url, started_at, metadata, external_build_id, build_target_id')
        .or(`metadata->>unityBuildTargetId.eq.${parsed.unityBuildTargetId},build_target_id.eq.${parsed.unityBuildTargetId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<UnityBuildJobRow>();

      if (data) {
        matchedJob = data;
        matchedBy = 'metadata.unityBuildTargetId';
      }
    }

    if (!matchedJob && (parsed.unityBuildTargetId || parsed.unityProjectId)) {
      let query = supabase
        .from('unity_build_jobs')
        .select('id, unity_game_project_id, status, artifact_url, started_at, metadata, external_build_id, build_target_id')
        .in('status', ['queued', 'running'])
        .is('artifact_url', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (parsed.unityBuildTargetId) {
        query = query.or(`metadata->>unityBuildTargetId.eq.${parsed.unityBuildTargetId},build_target_id.eq.${parsed.unityBuildTargetId}`);
      }

      if (parsed.unityProjectId) {
        query = query.eq('metadata->>unityProjectId', parsed.unityProjectId);
      }

      const { data } = await query.maybeSingle<UnityBuildJobRow>();
      if (data) {
        matchedJob = data;
        matchedBy = 'fallback';
      }
    }

    if (!matchedJob || !matchedBy) {
      return NextResponse.json({ ok: true, updated: false, reason: 'no_matching_job' }, { status: 202 });
    }

    const now = new Date().toISOString();
    const metadata = { ...((matchedJob.metadata ?? {}) as Record<string, unknown>) };

    const webhookSummary: Record<string, unknown> = {
      topic: parsed.eventTopic,
      status,
      unityBuildNumber: parsed.unityBuildNumber,
      unityBuildTargetId: parsed.unityBuildTargetId,
      unityBuildTargetName: parsed.unityBuildTargetName,
      unityProjectId: parsed.unityProjectId,
      unityOrgId: parsed.unityOrgId,
      externalBuildId: parsed.externalBuildId,
      artifactUrl: parsed.artifactUrl,
      logsUrl: parsed.logsUrl,
      receivedAt: now
    };

    const patch: Record<string, unknown> = {
      status,
      metadata: {
        ...metadata,
        unityBuildNumber: parsed.unityBuildNumber ?? metadata.unityBuildNumber ?? null,
        unityBuildTargetId: parsed.unityBuildTargetId ?? metadata.unityBuildTargetId ?? null,
        unityProjectId: parsed.unityProjectId ?? metadata.unityProjectId ?? null,
        unityOrgId: parsed.unityOrgId ?? metadata.unityOrgId ?? null,
        webhook: webhookSummary
      }
    };

    if (status === 'running') {
      patch.started_at = matchedJob.started_at ?? now;
      patch.finished_at = null;
    }

    if (status === 'succeeded' || status === 'failed' || status === 'cancelled') {
      patch.finished_at = now;
    }

    if (parsed.artifactUrl) {
      patch.artifact_url = parsed.artifactUrl;
    }

    if (parsed.logsUrl) {
      patch.logs_url = parsed.logsUrl;
    }

    if (status === 'succeeded') {
      patch.artifact_type = 'aab';
      patch.error_message = null;
    }

    if (status === 'failed' && parsed.errorMessage) {
      patch.error_message = parsed.errorMessage;
    }

    if (parsed.externalBuildId && !matchedJob.external_build_id) {
      patch.external_build_id = parsed.externalBuildId;
    }

    const { error: updateError } = await supabase.from('unity_build_jobs').update(patch).eq('id', matchedJob.id);
    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    const projectStatus = mapProjectStatus(status);
    if (projectStatus) {
      await supabase.from('unity_game_projects').update({ status: projectStatus }).eq('id', matchedJob.unity_game_project_id);
    }

    if (status === 'succeeded' && parsed.artifactUrl) {
      const { data: project } = await supabase
        .from('unity_game_projects')
        .select('id, package_name')
        .eq('id', matchedJob.unity_game_project_id)
        .maybeSingle<UnityGameProjectRow>();

      const fileName = `${project?.package_name?.trim() || 'game'}.aab`;
      const artifactPayload = {
        unity_game_project_id: matchedJob.unity_game_project_id,
        build_job_id: matchedJob.id,
        artifact_type: 'aab',
        file_url: parsed.artifactUrl,
        file_name: fileName,
        file_size_bytes: null
      };

      let artifactResult = await supabase.from('game_artifacts').upsert(artifactPayload, { onConflict: 'build_job_id,artifact_type' });
      if (artifactResult.error && artifactResult.error.message.toLowerCase().includes('build_job_id')) {
        const fallbackPayload = {
          unity_game_project_id: matchedJob.unity_game_project_id,
          artifact_type: 'aab',
          file_url: parsed.artifactUrl,
          file_name: fileName,
          file_size_bytes: null
        };

        artifactResult = await supabase.from('game_artifacts').upsert(fallbackPayload, { onConflict: 'unity_game_project_id,artifact_type,file_url' });
      }

      if (artifactResult.error) {
        console.warn('[unity-build-callback] game_artifacts upsert skipped', {
          jobId: matchedJob.id,
          message: artifactResult.error.message
        });
      }
    }

    return NextResponse.json({ ok: true, updated: true, matchedBy, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
