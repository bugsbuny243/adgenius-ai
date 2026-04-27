import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBuildStatus, type UnityBuildStatus } from '@/lib/unity-bridge';

type BuildJobRow = {
  id: string;
  status: string | null;
  artifact_url: string | null;
  unity_game_project_id: string | null;
  metadata: { unityBuildNumber?: number; unityBuildTargetId?: string } | null;
};

type RefreshRequest = {
  jobId?: string;
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

function mapUnityStatusToDbStatus(status: UnityBuildStatus): string {
  if (status === 'queued') return 'queued';
  if (status === 'sentToBuilder' || status === 'started' || status === 'restarted') return 'running';
  if (status === 'success') return 'succeeded';
  if (status === 'failure') return 'failed';
  if (status === 'canceled') return 'cancelled';
  return 'running';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RefreshRequest;
    const jobId = body.jobId?.trim();

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId zorunlu.' }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    const { data: job, error: jobError } = await supabase
      .from('unity_build_jobs')
      .select('id, status, artifact_url, unity_game_project_id, metadata')
      .eq('id', jobId)
      .maybeSingle<BuildJobRow>();

    if (jobError) {
      return NextResponse.json({ success: false, error: jobError.message }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ success: false, error: 'Build kaydı bulunamadı.' }, { status: 404 });
    }

    if (!job.unity_game_project_id) {
      return NextResponse.json({ success: false, error: 'Kaydın unity_game_project_id alanı boş.' }, { status: 400 });
    }

    const buildNumber = job.metadata?.unityBuildNumber;
    const buildTargetId = job.metadata?.unityBuildTargetId?.trim();

    if (typeof buildNumber !== 'number' || !Number.isInteger(buildNumber) || buildNumber < 1 || !buildTargetId) {
      return NextResponse.json({ success: false, error: 'Unity build bilgisi eksik.' }, { status: 400 });
    }

    const unityStatus = await getBuildStatus(buildTargetId, buildNumber);
    const nextStatus = mapUnityStatusToDbStatus(unityStatus.status);

    const patch: Record<string, string | null> = {
      status: nextStatus,
      artifact_url: job.artifact_url,
      finished_at: null
    };

    if (unityStatus.status === 'success') {
      patch.artifact_url = unityStatus.links?.download_primary?.href ?? job.artifact_url ?? null;
      patch.finished_at = unityStatus.finished ?? new Date().toISOString();
    } else if (unityStatus.status === 'failure' || unityStatus.status === 'canceled') {
      patch.finished_at = unityStatus.finished ?? new Date().toISOString();
    }

    const { error: updateError } = await supabase.from('unity_build_jobs').update(patch).eq('id', jobId);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newStatus: patch.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
