import 'server-only';

import { decryptCredentials, tryParseEncryptedCredentials } from '@/lib/credentials-encryption';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';
import { validateGooglePlayServiceAccount } from '@/lib/google-play-server';

export type GooglePlayReadinessStatus = 'not_connected' | 'needs_setup' | 'ready';

export type GooglePlayReadinessEvaluation = {
  hasGoogleAccount: boolean;
  hasPlayConsole: boolean;
  hasServiceAccount: boolean;
  serviceAccountValid: boolean;
  permissionsValid: boolean;
  appAccessValid: boolean;
  status: GooglePlayReadinessStatus;
  blockers: string[];
  googleEmail: string | null;
  packageName: string | null;
  integrationId: string | null;
};

const PLAY_CONSOLE_REQUIRED_BLOCKER =
  'Google hesabınız var, ancak Google Play Console geliştirici hesabınız bağlı değil. Play Store yayını için kullanıcıya ait aktif Google Play Console hesabı gerekir.';

const SERVICE_ACCOUNT_PERMISSION_BLOCKER =
  'Play Console → Users & Permissions bölümünden Koschei service account e-postasını gerekli yayınlama yetkileriyle ekleyin.';

function toMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'Bilinmeyen hata.';
}

async function resolveWorkspaceIdForUser(userId: string) {
  const service = getSupabaseServiceRoleClient();
  const { data } = await service
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.workspace_id ?? null;
}

async function getServiceAccountJson(integrationId: string) {
  const service = getSupabaseServiceRoleClient();
  const { data } = await service
    .from('integration_credentials')
    .select('encrypted_payload')
    .eq('user_integration_id', integrationId)
    .eq('provider', 'google_play')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const encryptedCredentials = tryParseEncryptedCredentials(
    typeof data?.encrypted_payload === 'string' ? data.encrypted_payload : null
  );

  if (!encryptedCredentials) return null;
  return decryptCredentials(encryptedCredentials);
}

async function checkPublisherApi(packageName: string, serviceAccountJson: string) {
  const validation = await validateGooglePlayServiceAccount(serviceAccountJson);
  if (validation.status !== 'connected') {
    return {
      googleEmail: validation.clientEmail,
      serviceAccountValid: false,
      permissionsValid: false,
      appAccessValid: false,
      blockers: [validation.errorMessage ?? SERVICE_ACCOUNT_PERMISSION_BLOCKER]
    };
  }

  try {
    const parsed = JSON.parse(serviceAccountJson) as { client_email?: string; private_key?: string; token_uri?: string };
    const clientEmail = parsed.client_email ?? validation.clientEmail;
    if (!parsed.private_key || !clientEmail) {
      return {
        googleEmail: clientEmail,
        serviceAccountValid: false,
        permissionsValid: false,
        appAccessValid: false,
        blockers: ['Service account JSON parse edilemedi.']
      };
    }

    const now = Math.floor(Date.now() / 1000);
    const tokenUri = parsed.token_uri || 'https://oauth2.googleapis.com/token';
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: tokenUri,
        exp: now + 3600,
        iat: now
      })
    ).toString('base64url');

    const crypto = await import('node:crypto');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = Buffer.from(signer.sign(parsed.private_key)).toString('base64url');
    const assertion = `${header}.${payload}.${signature}`;

    const tokenResp = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
      })
    });

    if (!tokenResp.ok) {
      return {
        googleEmail: clientEmail,
        serviceAccountValid: false,
        permissionsValid: false,
        appAccessValid: false,
        blockers: [`Google OAuth token alınamadı: ${tokenResp.status}`]
      };
    }

    const tokenData = (await tokenResp.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return {
        googleEmail: clientEmail,
        serviceAccountValid: false,
        permissionsValid: false,
        appAccessValid: false,
        blockers: ['Google OAuth token yanıtı access_token içermiyor.']
      };
    }

    const editResp = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      }
    );

    if (editResp.ok) {
      const editData = (await editResp.json()) as { id?: string };
      if (editData.id) {
        await fetch(
          `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editData.id}:delete`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
          }
        );
      }

      return {
        googleEmail: clientEmail,
        serviceAccountValid: true,
        permissionsValid: true,
        appAccessValid: true,
        blockers: []
      };
    }

    const body = await editResp.text();
    const lower = body.toLowerCase();
    const permissionIssue = editResp.status === 401 || editResp.status === 403 || lower.includes('permission');
    const appAccessIssue = editResp.status === 404 || lower.includes('package') || lower.includes('not found');

    return {
      googleEmail: clientEmail,
      serviceAccountValid: true,
      permissionsValid: !permissionIssue,
      appAccessValid: !appAccessIssue,
      blockers: [permissionIssue || appAccessIssue ? SERVICE_ACCOUNT_PERMISSION_BLOCKER : `Android Publisher API hatası: ${editResp.status}`]
    };
  } catch (error) {
    return {
      googleEmail: null,
      serviceAccountValid: false,
      permissionsValid: false,
      appAccessValid: false,
      blockers: [toMessage(error)]
    };
  }
}

