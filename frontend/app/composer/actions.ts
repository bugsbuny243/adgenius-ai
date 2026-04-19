'use server';

import { revalidatePath } from 'next/cache';
import { getAppContextOrRedirect } from '@/lib/app-context';

type Platform = 'youtube';

const SUPPORTED_STATUS_VALUES = ['draft', 'queued', 'processing', 'published', 'failed'] as const;

function buildVariants(brief: string, platforms: Platform[]) {
  const cleanBrief = brief.trim();
  return {
    youtubeTitle: `🎯 ${cleanBrief.slice(0, 58)}`,
    youtubeDescription: `${cleanBrief}\n\nBu içerik AI motoru ile planlandı. #icerik`,
    platforms
  };
}

function buildPublishPayload(input: {
  brief: string;
  platform: Platform;
  variants: ReturnType<typeof buildVariants>;
  runId: string;
  contentItemId: string;
  savedOutputId: string;
  projectId: string | null;
}) {
  const payload: Record<string, unknown> = {
    brief: input.brief,
    platform: input.platform,
    run_id: input.runId,
    content_item_id: input.contentItemId,
    saved_output_id: input.savedOutputId,
    project_id: input.projectId,
    source: 'composer'
  };

  if (input.platform === 'youtube') {
    payload.youtube_title = input.variants.youtubeTitle;
    payload.youtube_description = input.variants.youtubeDescription;
  }

  return payload;
}

export async function createContentJobAction(formData: FormData) {
  const brief = String(formData.get('brief') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim() || null;
  const selectedPlatforms: Platform[] = ['youtube'];

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
      user_id: userId,
      status: 'completed',
      model_name: 'default',
      user_input: brief,
      metadata: {
        project_id: projectId
      },
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
      instagram_caption: null,
      tiktok_caption: null,
      run_id: run.id,
      saved_output_id: saved.id,
      status: 'draft'
    })
    .select('id')
    .single();

  if (contentItemError || !contentItem) {
    throw new Error(`İçerik kaydı oluşturulamadı: ${contentItemError?.message ?? 'bilinmeyen hata'}`);
  }

  const insertResults = await Promise.all(
    selectedPlatforms.map((platform) =>
      supabase.from('publish_jobs').insert({
        workspace_id: workspace.workspaceId,
        project_id: projectId,
        content_output_id: contentItem.id,
        target_platform: platform,
        status: 'draft',
        queued_at: queuedAt,
        payload: buildPublishPayload({
          brief,
          platform,
          variants,
          runId: run.id,
          contentItemId: contentItem.id,
          savedOutputId: saved.id,
          projectId
        })
      })
    )
  );

  const queueError = insertResults.find((result) => result.error)?.error;
  if (queueError) {
    throw new Error(`Yayın kuyruğuna eklenemedi: ${queueError.message}`);
  }

  revalidatePath('/composer');
  revalidatePath('/dashboard');
  revalidatePath('/runs');
  revalidatePath('/saved');
}

export async function updatePublishStatusAction(formData: FormData) {
  const jobId = String(formData.get('job_id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();

  if (!jobId || !SUPPORTED_STATUS_VALUES.includes(status as (typeof SUPPORTED_STATUS_VALUES)[number])) {
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
