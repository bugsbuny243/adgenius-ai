import crypto from 'node:crypto';
import { getServerEnv } from '@/lib/env';

type PublishInput = {
  packageName: string;
  track: string;
  releaseNotes: string;
  aabFileUrl: string;
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

export class GooglePlayPublisherProvider {
  private readonly env = getServerEnv();

  private parseServiceAccount(): ServiceAccount {
    const encoded = this.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64;
    if (!encoded) {
      throw new Error('Google Play servis hesabı ayarı eksik. GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 tanımlanmalıdır.');
    }

    try {
      return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as ServiceAccount;
    } catch {
      throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 geçerli bir JSON içeriği üretmiyor.');
    }
  }

  private async getAccessToken(): Promise<string> {
    const sa = this.parseServiceAccount();
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

  private async playRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
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

  async createEdit(packageName: string) {
    const response = await this.playRequest<{ id: string }>(`applications/${packageName}/edits`, { method: 'POST' });
    return response.id;
  }

  async uploadBundle(packageName: string, editId: string, aabFile: Buffer) {
    const token = await this.getAccessToken();
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

  async updateTrack(packageName: string, editId: string, track: string, release: { name: string; versionCodes: string[]; releaseNotes: string }) {
    await this.playRequest(`applications/${packageName}/edits/${editId}/tracks/${track}`, {
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

  async commitEdit(packageName: string, editId: string) {
    await this.playRequest(`applications/${packageName}/edits/${editId}:commit`, { method: 'POST' });
  }

  async publishRelease(input: PublishInput) {
    const packageName = input.packageName || this.env.GOOGLE_PLAY_PACKAGE_NAME;
    if (!packageName) throw new Error('Google Play paket adı eksik.');
    if (!input.aabFileUrl) throw new Error('AAB dosya bağlantısı bulunamadı.');

    const track = input.track || this.env.GOOGLE_PLAY_DEFAULT_TRACK || 'production';
    const editId = await this.createEdit(packageName);
    const downloadResp = await fetch(input.aabFileUrl);
    if (!downloadResp.ok) throw new Error(`AAB dosyası indirilemedi: ${downloadResp.status}`);

    const bundle = await this.uploadBundle(packageName, editId, Buffer.from(await downloadResp.arrayBuffer()));

    try {
      const versionCode = String(bundle.versionCode ?? input.versionCode ?? '');
      await this.updateTrack(packageName, editId, track, {
        name: input.versionName || `Game Factory ${versionCode}`,
        versionCodes: [versionCode],
        releaseNotes: input.releaseNotes || 'Game Factory yayın güncellemesi'
      });
      await this.commitEdit(packageName, editId);
      return { status: 'published' as const, editId, versionCode };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('policy') || message.toLowerCase().includes('production')) {
        return { status: 'blocked_by_platform_requirement' as const, editId, errorMessage: message };
      }
      return { status: 'failed' as const, editId, errorMessage: message };
    }
  }
}
