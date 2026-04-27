import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBuildStatus } from '@/lib/server/unity-cloud-build';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const { data: jobs } = await supabase
    .from('unity_build_jobs')
    .select('*')
    .in('status', ['queued', 'started']);

  if (!jobs?.length) {
    return NextResponse.json({ message: 'Aktif build yok' });
  }

  const results = [];
  for (const job of jobs) {
    const targetId = job.metadata?.unityBuildTargetId || 'android-aab-release';
    const buildNum = job.metadata?.unityBuildNumber || 0;

    const status = await getBuildStatus(targetId, buildNum);

    await supabase
      .from('unity_build_jobs')
      .update({
        status: status.status,
        artifact_url: status.links?.download_primary?.href || null,
        finished_at: status.status === 'success' ? new Date().toISOString() : null
      })
      .eq('id', job.id);

    results.push({ id: job.id, newStatus: status.status });
  }

  return NextResponse.json({ success: true, results });
}
