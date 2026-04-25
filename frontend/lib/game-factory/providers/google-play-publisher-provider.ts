import crypto from 'node:crypto';
import { getServerEnv } from '@/lib/env';

type PublishInput = {
  packageName: string;
  track?: string | null;
  releaseNotes: string;
  aabFileUrl: string;
  serviceAccountJson: string;
  versionCode?: number | null;
  versionName?: string | null;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type PublishResult = {
  status: 'published' | 'failed' | 'blocked_by_platform_requirement';
  editId?: string;
  versionCode?: string;
  errorMessage?: string;
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseServiceAccount(serviceAccountJson: string): ServiceAccount {
  try {
    const parsed = JSON.parse(serviceAccountJson) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Google Play servis hesabı JSON alanları eksik: client_email ve private_key zorunludur.');
    }

    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      token_uri: parsed.token_uri
    };
  } catch {
    throw new Error('Google Play servis hesabı JSON içeriği geçersiz.');
  }
}

function toActionableMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string' && error.trim().length > 0) return error;
  return fallback;
}

function isPlatformRequirementError(message: string) {
  const normalized = message.toLowerCase();
  return ['permission', 'account', 'policy', 'production', 'package', 'insufficient', 'forbidden', 'play console'].some((keyword) =>
    normalized.includes(keyword)
  );
}

async function requestGoogleAccessToken(sa: ServiceAccount): Promise<{ accessToken: string } | { errorMessage: string }> {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';

  try {
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64Url(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: tokenUri,
        exp: now + 3600,
        iat: now
      })
    );
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = base64Url(signer.sign(sa.private_key));
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
      return { errorMessage: `Google OAuth token alınamadı: ${tokenResp.status} ${await tokenResp.text()}` };
    }
    const tokenData = (await tokenResp.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return { errorMessage: 'Google OAuth token yanıtı access_token içermiyor.' };
    }
    return { accessToken: tokenData.access_token };
  } catch (error) {
    return { errorMessage: toActionableMessage(error, 'Google OAuth token isteği başarısız oldu.') };
  }
}

export async function validateGooglePlayServiceAccount(serviceAccountJson: string) {
  const sa = parseServiceAccount(serviceAccountJson);
  const tokenResult = await requestGoogleAccessToken(sa);
  if ('errorMessage' in tokenResult) {
    return { clientEmail: sa.client_email, status: 'error' as const, errorMessage: tokenResult.errorMessage };
  }
  return { clientEmail: sa.client_email, status: 'connected' as const, errorMessage: null };
}

export class GooglePlayPublisherProvider {
  private readonly env = getServerEnv();

  private async getAccessToken(sa: ServiceAccount): Promise<string> {
    const tokenResult = await requestGoogleAccessToken(sa);
    if ('errorMessage' in tokenResult) {
      throw new Error(tokenResult.errorMessage);
    }
    return tokenResult.accessToken;
  }

  private async playRequest<T>(sa: ServiceAccount, path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken(sa);
    const resp = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {})
      }
    });

    if (!resp.ok) {
      throw new Error(`${resp.status} ${await resp.text()}`);
    }

    return (await resp.json()) as T;
  }

  async createEdit(sa: ServiceAccount, packageName: string) {
    const response = await this.playRequest<{ id: string }>(sa, `applications/${packageName}/edits`, { method: 'POST' });
    return response.id;
  }

  async uploadBundle(sa: ServiceAccount, packageName: string, editId: string, aabFile: Buffer) {
    const token = await this.getAccessToken(sa);
    const resp = await fetch(
      `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/bundles?uploadType=media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: new Uint8Array(aabFile)
      }
    );

    if (!resp.ok) {
      throw new Error(`${resp.status} ${await resp.text()}`);
    }

    return (await resp.json()) as { versionCode?: number };
  }

  async updateTrack(
    sa: ServiceAccount,
    packageName: string,
    editId: string,
    track: string,
    release: { name: string; versionCodes: string[]; releaseNotes: string }
  ) {
    await this.playRequest(sa, `applications/${packageName}/edits/${editId}/tracks/${track}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track,
        releases: [
          {
            name: release.name,
            status: 'completed',
            versionCodes: release.versionCodes,
            releaseNotes: [{ language: 'tr-TR', text: release.releaseNotes }]
          }
        ]
      })
    });
  }

  async commitEdit(sa: ServiceAccount, packageName: string, editId: string) {
    await this.playRequest(sa, `applications/${packageName}/edits/${editId}:commit`, { method: 'POST' });
  }

  async publishRelease(input: PublishInput): Promise<PublishResult> {
    if (!input.packageName) return { status: 'failed', errorMessage: 'Google Play paket adı eksik.' };
    if (!input.aabFileUrl) return { status: 'failed', errorMessage: 'AAB dosya bağlantısı bulunamadı.' };

    let sa: ServiceAccount;
    try {
      sa = parseServiceAccount(input.serviceAccountJson);
    } catch (error) {
      return { status: 'failed', errorMessage: toActionableMessage(error, 'Google Play servis hesabı doğrulanamadı.') };
    }
    const track = input.track || this.env.GOOGLE_PLAY_DEFAULT_TRACK || 'production';
    let editId: string | undefined;

    try {
      editId = await this.createEdit(sa, input.packageName);
    } catch (error) {
      const errorMessage = toActionableMessage(error, 'Google Play edit oluşturulamadı.');
      return {
        status: isPlatformRequirementError(errorMessage) ? 'blocked_by_platform_requirement' : 'failed',
        errorMessage
      };
    }

    let aabBuffer: Buffer;
    try {
      const downloadResp = await fetch(input.aabFileUrl);
      if (!downloadResp.ok) throw new Error(`AAB dosyası indirilemedi: ${downloadResp.status}`);
      aabBuffer = Buffer.from(await downloadResp.arrayBuffer());
    } catch (error) {
      return {
        status: 'failed',
        editId,
        errorMessage: toActionableMessage(error, 'AAB dosyası indirilemedi.')
      };
    }

    let bundle: { versionCode?: number };
    try {
      bundle = await this.uploadBundle(sa, input.packageName, editId, aabBuffer);
    } catch (error) {
      const errorMessage = toActionableMessage(error, 'AAB Google Play edit içine yüklenemedi.');
      return {
        status: isPlatformRequirementError(errorMessage) ? 'blocked_by_platform_requirement' : 'failed',
        editId,
        errorMessage
      };
    }

    try {
      const versionCode = String(bundle.versionCode ?? input.versionCode ?? '');
      await this.updateTrack(sa, input.packageName, editId, track, {
        name: input.versionName || `Game Factory ${versionCode}`,
        versionCodes: [versionCode],
        releaseNotes: input.releaseNotes || 'Game Factory yayın güncellemesi'
      });
      await this.commitEdit(sa, input.packageName, editId);
      return { status: 'published' as const, editId, versionCode };
    } catch (error) {
      const errorMessage = toActionableMessage(error, 'Google Play track güncelleme/commit başarısız oldu.');
      return {
        status: isPlatformRequirementError(errorMessage) ? 'blocked_by_platform_requirement' : 'failed',
        editId,
        errorMessage
      };
    }
  }
}
