'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';

export async function deleteGameProject(projectId: string) {
  const supabase = await createSupabaseActionServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

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

// Legacy ekranlar için geriye dönük uyumluluk.
export async function approveReleaseAction(projectId: string) {
  void projectId;
  throw new Error('Bu akış yeni pipeline dışında bırakıldı.');
}

export async function publishReleaseAction(projectId: string) {
  void projectId;
  throw new Error('Bu akış yeni pipeline dışında bırakıldı.');
}

export async function setProjectGooglePlayIntegrationAction(projectId: string, formData: FormData) {
  void projectId;
  void formData;
  throw new Error('Bu akış yeni pipeline dışında bırakıldı.');
}

export async function updateReleaseNotesAction(projectId: string, formData: FormData) {
  void projectId;
  void formData;
  throw new Error('Bu akış yeni pipeline dışında bırakıldı.');
}
