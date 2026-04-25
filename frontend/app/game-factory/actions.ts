'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { tryParseEncryptedCredentials, decryptCredentials } from '@/lib/credentials-encryption';
import { GitHubUnityRepoProvider } from '@/lib/game-factory/providers/github-unity-repo-provider';
import { UnityCloudBuildProvider } from '@/lib/game-factory/providers/unity-cloud-build-provider';
import { GooglePlayPublisherProvider } from '@/lib/game-factory/providers/google-play-publisher-provider';

function actionableErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string' && error.trim().length > 0) return error;
  return fallback;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'oyun'
  );
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  return { supabase, user };
}

async function getOwnedProject(projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase.from('game_projects').select('*').eq('id', projectId).eq('user_id', userId).maybeSingle();
  return project;
}

export async function createGameProjectAction(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const name = String(formData.get('name') ?? '').trim();
  const gameType = String(formData.get('game_type') ?? 'runner_2d').trim();
  const prompt = String(formData.get('prompt') ?? '').trim();
  const packageNameInput = String(formData.get('package_name') ?? '').trim();

  if (!name || !prompt) return;

  const slug = slugify(name);
  const packageName = packageNameInput || `com.koschei.generated.${slug.replace(/-/g, '')}`;

  const { data: inserted } = await supabase
    .from('game_projects')
    .insert({
      user_id: user.id,
      name,
      slug,
      game_type: gameType,
      target_platform: 'android',
      package_name: packageName,
      product_name: name,
      unity_branch: 'main',
      release_track: 'production'
    })
    .select('id')
    .single();

  if (!inserted) return;

  await supabase.from('game_briefs').insert({
    game_project_id: inserted.id,
    prompt,
    generated_summary: `${name} için prompt tabanlı oyun üretim özeti oluşturuldu.`,
    gameplay_goals: ['Hızlı öğrenilen kontrol', 'Mobil odaklı seans', 'Tek dokunuşla oynanış'],
    controls: 'Dokunmatik',
    store_short_description: `${name} ile Android için oyun deneyimi.`,
    store_full_description: `${prompt}\n\nBu proje Game Factory üretim hattı için hazırlanmıştır.`,
    release_notes: 'İlk üretim sürümü'
  });

  revalidatePath('/game-factory');
  redirect(`/game-factory/${inserted.id}`);
}

export async function createGameAction(formData: FormData) {
  return createGameProjectAction(formData);
}

export async function generateGameAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  const { data: brief } = await supabase
    .from('game_briefs')
    .select('*')
    .eq('game_project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!brief) return;

  const { data: generationJob } = await supabase
    .from('game_generation_jobs')
    .insert({
      game_project_id: project.id,
      status: 'queued',
      prompt: brief.prompt
    })
    .select('id')
    .single();
  if (!generationJob) {
    await supabase.from('game_projects').update({ status: 'failed' }).eq('id', project.id).eq('user_id', user.id);
    revalidatePath(`/game-factory/${project.id}`);
    redirect(`/game-factory/${project.id}`);
  }

  const startedAt = new Date().toISOString();
  await supabase.from('game_projects').update({ status: 'generating' }).eq('id', project.id).eq('user_id', user.id);
  await supabase.from('game_generation_jobs').update({ status: 'running', started_at: startedAt }).eq('id', generationJob.id);

  try {
    const provider = new GitHubUnityRepoProvider();
    const files = await provider.generateUnityProjectFiles(project, brief);
    const output = {
      generatedFiles: files.map((file) => ({ path: file.path, bytes: Buffer.byteLength(file.content, 'utf8') })),
      generatedAt: new Date().toISOString()
    };

    await supabase
      .from('game_briefs')
      .update({
        generated_summary: `Unity dosyaları üretime hazırlandı (${files.length} dosya).`
      })
      .eq('id', brief.id);

    await supabase.from('game_generation_jobs').update({ status: 'succeeded', output, finished_at: new Date().toISOString(), error_message: null }).eq('id', generationJob.id);
    await supabase.from('game_projects').update({ status: 'generated' }).eq('id', project.id).eq('user_id', user.id);
  } catch (error) {
    const errorMessage = actionableErrorMessage(error, 'Unity dosyaları üretilemedi.');
    await supabase
      .from('game_generation_jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        finished_at: new Date().toISOString()
      })
      .eq('id', generationJob.id);
    await supabase.from('game_projects').update({ status: 'failed' }).eq('id', project.id).eq('user_id', user.id);
  }

  revalidatePath(`/game-factory/${project.id}`);
  redirect(`/game-factory/${project.id}`);
}

