'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { decryptCredentials, tryParseEncryptedCredentials } from '@/lib/credentials-encryption';
import { GooglePlayPublisherProvider } from '@/lib/google-play-server';

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseActionServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  return { supabase, user };
}

async function requireOwnedProject(projectId: string) {
  const { supabase, user } = await requireAuthenticatedUser();
  const { data: project, error } = await supabase
    .from('unity_game_projects')
    .select('id, user_id, package_name, release_track, google_play_integration_id, current_version_code, current_version_name')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Proje alınamadı: ${error.message}`);
  }

  if (!project) {
    throw new Error('Proje bulunamadı.');
  }

  return { supabase, user, project };
}

async function upsertReleaseJob(params: {
  projectId: string;
  status: string;
  track: string;
  releaseNotes: string;
  errorMessage: string | null;
}) {
  const { supabase } = await requireAuthenticatedUser();
  const { data: latestReleaseJob } = await supabase
    .from('game_release_jobs')
    .select('id')
    .eq('unity_game_project_id', params.projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestReleaseJob?.id) {
    const { error } = await supabase
      .from('game_release_jobs')
      .update({
        status: params.status,
        track: params.track,
        release_notes: params.releaseNotes,
        error_message: params.errorMessage
      })
      .eq('id', latestReleaseJob.id);

    if (error) throw new Error(`Release kaydı güncellenemedi: ${error.message}`);
    return;
  }

  const { error } = await supabase.from('game_release_jobs').insert({
    unity_game_project_id: params.projectId,
    status: params.status,
    track: params.track,
    release_notes: params.releaseNotes,
    error_message: params.errorMessage
  });

  if (error) throw new Error(`Release kaydı oluşturulamadı: ${error.message}`);
}

export async function deleteGameProject(projectId: string) {
  const { supabase, user } = await requireAuthenticatedUser();

  await supabase.from('unity_game_projects').delete().eq('id', projectId).eq('user_id', user.id);

  revalidatePath('/game-factory');
  redirect('/game-factory');
}

export async function startBuildAction(projectId: string) {
  const supabase = await createSupabaseActionServerClient();
  const [{ data: sessionData }, headerStore] = await Promise.all([supabase.auth.getSession(), headers()]);
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error('Oturum bulunamadı.');
  }

  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const protocol = headerStore.get('x-forwarded-proto') ?? 'https';
  if (!host) throw new Error('Host bilgisi bulunamadı.');

  const response = await fetch(`${protocol}://${host}/api/game-factory/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ projectId }),
    cache: 'no-store'
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Build başlatılamadı.');
  }

  revalidatePath(`/game-factory/${projectId}/builds`);
}

