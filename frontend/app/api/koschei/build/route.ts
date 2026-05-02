import crypto from 'node:crypto';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type BuildRequestBody = {
  username?: string;
  gameName?: string;
  workspace_id?: string;
  user_id?: string;
  project_id?: string;
};

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
}

function buildBundleId(username: string, gameName: string): string {
  const user = normalizeSlug(username);
  const game = normalizeSlug(gameName);
  return `com.koschei.${user || 'user'}.${game || 'game'}`;
}

function generateSecureHex(byteLength = 16): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

function encryptAes256Cbc(plainText: string, secret: string): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  return `${iv.toString('base64')}:${encrypted.toString('base64')}`;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function validatePayload(body: BuildRequestBody) {
  const username = String(body.username ?? '').trim();
  const gameName = String(body.gameName ?? '').trim();
  const workspaceId = String(body.workspace_id ?? '').trim();
  const userId = String(body.user_id ?? '').trim();
  const projectId = String(body.project_id ?? '').trim();

  if (!username || !gameName || !workspaceId || !userId || !projectId) {
    throw new Error('username, gameName, workspace_id, user_id ve project_id zorunludur.');
  }

  return { username, gameName, workspaceId, userId, projectId };
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json().catch(() => null)) as BuildRequestBody | null;
    if (!rawBody) {
      return NextResponse.json({ ok: false, error: 'Geçersiz JSON body.' }, { status: 400 });
    }

    const { username, gameName, workspaceId, userId, projectId } = validatePayload(rawBody);

    const encryptionSecret = process.env.KOSCHEI_CREDENTIALS_ENCRYPTION_KEY?.trim();
    if (!encryptionSecret) {
      throw new Error('KOSCHEI_CREDENTIALS_ENCRYPTION_KEY eksik.');
    }

    const unityOrgId = process.env.UNITY_ORG_ID?.trim();
    const unityProjectId = process.env.UNITY_PROJECT_ID?.trim();
    const unityBuildTargetId = process.env.UNITY_BUILD_TARGET_ID?.trim();
    const unityBuildApiKey = process.env.UNITY_BUILD_API_KEY?.trim();

    if (!unityOrgId || !unityProjectId || !unityBuildTargetId || !unityBuildApiKey) {
      throw new Error('Unity Cloud Build ortam değişkenleri eksik.');
    }

    const keystorePass = generateSecureHex(24);
    const keyAlias = generateSecureHex(12);
    const bundleId = buildBundleId(username, gameName);

    const encryptedPayload = encryptAes256Cbc(
      JSON.stringify({ keystorePass, keyAlias }),
      encryptionSecret
    );

    const supabase = getSupabaseAdminClient();

    const { error: credentialError } = await supabase.from('integration_credentials').insert({
      credential_type: 'android_keystore',
      provider: 'koschei_system',
      workspace_id: workspaceId,
      user_id: userId,
      encrypted_payload: encryptedPayload
    });

    if (credentialError) throw credentialError;

    const { error: projectUpdateError } = await supabase
      .from('unity_game_projects')
      .update({ package_name: bundleId })
      .eq('id', projectId);

    if (projectUpdateError) throw projectUpdateError;

    const { error: buildJobInsertError } = await supabase.from('unity_build_jobs').insert({
      unity_game_project_id: projectId,
      workspace_id: workspaceId,
      user_id: userId,
      status: 'queued',
      build_type: 'release',
      build_target: 'koschei-android'
    });

    if (buildJobInsertError) throw buildJobInsertError;

    const unityResponse = await fetch(
      `https://build-api.cloud.unity3d.com/api/v1/orgs/${unityOrgId}/projects/${unityProjectId}/buildtargets/${unityBuildTargetId}/builds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${unityBuildApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    const unityData = await unityResponse.json().catch(() => null);

    if (!unityResponse.ok) {
      console.error('Unity Cloud Build API error:', unityResponse.status, unityData);
      throw new Error('Unity Cloud Build tetikleme hatası.');
    }

    return NextResponse.json({ ok: true, unityBuild: unityData }, { status: 200 });
  } catch (error) {
    console.error('Koschei build route error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen sunucu hatası.'
      },
      { status: 500 }
    );
  }
}