export async function commitUnityRepoAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  const { data: brief } = await supabase.from('game_briefs').select('*').eq('game_project_id', project.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!brief) return;

  await supabase.from('game_projects').update({ status: 'committing' }).eq('id', project.id).eq('user_id', user.id);

  try {
    const provider = new GitHubUnityRepoProvider();
    const files = await provider.generateUnityProjectFiles(project, brief);
    const commit = await provider.commitUnityProjectChanges(project, files);

    await supabase
      .from('game_projects')
      .update({
        status: 'ready_for_build',
        unity_commit_sha: commit.commitSha,
        unity_repo_owner: process.env.GITHUB_UNITY_REPO_OWNER ?? null,
        unity_repo_name: process.env.GITHUB_UNITY_REPO_NAME ?? null
      })
      .eq('id', project.id)
      .eq('user_id', user.id);
  } catch (error) {
    const errorMessage = actionableErrorMessage(error, 'Unity repo güncellenemedi.');
    await supabase
      .from('game_generation_jobs')
      .update({ status: 'failed', error_message: errorMessage, finished_at: new Date().toISOString() })
      .eq('game_project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1);
    await supabase.from('game_projects').update({ status: 'failed' }).eq('id', project.id).eq('user_id', user.id);
  }

  revalidatePath(`/game-factory/${project.id}`);
  redirect(`/game-factory/${project.id}`);
}

export async function triggerBuildAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  try {
    const provider = new UnityCloudBuildProvider();
    const trigger = await provider.triggerBuild(project);

    await supabase.from('game_projects').update({ status: 'building' }).eq('id', project.id).eq('user_id', user.id);

    await supabase.from('game_build_jobs').insert({
      game_project_id: project.id,
      provider: 'unity_cloud',
      external_build_id: trigger.externalBuildId,
      status: trigger.status,
      branch: project.unity_branch,
      commit_sha: project.unity_commit_sha,
      version_code: project.current_version_code,
      version_name: project.current_version_name,
      started_at: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = actionableErrorMessage(error, 'Build başlatılamadı.');
    await supabase.from('game_projects').update({ status: 'build_failed' }).eq('id', project.id).eq('user_id', user.id);
    await supabase.from('game_build_jobs').insert({
      game_project_id: project.id,
      provider: 'unity_cloud',
      status: 'failed',
      error_message: errorMessage,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString()
    });
  }

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/builds`);
  redirect(`/game-factory/${project.id}`);
}

export async function startBuildAction(projectId: string) {
  return triggerBuildAction(projectId);
}

type GameFactoryPrimaryActionKey =
  | 'generate'
  | 'commit'
  | 'building_message'
  | 'start_build'
  | 'refresh_build'
  | 'download_aab'
  | 'missing_aab'
  | 'release_page'
  | 'approve_release'
  | 'publishing_release'
  | 'retry_on_release_page'
  | 'published_details';

export async function resolveGameFactoryPrimaryAction(projectId: string, userId: string): Promise<GameFactoryPrimaryActionKey> {
  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase.from('game_projects').select('id, status').eq('id', projectId).eq('user_id', userId).maybeSingle();
  if (!project) return 'generate';

  if (project.status === 'draft' || project.status === 'brief_created') return 'generate';
  if (project.status === 'generated') return 'commit';
  if (project.status === 'committing') return 'building_message';
  if (project.status === 'ready_for_build') return 'start_build';
  if (project.status === 'building') return 'refresh_build';
  if (project.status === 'release_ready') return 'release_page';
  if (project.status === 'awaiting_user_approval') return 'approve_release';
  if (project.status === 'publishing') return 'publishing_release';
  if (project.status === 'publish_failed') return 'retry_on_release_page';
  if (project.status === 'published') return 'published_details';
  if (project.status === 'build_failed') return 'start_build';

  if (project.status === 'build_succeeded') {
    const { data: artifact } = await supabase
      .from('game_artifacts')
      .select('id')
      .eq('game_project_id', project.id)
      .eq('artifact_type', 'aab')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return artifact ? 'download_aab' : 'missing_aab';
  }

  return 'commit';
}

export async function advanceGameFactoryProjectAction(projectId: string) {
  const { user } = await getCurrentUser();
  const next = await resolveGameFactoryPrimaryAction(projectId, user.id);

  if (next === 'generate') return generateGameAction(projectId);
  if (next === 'commit') return commitUnityRepoAction(projectId);
  if (next === 'start_build') return startBuildAction(projectId);
  if (next === 'refresh_build' || next === 'missing_aab') return refreshBuildStatusAction(projectId);
  if (next === 'approve_release') return approveReleaseAction(projectId);

  redirect(`/game-factory/${projectId}`);
}

export async function refreshBuildStatusAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  const { data: buildJob } = await supabase
    .from('game_build_jobs')
    .select('*')
    .eq('game_project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!buildJob) return;

  try {
    const provider = new UnityCloudBuildProvider();
    const status = await provider.getBuildStatus(buildJob);

    await supabase
      .from('game_build_jobs')
      .update({
        status: status.status,
        logs_url: status.logsUrl ?? null,
        error_message: status.errorMessage ?? null,
        started_at: status.startedAt ?? buildJob.started_at,
        finished_at: status.finishedAt ?? (status.status === 'succeeded' || status.status === 'failed' ? new Date().toISOString() : null)
      })
      .eq('id', buildJob.id);

    if (status.status === 'succeeded') {
      const artifacts = await provider.getArtifacts(buildJob);
      for (const artifact of artifacts) {
        await supabase.from('game_artifacts').insert({
          game_project_id: project.id,
          build_job_id: buildJob.id,
          artifact_type: artifact.artifactType,
          file_name: artifact.fileName ?? null,
          file_url: artifact.fileUrl ?? null,
          file_size_bytes: artifact.fileSizeBytes ?? null
        });
      }

      await supabase.from('game_projects').update({ status: 'build_succeeded' }).eq('id', project.id).eq('user_id', user.id);
    }

    if (status.status === 'failed' || status.status === 'canceled') {
      await supabase.from('game_projects').update({ status: 'build_failed' }).eq('id', project.id).eq('user_id', user.id);
    }
  } catch (error) {
    const errorMessage = actionableErrorMessage(error, 'Build durumu alınamadı.');
    await supabase
      .from('game_build_jobs')
      .update({ status: 'failed', error_message: errorMessage, finished_at: new Date().toISOString() })
      .eq('id', buildJob.id);
    await supabase.from('game_projects').update({ status: 'build_failed' }).eq('id', project.id).eq('user_id', user.id);
  }

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/builds`);
  redirect(`/game-factory/${project.id}`);
}

