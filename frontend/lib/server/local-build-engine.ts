import 'server-only';

import { createDecipheriv, createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export type LocalBuildStatus = 'queued' | 'processing' | 'completed' | 'failed';

function resolveVaultKey(): Buffer {
  const secret = process.env.KOSCHEI_SECRET_KEY?.trim();
  if (!secret) throw new Error('KOSCHEI_SECRET_KEY eksik.');
  return createHash('sha256').update(secret, 'utf8').digest();
}

function decryptVaultPayload(payload: { iv: string; authTag: string; ciphertext: string }): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', resolveVaultKey(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, 'base64')), decipher.final()]);
}

export async function materializeKeystoreFromVault(vaultPath: string): Promise<string> {
  const serviceRole = getSupabaseServiceRoleClient();
  const bucket = process.env.KOSCHEI_VAULT_BUCKET?.trim() ?? 'vault';
  const { data, error } = await serviceRole.storage.from(bucket).download(vaultPath);
  if (error || !data) throw new Error(`Vault keystore indirilemedi: ${error?.message ?? 'unknown'}`);
  const encryptedJson = JSON.parse(await data.text()) as { iv: string; authTag: string; ciphertext: string };
  const keystoreBytes = decryptVaultPayload(encryptedJson);
  const tempDir = await mkdtemp(path.join(tmpdir(), 'koschei-keystore-'));
  const tempPath = path.join(tempDir, 'runtime.keystore');
  await writeFile(tempPath, keystoreBytes);
  return tempPath;
}

export async function cleanupRuntimeKeystore(keystorePath: string) {
  await rm(path.dirname(keystorePath), { recursive: true, force: true });
}

export async function runLocalAndroidBuild(args: {
  projectId: string;
  jobId: string;
  bundleId: string;
  keystoreVaultPath: string;
  keystorePass: string;
  keyAlias: string;
  keyPass: string;
}) {
  const serviceRole = getSupabaseServiceRoleClient();
  await serviceRole.from('unity_build_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', args.jobId);

  const runtimeKeystorePath = await materializeKeystoreFromVault(args.keystoreVaultPath);
  try {
    const script = path.join(process.cwd(), 'unity-client/server/build_android.sh');
    const buildId = randomUUID();
    const outputPath = path.join('/builds', `${args.projectId}-${buildId}.aab`);

    await new Promise<void>((resolve, reject) => {
      const child = spawn('bash', [script], {
        env: {
          ...process.env,
          KOSCHEI_BUNDLE_ID: args.bundleId,
          KOSCHEI_KEYSTORE_PATH: runtimeKeystorePath,
          KOSCHEI_KEYSTORE_PASS: args.keystorePass,
          KOSCHEI_KEYALIAS: args.keyAlias,
          KOSCHEI_KEYPASS: args.keyPass,
          KOSCHEI_OUTPUT_PATH: outputPath
        },
        stdio: 'inherit'
      });
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build script failed (${code})`))));
    });

    await serviceRole.from('unity_build_jobs').update({ status: 'completed', artifact_url: outputPath, finished_at: new Date().toISOString() }).eq('id', args.jobId);
  } catch (error) {
    await serviceRole.from('unity_build_jobs').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'build failed' }).eq('id', args.jobId);
    throw error;
  } finally {
    await cleanupRuntimeKeystore(runtimeKeystorePath);
  }
}

export async function runLocalWebGLBuild(args: {
  projectId: string;
  jobId: string;
}) {
  const serviceRole = getSupabaseServiceRoleClient();
  await serviceRole.from('unity_build_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', args.jobId);

  try {
    const script = path.join(process.cwd(), 'unity-client/server/build_webgl.sh');
    const buildId = randomUUID();
    const outputPath = path.join('/builds', `${args.projectId}-${buildId}-webgl.zip`);

    await new Promise<void>((resolve, reject) => {
      const child = spawn('bash', [script], {
        env: {
          ...process.env,
          KOSCHEI_OUTPUT_PATH: outputPath
        },
        stdio: 'inherit'
      });
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Build script failed (${code})`))));
    });

    await serviceRole.from('unity_build_jobs').update({ status: 'completed', artifact_url: outputPath, finished_at: new Date().toISOString() }).eq('id', args.jobId);
  } catch (error) {
    await serviceRole.from('unity_build_jobs').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'build failed' }).eq('id', args.jobId);
    throw error;
  }
}
