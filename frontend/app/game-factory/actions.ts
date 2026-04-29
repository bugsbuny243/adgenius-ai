'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { getBackendApiUrl } from '@/lib/backend-api';

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
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  const { data: project, error } = await supabase
    .from('unity_game_projects')
    .select('id, workspace_id, user_id, package_name, release_track, google_play_integration_id, current_version_code, current_version_name')
    .eq('id', projectId)
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle();

  if (error) {
    throw new Error(`Proje alınamadı: ${error.message}`);
  }

  if (!project) {
    throw new Error('Proje bulunamadı.');
  }

  return { supabase, user, project, workspaceId: membership.workspace_id };
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
  const { supabase, workspaceId } = await requireOwnedProject(projectId);

  await supabase.from('unity_game_projects').delete().eq('id', projectId).eq('workspace_id', workspaceId);

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
  const { supabase } = await requireAuthenticatedUser();
  const [{ data: sessionData }, headerStore] = await Promise.all([supabase.auth.getSession(), headers()]);
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error('Oturum bulunamadı.');
  }

  const response = await fetch(`${getBackendApiUrl()}/game-factory/release/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(headerStore.get('x-forwarded-host') ? { 'X-Forwarded-Host': headerStore.get('x-forwarded-host') as string } : {}),
      ...(headerStore.get('x-forwarded-proto') ? { 'X-Forwarded-Proto': headerStore.get('x-forwarded-proto') as string } : {})
    },
    body: JSON.stringify({ projectId }),
    cache: 'no-store'
  });

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error ?? 'Google Play yayını başarısız oldu.');
  }

  revalidatePath(`/game-factory/${projectId}/release`);
}


export async function setProjectGooglePlayIntegrationAction(projectId: string, formData: FormData) {
  const { supabase, user, workspaceId } = await requireOwnedProject(projectId);
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
    .eq('workspace_id', workspaceId);

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