export async function evaluateGooglePlayReadiness(params: {
  userId: string;
  projectId: string;
  packageName?: string | null;
  integrationId?: string | null;
  hasPlayConsoleOverride?: boolean;
  hasGoogleAccountOverride?: boolean;
  googleEmailOverride?: string | null;
}) {
  const service = getSupabaseServiceRoleClient();
  const workspaceId = await resolveWorkspaceIdForUser(params.userId);

  const { data: readinessRow } = await service
    .from('google_play_readiness')
    .select('id, package_name, google_email, has_google_account, has_play_console, has_service_account')
    .eq('unity_game_project_id', params.projectId)
    .eq('user_id', params.userId)
    .maybeSingle();

  const packageName = params.packageName?.trim() || readinessRow?.package_name || null;
  const hasGoogleAccount = params.hasGoogleAccountOverride ?? readinessRow?.has_google_account ?? true;
  const hasPlayConsole = params.hasPlayConsoleOverride ?? readinessRow?.has_play_console ?? false;

  const { data: project } = await service
    .from('unity_game_projects')
    .select('google_play_integration_id')
    .eq('id', params.projectId)
    .eq('user_id', params.userId)
    .maybeSingle();

  const integrationId = params.integrationId ?? project?.google_play_integration_id ?? null;

  let hasServiceAccount = Boolean(readinessRow?.has_service_account);
  let serviceAccountValid = false;
  let permissionsValid = false;
  let appAccessValid = false;
  let googleEmail = params.googleEmailOverride ?? readinessRow?.google_email ?? null;
  const blockers: string[] = [];

  if (!hasGoogleAccount) blockers.push('Google hesabı bağlı değil.');
  if (!hasPlayConsole && hasGoogleAccount) blockers.push(PLAY_CONSOLE_REQUIRED_BLOCKER);

  if (integrationId) {
    const serviceAccountJson = await getServiceAccountJson(integrationId);
    hasServiceAccount = Boolean(serviceAccountJson);

    if (serviceAccountJson && packageName) {
      const apiCheck = await checkPublisherApi(packageName, serviceAccountJson);
      googleEmail = apiCheck.googleEmail ?? googleEmail;
      serviceAccountValid = apiCheck.serviceAccountValid;
      permissionsValid = apiCheck.permissionsValid;
      appAccessValid = apiCheck.appAccessValid;
      blockers.push(...apiCheck.blockers);
    } else if (serviceAccountJson && !packageName) {
      const validation = await validateGooglePlayServiceAccount(serviceAccountJson);
      googleEmail = validation.clientEmail ?? googleEmail;
      serviceAccountValid = validation.status === 'connected';
      permissionsValid = validation.status === 'connected';
      blockers.push('Package name bulunamadı. Uygulama erişimi doğrulanamadı.');
    }
  }

  if (hasPlayConsole && (!hasServiceAccount || !serviceAccountValid || !permissionsValid || !appAccessValid)) {
    blockers.push(SERVICE_ACCOUNT_PERMISSION_BLOCKER);
  }

  const uniqueBlockers = [...new Set(blockers.filter(Boolean))];
  const ready = hasGoogleAccount && hasPlayConsole && hasServiceAccount && serviceAccountValid && permissionsValid && appAccessValid;
  const status: GooglePlayReadinessStatus = ready ? 'ready' : uniqueBlockers.length > 0 ? 'needs_setup' : 'not_connected';

  const payload: GooglePlayReadinessEvaluation = {
    hasGoogleAccount,
    hasPlayConsole,
    hasServiceAccount,
    serviceAccountValid,
    permissionsValid,
    appAccessValid,
    status,
    blockers: uniqueBlockers,
    googleEmail,
    packageName,
    integrationId
  };

  await service.from('google_play_readiness').upsert(
    {
      id: readinessRow?.id,
      workspace_id: workspaceId,
      user_id: params.userId,
      unity_game_project_id: params.projectId,
      package_name: packageName,
      google_email: googleEmail,
      has_google_account: hasGoogleAccount,
      has_play_console: hasPlayConsole,
      has_service_account: hasServiceAccount,
      service_account_valid: serviceAccountValid,
      permissions_valid: permissionsValid,
      app_access_valid: appAccessValid,
      status,
      blockers: uniqueBlockers,
      checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'unity_game_project_id' }
  );

  return payload;
}

export async function disconnectGooglePlayReadiness(params: { userId: string; projectId: string }) {
  const service = getSupabaseServiceRoleClient();
  await service
    .from('google_play_readiness')
    .update({
      has_google_account: false,
      has_play_console: false,
      has_service_account: false,
      service_account_valid: false,
      permissions_valid: false,
      app_access_valid: false,
      status: 'not_connected',
      blockers: [],
      checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('unity_game_project_id', params.projectId)
    .eq('user_id', params.userId);
}
