import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBuildStatus } from '@/lib/unity-bridge';

type GameBuildJob = {
  id: string;
  status: string | null;
  external_build_id: string | null;
  build_target_id: string | null;
  artifact_url: string | null;
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

export async function POST(_request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params;

    if (!jobId?.trim()) {
      return NextResponse.json({ ok: false, error: 'jobId zorunlu.' }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    const { data: buildJob, error: buildJobError } = await supabase
      .from('game_build_jobs')
      .select('id, status, external_build_id, build_target_id, artifact_url')
      .eq('id', jobId)
      .maybeSingle<GameBuildJob>();

    if (buildJobError) {
      return NextResponse.json({ ok: false, error: buildJobError.message }, { status: 500 });
    }

    if (!buildJob) {
      return NextResponse.json({ ok: false, error: 'Build kaydı bulunamadı.' }, { status: 404 });
    }

    if (!buildJob.external_build_id?.trim() || !buildJob.build_target_id?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Build kaydında external_build_id veya build_target_id eksik.' },
        { status: 400 }
      );
    }

    const buildNumber = Number(buildJob.external_build_id);
    if (!Number.isFinite(buildNumber)) {
      return NextResponse.json({ ok: false, error: 'external_build_id geçerli bir sayı değil.' }, { status: 400 });
    }

    const unityStatus = await getBuildStatus(buildJob.build_target_id, buildNumber);

    const patch: Record<string, string | null> = { status: unityStatus.status };

    if (unityStatus.status === 'success') {
      patch.artifact_url = unityStatus.links?.download_primary?.href ?? buildJob.artifact_url ?? null;
      patch.finished_at = unityStatus.finished ?? new Date().toISOString();
      patch.error_message = null;
    } else if (unityStatus.status === 'failure') {
      patch.finished_at = unityStatus.finished ?? new Date().toISOString();
      patch.error_message = 'Unity Build Automation build başarısız döndü.';
    }

    const { error: updateError } = await supabase
      .from('game_build_jobs')
      .update(patch)
      .eq('id', jobId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status: patch.status,
      artifact_url: patch.artifact_url ?? buildJob.artifact_url,
      finished_at: patch.finished_at ?? null,
      error_message: patch.error_message ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
