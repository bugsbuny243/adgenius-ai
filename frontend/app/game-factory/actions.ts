'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { GitHubUnityRepoProvider } from '@/lib/game-factory/providers/github-unity-repo-provider';
import { UnityCloudBuildProvider } from '@/lib/game-factory/providers/unity-cloud-build-provider';
import { GooglePlayPublisherProvider } from '@/lib/game-factory/providers/google-play-publisher-provider';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'oyun';
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

  await supabase.from('game_projects').update({ status: 'generating' }).eq('id', project.id).eq('user_id', user.id);

  const provider = new GitHubUnityRepoProvider();
  const files = await provider.generateUnityProjectFiles(project, brief);

  await supabase
    .from('game_briefs')
    .update({
      generated_summary: `Unity dosyaları üretime hazırlandı (${files.length} dosya).`
    })
    .eq('id', brief.id);

  await supabase.from('game_projects').update({ status: 'generated' }).eq('id', project.id).eq('user_id', user.id);

  revalidatePath(`/game-factory/${project.id}`);
}

export async function commitUnityRepoAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  const { data: brief } = await supabase.from('game_briefs').select('*').eq('game_project_id', project.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!brief) return;

  await supabase.from('game_projects').update({ status: 'committing' }).eq('id', project.id).eq('user_id', user.id);

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

  revalidatePath(`/game-factory/${project.id}`);
}

export async function triggerBuildAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

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

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/builds`);
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

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/builds`);
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
    release_notes: brief?.release_notes ?? 'Yayın hazırlığı oluşturuldu.'
  });

  await supabase.from('game_projects').update({ status: 'release_ready' }).eq('id', project.id).eq('user_id', user.id);

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/release`);
}

export async function approveReleaseAction(projectId: string) {
  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  await supabase
    .from('game_release_jobs')
    .update({ status: 'preparing' })
    .eq('game_project_id', project.id)
    .eq('status', 'awaiting_user_approval');

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/release`);
}

export async function publishReleaseAction(projectId: string, formData: FormData) {
  const confirmation = String(formData.get('confirm_publish') ?? 'no');
  if (confirmation !== 'yes') {
    throw new Error('Kullanıcı onayı gerekli.');
  }

  const { supabase, user } = await getCurrentUser();
  const project = await getOwnedProject(projectId, user.id);
  if (!project) return;

  const { data: releaseJob } = await supabase
    .from('game_release_jobs')
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

  if (!releaseJob || !artifact?.file_url) {
    throw new Error('Yayın için gerekli release kaydı veya AAB artifact bulunamadı.');
  }

  await supabase.from('game_projects').update({ status: 'publishing' }).eq('id', project.id).eq('user_id', user.id);
  await supabase.from('game_release_jobs').update({ status: 'uploading', submitted_at: new Date().toISOString() }).eq('id', releaseJob.id);

  const provider = new GooglePlayPublisherProvider();
  const result = await provider.publishRelease({
    packageName: project.package_name,
    track: releaseJob.track,
    releaseNotes: releaseJob.release_notes ?? 'Game Factory yayın güncellemesi',
    aabFileUrl: artifact.file_url,
    versionCode: releaseJob.version_code,
    versionName: releaseJob.version_name
  });

  if (result.status === 'published') {
    await supabase
      .from('game_release_jobs')
      .update({ status: 'published', edit_id: result.editId ?? null, completed_at: new Date().toISOString(), error_message: null })
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

  revalidatePath(`/game-factory/${project.id}`);
  revalidatePath(`/game-factory/${project.id}/release`);
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
