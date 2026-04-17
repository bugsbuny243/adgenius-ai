'use server';

import { revalidatePath } from 'next/cache';
import { getAppContextOrRedirect } from '@/lib/app-context';

type Platform = 'youtube' | 'instagram' | 'tiktok';

function buildVariants(brief: string, platforms: Platform[]) {
  const cleanBrief = brief.trim();
  return {
    youtubeTitle: `🎯 ${cleanBrief.slice(0, 58)}`,
    youtubeDescription: `${cleanBrief}\n\nBu içerik AI motoru ile planlandı. #icerik`,
    instagramCaption: `${cleanBrief}\n\n#icerik #instagram`,
    tiktokCaption: `${cleanBrief.slice(0, 120)} #icerik #tiktok`,
    platforms
  };
}

export async function createContentJobAction(formData: FormData) {
  const brief = String(formData.get('brief') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim() || null;
  const selectedPlatforms = formData.getAll('platforms').map((value) => String(value)) as Platform[];

  if (!brief || selectedPlatforms.length === 0) {
    return;
  }

  const { supabase, userId, workspace } = await getAppContextOrRedirect();
  const variants = buildVariants(brief, selectedPlatforms);
  const queuedAt = new Date().toISOString();

  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      workspace_id: workspace.workspaceId,
      project_id: projectId,
      user_id: userId,
      status: 'completed',
      model_name: 'default',
      user_input: brief,
      result_text: JSON.stringify(variants, null, 2),
      completed_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (runError || !run) {
    throw new Error(`İçerik çalıştırması kaydedilemedi: ${runError?.message ?? 'bilinmeyen hata'}`);
  }

  const title = `İçerik işi • ${new Date().toLocaleString('tr-TR')}`;

  const { data: saved, error: savedError } = await supabase
    .from('saved_outputs')
    .insert({
      workspace_id: workspace.workspaceId,
      project_id: projectId,
      user_id: userId,
      agent_run_id: run.id,
      title,
      content: JSON.stringify(variants, null, 2)
    })
    .select('id')
    .single();

  if (savedError || !saved) {
    throw new Error(`Kaydedilen çıktı oluşturulamadı: ${savedError?.message ?? 'bilinmeyen hata'}`);
  }

  const { data: contentItem, error: contentItemError } = await supabase
    .from('content_items')
    .insert({
      workspace_id: workspace.workspaceId,
      project_id: projectId,
      user_id: userId,
      brief,
      platforms: selectedPlatforms,
      youtube_title: variants.youtubeTitle,
      youtube_description: variants.youtubeDescription,
      instagram_caption: variants.instagramCaption,
      tiktok_caption: variants.tiktokCaption,
      run_id: run.id,
      saved_output_id: saved.id,
      status: 'draft'
    })
    .select('id')
    .single();

  if (contentItemError || !contentItem) {
    throw new Error(`İçerik kaydı oluşturulamadı: ${contentItemError?.message ?? 'bilinmeyen hata'}`);
  }

  await Promise.all(
    selectedPlatforms.map((platform) =>
      supabase.from('publish_jobs').insert({
        workspace_id: workspace.workspaceId,
        project_id: projectId,
        content_output_id: contentItem.id,
        target_platform: platform,
        status: 'draft',
        queued_at: queuedAt,
        payload: {
          brief,
          platform,
          variants
        }
      })
    )
  );

  revalidatePath('/composer');
  revalidatePath('/dashboard');
  revalidatePath('/runs');
  revalidatePath('/saved');
}

export async function updatePublishStatusAction(formData: FormData) {
  const jobId = String(formData.get('job_id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();

  if (!jobId || !['draft', 'queued', 'failed'].includes(status)) {
    return;
  }

  const { supabase, workspace } = await getAppContextOrRedirect();

  await supabase
    .from('publish_jobs')
    .update({
      status
    })
    .eq('workspace_id', workspace.workspaceId)
    .eq('id', jobId);

  revalidatePath('/composer');
}