export async function prepareReleaseAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  const { data: buildJob } = await supabase
    .from('game_build_jobs')
    .select('*')
    .eq('game_project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: artifact } = await supabase
    .from('game_artifacts')
    .select('*')
    .eq('game_project_id', project.id)
    .eq('artifact_type', 'aab')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: brief } = await supabase.from('game_briefs').select('*').eq('game_project_id', project.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

  try {
    await supabase.from('game_projects').update({ status: 'release_preparing' }).eq('id', project.id).eq('user_id', user.id);

    await supabase.from('game_release_jobs').insert({
      game_project_id: project.id,
      build_job_id: buildJob?.id ?? null,
      artifact_id: artifact?.id ?? null,
      package_name: project.package_name,
      track: project.release_track,
      status: 'awaiting_user_approval',
      version_code: buildJob?.version_code ?? project.current_version_code,
      version_name: buildJob?.version_name ?? project.current_version_name,
      release_name: `${project.name} ${project.current_version_name}`,
      release_notes: brief?.release_notes ?? 'Yayın hazırlığı oluşturuldu.',
      user_approved_at: null
    });

    await supabase.from('game_projects').update({ status: 'awaiting_user_approval' }).eq('id', project.id).eq('user_id', user.id);
  } catch (error) {
    const errorMessage = actionableErrorMessage(error, 'Yayın hazırlığı oluşturulamadı.');
    await supabase.from('game_projects').update({ status: 'publish_failed' }).eq('id', project.id).eq('user_id', user.id);
    await supabase.from('game_release_jobs').insert({
      game_project_id: project.id,
      build_job_id: buildJob?.id ?? null,
      artifact_id: artifact?.id ?? null,
      package_name: project.package_name,
      track: project.release_track,
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    });
  }

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/release`);
  redirect(`/game-factory/${project.id}`);
}

export async function approveReleaseAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  try {
    await supabase
      .from('game_release_jobs')
      .update({ status: 'preparing', user_approved_at: new Date().toISOString() })
      .eq('game_project_id', project.id)
      .eq('status', 'awaiting_user_approval');
    await supabase.from('game_projects').update({ status: 'release_ready' }).eq('id', project.id).eq('user_id', user.id);
  } catch (error) {
    const errorMessage = actionableErrorMessage(error, 'Yayın onayı kaydedilemedi.');
    await supabase.from('game_projects').update({ status: 'publish_failed' }).eq('id', project.id).eq('user_id', user.id);
    await supabase
      .from('game_release_jobs')
      .update({ status: 'failed', error_message: errorMessage, completed_at: new Date().toISOString() })
      .eq('game_project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1);
  }

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/release`);
  redirect(`/game-factory/${project.id}`);
}

