'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseActionServerClient } from '@/lib/supabase-server';
import { encryptCredentials, serializeEncryptedCredentials } from '@/lib/credentials-encryption';
import { validateGooglePlayServiceAccount } from '@/lib/google-play-server';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

function normalizeTrack(value: string): 'production' | 'closed' | 'internal' {
  if (value === 'closed' || value === 'internal') return value;
  return 'production';
}

export async function saveGooglePlayIntegrationAction(formData: FormData) {
  const supabase = await createSupabaseActionServerClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session?.access_token || !session?.user?.id) redirect('/signin');

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

  const parsed = JSON.parse(rawJson) as Record<string, unknown>;
  const clientEmail = typeof parsed.client_email === 'string' ? parsed.client_email.trim() : '';
  if (!clientEmail) {
    throw new Error('client_email eksik.');
  }

  const validation = await validateGooglePlayServiceAccount(rawJson);
  const encryptedPayload = serializeEncryptedCredentials(encryptCredentials(JSON.stringify(parsed)));
  const serviceRole = getSupabaseServiceRoleClient();

  const { data: membership } = await serviceRole
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const workspaceId = membership?.workspace_id ?? null;

  const { data: integration, error: integrationError } = await supabase
    .from('user_integrations')
    .insert({
      workspace_id: workspaceId,
      user_id: session.user.id,
      provider: 'google_play',
      display_name: displayName,
      metadata: { connected_via: 'nextjs', has_service_account: true, google_client_secret_present: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()) },
      provider_account_id: clientEmail,
      service_account_email: clientEmail,
      default_track: defaultTrack,
      status: validation.status,
      last_validated_at: new Date().toISOString(),
      error_message: validation.errorMessage
    })
    .select('id')
    .single();

  if (integrationError || !integration) {
    throw new Error(`Google Play bağlantısı kaydedilemedi: ${integrationError?.message ?? 'unknown_error'}`);
  }

  const { error: credentialsError } = await serviceRole.from('integration_credentials').insert({
    workspace_id: workspaceId,
    user_id: session.user.id,
    user_integration_id: integration.id,
    provider: 'google_play',
    credential_type: 'service_account_json',
    encrypted_payload: encryptedPayload,
    status: 'active',
    metadata: { display_name: displayName }
  });

  if (credentialsError) {
    throw new Error(`Credential kaydı eklenemedi: ${credentialsError.message}`);
  }

  revalidatePath('/settings/integrations/google-play');
  revalidatePath('/game-factory');
  redirect(`/settings/integrations/google-play?status=${validation.status}`);
}
