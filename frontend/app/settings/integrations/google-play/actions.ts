'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { encryptCredentials, serializeEncryptedCredentials } from '@/lib/credentials-encryption';

function normalizeTrack(value: string): 'production' | 'closed' | 'internal' {
  if (value === 'closed' || value === 'internal') return value;
  return 'production';
}

export async function saveGooglePlayIntegrationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const displayName = String(formData.get('display_name') ?? '').trim();
  const defaultTrack = normalizeTrack(String(formData.get('default_track') ?? 'production').trim());
  const jsonUpload = formData.get('service_account_json_file');
  const jsonText = String(formData.get('service_account_json') ?? '').trim();

  let rawJson = jsonText;
  if (!rawJson && jsonUpload instanceof File) {
    rawJson = (await jsonUpload.text()).trim();
  }

  if (!displayName || !rawJson) {
    throw new Error('Bağlantı adı ve service account JSON zorunludur.');
  }

  let parsedJson: Record<string, unknown>;
  try {
    parsedJson = JSON.parse(rawJson) as Record<string, unknown>;
  } catch {
    throw new Error('Service account JSON geçersiz.');
  }

  const clientEmail = typeof parsedJson.client_email === 'string' ? parsedJson.client_email.trim() : '';
  if (!clientEmail) {
    throw new Error('Service account JSON içinde client_email alanı bulunmalıdır.');
  }

  const encryptedCredentials = serializeEncryptedCredentials(encryptCredentials(JSON.stringify(parsedJson)));

  const { error } = await supabase.from('user_integrations').insert({
    user_id: user.id,
    provider: 'google_play',
    display_name: displayName,
    encrypted_credentials: encryptedCredentials,
    service_account_email: clientEmail,
    default_track: defaultTrack,
    status: 'connected',
    last_validated_at: new Date().toISOString(),
    error_message: null
  });

  if (error) {
    throw new Error(`Google Play bağlantısı kaydedilemedi: ${error.message}`);
  }

  revalidatePath('/settings/integrations/google-play');
  revalidatePath('/game-factory');
  redirect('/settings/integrations/google-play?status=connected');
}
