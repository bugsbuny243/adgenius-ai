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

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseServiceAccount(serviceAccountJson: string): ServiceAccount {
  try {
    const parsed = JSON.parse(serviceAccountJson) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error('Google Play servis hesabı JSON alanları eksik.');
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

export class GooglePlayPublisherProvider {
  private readonly env = getServerEnv();

  private async getAccessToken(sa: ServiceAccount): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64Url(
      JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/androidpublisher',
        aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      })
    );

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = base64Url(signer.sign(sa.private_key));
    const assertion = `${header}.${payload}.${signature}`;

    const tokenResp = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
      })
    });

    if (!tokenResp.ok) {
      throw new Error(`Google OAuth token alınamadı: ${tokenResp.status} ${await tokenResp.text()}`);
    }

    const tokenData = await tokenResp.json();
    return tokenData.access_token as string;
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

  async publishRelease(input: PublishInput) {
    if (!input.packageName) throw new Error('Google Play paket adı eksik.');
    if (!input.aabFileUrl) throw new Error('AAB dosya bağlantısı bulunamadı.');

    const sa = parseServiceAccount(input.serviceAccountJson);
    const track = input.track || this.env.GOOGLE_PLAY_DEFAULT_TRACK || 'production';
    const editId = await this.createEdit(sa, input.packageName);
    const downloadResp = await fetch(input.aabFileUrl);
    if (!downloadResp.ok) throw new Error(`AAB dosyası indirilemedi: ${downloadResp.status}`);

    const bundle = await this.uploadBundle(sa, input.packageName, editId, Buffer.from(await downloadResp.arrayBuffer()));

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
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.toLowerCase().includes('policy') ||
        message.toLowerCase().includes('permission') ||
        message.toLowerCase().includes('account') ||
        message.toLowerCase().includes('production')
      ) {
        return { status: 'blocked_by_platform_requirement' as const, editId, errorMessage: message };
      }
      return { status: 'failed' as const, editId, errorMessage: message };
    }
  }
}