export async function setProjectGooglePlayIntegrationAction(projectId: string, formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  const integrationId = String(formData.get('google_play_integration_id') ?? '').trim();
  if (!integrationId) return;

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('id, default_track')
    .eq('id', integrationId)
    .eq('user_id', user.id)
    .eq('provider', 'google_play')
    .maybeSingle();

  if (!integration) {
    throw new Error('Seçilen Google Play bağlantısı bulunamadı.');
  }

  await supabase
    .from('game_projects')
    .update({
      google_play_integration_id: integration.id,
      release_track: integration.default_track ?? project.release_track
    })
    .eq('id', project.id)
    .eq('user_id', user.id);

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/release`);
  redirect(`/game-factory/${project.id}`);
}

export async function publishReleaseAction(projectId: string, formData: FormData) {
  const confirmation = String(formData.get('confirm_publish') ?? 'no');
  if (confirmation !== 'yes') redirect(`/game-factory/${projectId}`);

  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;
  let releaseJobId: string | null = null;
  try {
    const { data: releaseJob } = await supabase
      .from('game_release_jobs')
      .select('*')
      .eq('game_project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    releaseJobId = releaseJob?.id ?? null;

    const { data: artifact } = await supabase
      .from('game_artifacts')
      .select('*')
      .eq('game_project_id', project.id)
      .eq('artifact_type', 'aab')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!releaseJob || !artifact?.file_url) {
      throw new Error('Yayın için gerekli release kaydı veya AAB artifact bulunamadı.');
    }

    if (!releaseJob.user_approved_at) {
      throw new Error('Yayın için önce kullanıcı onayı verilmelidir.');
    }

    if (!project.google_play_integration_id) {
      throw new Error('Yayınlamak için Google Play bağlantısı gerekli.');
    }

    const { data: integration } = await supabase
      .from('user_integrations')
      .select('id, encrypted_credentials, default_track, status')
      .eq('id', project.google_play_integration_id)
      .eq('user_id', user.id)
      .eq('provider', 'google_play')
      .maybeSingle();

    if (!integration || integration.status !== 'connected') {
      throw new Error('Seçili Google Play bağlantısı kullanılamıyor.');
    }

    const encryptedPayload = tryParseEncryptedCredentials(integration.encrypted_credentials);
    if (!encryptedPayload) {
      throw new Error('Google Play kimlik bilgileri çözümlenemedi.');
    }

    const serviceAccountJson = decryptCredentials(encryptedPayload);
    const track = releaseJob.track || integration.default_track || project.release_track;

    await supabase.from('game_projects').update({ status: 'publishing' }).eq('id', project.id).eq('user_id', user.id);
    await supabase.from('game_release_jobs').update({ status: 'uploading', submitted_at: new Date().toISOString(), track }).eq('id', releaseJob.id);

    const provider = new GooglePlayPublisherProvider();
    const result = await provider.publishRelease({
      packageName: project.package_name,
      track,
      releaseNotes: releaseJob.release_notes ?? 'Game Factory yayın güncellemesi',
      aabFileUrl: artifact.file_url,
      serviceAccountJson,
      versionCode: releaseJob.version_code,
      versionName: releaseJob.version_name
    });

    if (result.status === 'published') {
      await supabase
        .from('game_release_jobs')
        .update({
          status: 'published',
          edit_id: result.editId ?? null,
          completed_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', releaseJob.id);
      await supabase.from('game_projects').update({ status: 'published' }).eq('id', project.id).eq('user_id', user.id);
    } else {
      await supabase
        .from('game_release_jobs')
        .update({
          status: result.status,
          edit_id: result.editId ?? null,
          error_message: result.errorMessage ?? 'Yayınlama hatası',
          completed_at: new Date().toISOString()
        })
        .eq('id', releaseJob.id);
      await supabase.from('game_projects').update({ status: 'publish_failed' }).eq('id', project.id).eq('user_id', user.id);
    }
  } catch (error) {
    const errorMessage = actionableErrorMessage(error, 'Yayın akışı başarısız oldu.');
    const blocked = /permission|account|policy|production|package|insufficient|forbidden|play console/i.test(errorMessage);
    const targetReleaseJobId =
      releaseJobId ??
      (
        await supabase
          .from('game_release_jobs')
          .select('id')
          .eq('game_project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data?.id ??
      null;
    if (targetReleaseJobId) {
      await supabase
        .from('game_release_jobs')
        .update({
          status: blocked ? 'blocked_by_platform_requirement' : 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        })
        .eq('id', targetReleaseJobId);
    }
    await supabase.from('game_projects').update({ status: 'publish_failed' }).eq('id', project.id).eq('user_id', user.id);
  }

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/release`);
  redirect(`/game-factory/${project.id}`);
}

export async function updateReleaseNotesAction(projectId: string, formData: FormData) {
  const releaseNotes = String(formData.get('release_notes') ?? '').trim();
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  const { data: releaseJob } = await supabase
    .from('game_release_jobs')
    .select('id')
    .eq('game_project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!releaseJob) return;

  await supabase.from('game_release_jobs').update({ release_notes: releaseNotes }).eq('id', releaseJob.id);
  revalidatePath(`/game-factory/${project.id}/release`);
}
