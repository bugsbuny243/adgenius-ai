'use server';

import { revalidatePath } from 'next/cache';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { runTextWithAiEngine } from '@/lib/ai-engine';
import { createSocialPublishPayload, normalizeSocialContentDraft, type SocialPlatform } from '@/lib/social-content';

const SUPPORTED_STATUS_VALUES = ['queued', 'preparing', 'waiting_for_approval', 'published', 'failed', 'draft', 'processing'] as const;
const PLATFORM_SET = new Set<SocialPlatform>(['youtube', 'instagram', 'tiktok']);

function pickPlatforms(formData: FormData): SocialPlatform[] {
  return formData
    .getAll('platforms')
    .map((item) => String(item).toLowerCase().trim())
    .filter((item): item is SocialPlatform => PLATFORM_SET.has(item as SocialPlatform));
}

async function generateComposerDraft(input: { brief: string; contentType: string; agentType: string; platforms: SocialPlatform[] }) {
  const aiPrompt = [
    `Ajan tipi: ${input.agentType}`,
    `İçerik türü: ${input.contentType}`,
    `Platformlar: ${input.platforms.join(', ')}`,
    `Brief: ${input.brief}`,
    '',
    'Sadece JSON döndür. Alanlar: brief, platforms, youtube_title, youtube_description, instagram_caption, tiktok_caption.'
  ].join('\n');

  const aiRun = await runTextWithAiEngine({
    agentSlug: 'youtube_agent',
    agentMode: 'script',
    userInput: aiPrompt,
    systemPrompt: 'Türkçe sosyal medya içerik taslağı üret. Marka güvenli, doğal ve aksiyona yönlendiren dil kullan.'
  });

  const draft = normalizeSocialContentDraft({
    sourceBrief: input.brief,
    sourcePlatforms: input.platforms,
    rawText: aiRun.text
  });

  return {
    draft,
    aiResultText: aiRun.text,
    modelAlias: aiRun.alias,
    usage: aiRun.usage
  };
}

export async function createContentJobAction(formData: FormData) {
  const brief = String(formData.get('brief') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim() || null;
  const contentType = String(formData.get('content_type') ?? 'Sosyal içerik').trim() || 'Sosyal içerik';
  const agentType = String(formData.get('agent_type') ?? 'Koschei Composer').trim() || 'Koschei Composer';
  const platforms = pickPlatforms(formData);

  if (!brief || platforms.length === 0) {
    return;
  }

  const { supabase, userId, workspace } = await getAppContextOrRedirect();

  let generated;
  try {
    generated = await generateComposerDraft({ brief, contentType, agentType, platforms });
  } catch {
    throw new Error('AI sağlayıcısı geçici olarak yanıt veremedi. Lütfen tekrar deneyin.');
  }
  const draft = generated.draft;
  const queuedAt = new Date().toISOString();

  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      workspace_id: workspace.workspaceId,
      user_id: userId,
      status: 'completed',
      model_name: generated.modelAlias,
      user_input: brief,
      metadata: {
        project_id: projectId,
        source: 'composer',
        content_type: contentType,
        agent_type: agentType,
        token_usage: generated.usage
      },
      result_text: generated.aiResultText,
      completed_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (runError || !run) throw new Error(`İçerik kaydedilemedi: ${runError?.message ?? 'bilinmeyen hata'}`);

  const { data: saved, error: savedError } = await supabase
    .from('saved_outputs')
    .insert({
      workspace_id: workspace.workspaceId,
      project_id: projectId,
      user_id: userId,
      agent_run_id: run.id,
      title: `Composer çıktısı • ${new Date().toLocaleString('tr-TR')}`,
      content: JSON.stringify(draft, null, 2),
      metadata: {
        source: 'composer'
      }
    })
    .select('id')
    .single();
  if (savedError || !saved) throw new Error(`Kaydedilen çıktı oluşturulamadı: ${savedError?.message ?? 'bilinmeyen hata'}`);

  const { data: contentItem, error: contentItemError } = await supabase
    .from('content_items')
    .insert({
      workspace_id: workspace.workspaceId,
      project_id: projectId,
      user_id: userId,
      brief: draft.brief,
      platforms,
      youtube_title: draft.youtubeTitle,
      youtube_description: draft.youtubeDescription,
      instagram_caption: draft.instagramCaption,
      tiktok_caption: draft.tiktokCaption,
      run_id: run.id,
      saved_output_id: saved.id,
      status: 'draft'
    })
    .select('id')
    .single();
  if (contentItemError || !contentItem) throw new Error(`İçerik kaydı oluşturulamadı: ${contentItemError?.message ?? 'bilinmeyen hata'}`);

  const insertResults = await Promise.all(
    platforms.map((platform) =>
      supabase.from('publish_jobs').insert({
        workspace_id: workspace.workspaceId,
        project_id: projectId,
        content_output_id: contentItem.id,
        target_platform: platform,
        status: platform === 'youtube' ? 'queued' : 'preparing',
        queued_at: queuedAt,
        payload: {
          ...createSocialPublishPayload(draft, platform),
          run_id: run.id,
          content_item_id: contentItem.id,
          saved_output_id: saved.id,
          project_id: projectId,
          source: 'composer',
          delivery_mode: platform === 'youtube' ? 'connector_or_manual' : 'manual_preparation'
        }
      })
    )
  );

  const queueError = insertResults.find((result) => result.error)?.error;
  if (queueError) throw new Error(`Yayın kuyruğuna eklenemedi: ${queueError.message}`);

  revalidatePath('/composer');
  revalidatePath('/publish-queue');
  revalidatePath('/dashboard');
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
  revalidatePath('/publish-queue');
}