export async function approveReleaseAction(projectId: string) {
  const { supabase, project } = await requireOwnedProject(projectId);

  const { data: latestReleaseJob } = await supabase
    .from('game_release_jobs')
    .select('id, release_notes, track')
    .eq('unity_game_project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const releaseNotes = latestReleaseJob?.release_notes ?? '';
  const track = latestReleaseJob?.track ?? project.release_track ?? 'production';

  await upsertReleaseJob({
    projectId,
    status: 'preparing',
    track,
    releaseNotes,
    errorMessage: null
  });

  revalidatePath(`/game-factory/${projectId}/release`);
}

export async function publishReleaseAction(projectId: string) {
  const { supabase, user, project } = await requireOwnedProject(projectId);

  const [{ data: latestReleaseJob }, { data: artifact }, { data: integration }] = await Promise.all([
    supabase
      .from('game_release_jobs')
      .select('release_notes, track')
      .eq('unity_game_project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('game_artifacts')
      .select('file_url')
      .eq('unity_game_project_id', projectId)
      .eq('artifact_type', 'aab')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_integrations')
      .select('id, default_track, status')
      .eq('id', project.google_play_integration_id)
      .eq('user_id', user.id)
      .eq('provider', 'google_play')
      .maybeSingle()
  ]);

  if (!artifact?.file_url) {
    await upsertReleaseJob({
      projectId,
      status: 'blocked',
      track: latestReleaseJob?.track ?? project.release_track ?? 'production',
      releaseNotes: latestReleaseJob?.release_notes ?? '',
      errorMessage: 'AAB artifact bulunamadı.'
    });
    throw new Error('AAB artifact bulunamadı.');
  }

  if (!integration || integration.status !== 'connected') {
    await upsertReleaseJob({
      projectId,
      status: 'blocked',
      track: latestReleaseJob?.track ?? project.release_track ?? 'production',
      releaseNotes: latestReleaseJob?.release_notes ?? '',
      errorMessage: 'Google Play bağlantısı doğrulanmış değil.'
    });
    throw new Error('Google Play bağlantısı doğrulanmış değil.');
  }

  const { data: credentialsRow } = await supabase
    .from('integration_credentials')
    .select('encrypted_payload')
    .eq('user_integration_id', integration.id)
    .eq('provider', 'google_play')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const encryptedCredentials = tryParseEncryptedCredentials(
    typeof credentialsRow?.encrypted_payload === 'string' ? credentialsRow.encrypted_payload : null
  );

  if (!encryptedCredentials) {
    await upsertReleaseJob({
      projectId,
      status: 'blocked',
      track: latestReleaseJob?.track ?? project.release_track ?? 'production',
      releaseNotes: latestReleaseJob?.release_notes ?? '',
      errorMessage: 'Google Play kimlik bilgileri çözümlenemedi.'
    });
    throw new Error('Google Play kimlik bilgileri çözümlenemedi.');
  }

  const provider = new GooglePlayPublisherProvider();
  const publishResult = await provider.publishRelease({
    packageName: project.package_name,
    track: latestReleaseJob?.track ?? integration.default_track ?? project.release_track ?? 'production',
    releaseNotes: latestReleaseJob?.release_notes ?? 'Game Factory yayın güncellemesi',
    aabFileUrl: artifact.file_url,
    serviceAccountJson: decryptCredentials(encryptedCredentials),
    versionCode: project.current_version_code,
    versionName: project.current_version_name
  });

  await upsertReleaseJob({
    projectId,
    status: publishResult.status,
    track: latestReleaseJob?.track ?? integration.default_track ?? project.release_track ?? 'production',
    releaseNotes: latestReleaseJob?.release_notes ?? '',
    errorMessage: publishResult.errorMessage ?? null
  });

  if (publishResult.status !== 'published') {
    throw new Error(publishResult.errorMessage ?? 'Google Play yayını başarısız oldu.');
  }

  revalidatePath(`/game-factory/${projectId}/release`);
}



export async function setProjectGooglePlayIntegrationAction(projectId: string, formData: FormData) {
  const { supabase, user } = await requireAuthenticatedUser();
  const integrationId = String(formData.get('google_play_integration_id') ?? '').trim();

  if (!integrationId) {
    throw new Error('Google Play bağlantısı seçilmelidir.');
  }

  const { data: integration, error: integrationError } = await supabase
    .from('user_integrations')
    .select('id, default_track')
    .eq('id', integrationId)
    .eq('user_id', user.id)
    .eq('provider', 'google_play')
    .maybeSingle();

  if (integrationError) {
    throw new Error(`Google Play bağlantısı alınamadı: ${integrationError.message}`);
  }

  if (!integration) {
    throw new Error('Seçilen Google Play bağlantısı bulunamadı.');
  }

  const { error } = await supabase
    .from('unity_game_projects')
    .update({ google_play_integration_id: integration.id, release_track: integration.default_track ?? 'production' })
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Proje Google Play bağlantısı güncellenemedi: ${error.message}`);
  }

  revalidatePath(`/game-factory/${projectId}/release`);
  revalidatePath(`/game-factory/${projectId}/settings`);
}

export async function updateReleaseNotesAction(projectId: string, formData: FormData) {
  const { supabase, project } = await requireOwnedProject(projectId);
  const releaseNotes = String(formData.get('release_notes') ?? '').trim();

  if (!releaseNotes) {
    throw new Error('Yayın notları boş bırakılamaz.');
  }

  const { data: latestReleaseJob } = await supabase
    .from('game_release_jobs')
    .select('id, status, track')
    .eq('unity_game_project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = latestReleaseJob?.status === 'published' ? 'draft' : (latestReleaseJob?.status ?? 'awaiting_user_approval');
  const track = latestReleaseJob?.track ?? project.release_track ?? 'production';

  await upsertReleaseJob({
    projectId,
    status,
    track,
    releaseNotes,
    errorMessage: null
  });

  revalidatePath(`/game-factory/${projectId}/release`);
}
