'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { getBackendApiUrl } from '@/lib/backend-api';

function normalizeTrack(value: string): 'production' | 'closed' | 'internal' {
  if (value === 'closed' || value === 'internal') return value;
  return 'production';
}

export async function saveGooglePlayIntegrationAction(formData: FormData) {
  const supabase = await createSupabaseActionServerClient();
  const [{ data: sessionData }, headerStore] = await Promise.all([supabase.auth.getSession(), headers()]);
  const token = sessionData.session?.access_token;
  if (!token) redirect('/signin');

  const displayName = String(formData.get('display_name') ?? '').trim();
  const defaultTrack = normalizeTrack(String(formData.get('default_track') ?? 'production').trim());
  const jsonUpload = formData.get('service_account_json_file');
  const jsonText = String(formData.get('service_account_json') ?? '').trim();

  let rawJson = jsonText;
  if (!rawJson && jsonUpload instanceof File) {
    rawJson = (await jsonUpload.text()).trim();
  }

  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const protocol = headerStore.get('x-forwarded-proto') ?? 'https';
  if (!host) throw new Error('Host bilgisi bulunamadı.');

  const backendResponse = await fetch(`${getBackendApiUrl()}/integrations/google-play`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Forwarded-Host': host,
      'X-Forwarded-Proto': protocol
    },
    body: JSON.stringify({ displayName, defaultTrack, serviceAccountJson: rawJson }),
    cache: 'no-store'
  });

  const payload = (await backendResponse.json().catch(() => null)) as { ok?: boolean; error?: string; status?: string } | null;
  if (!backendResponse.ok || !payload?.ok) {
    throw new Error(payload?.error ?? 'Google Play bağlantısı kaydedilemedi.');
  }

  revalidatePath('/settings/integrations/google-play');
  revalidatePath('/game-factory');
  redirect(`/settings/integrations/google-play?status=${payload.status ?? 'connected'}`);
}
