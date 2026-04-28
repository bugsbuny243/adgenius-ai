import crypto from 'node:crypto';

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

export type PublishInput = {
  packageName: string;
  track?: string | null;
  releaseNotes: string;
  aabFileUrl: string;
  serviceAccountJson: string;
  versionCode?: number | null;
  versionName?: string | null;
};

export type PublishResult = {
  status: 'published' | 'failed' | 'blocked_by_platform_requirement';
  editId?: string;
  versionCode?: string;
  errorMessage?: string;
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function parseServiceAccount(serviceAccountJson: string): ServiceAccount {
  const parsed = JSON.parse(serviceAccountJson) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key) throw new Error('Service account JSON eksik.');
  return { client_email: parsed.client_email, private_key: parsed.private_key, token_uri: parsed.token_uri };
}

function toActionableMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string' && error.trim().length > 0) return error;
  return fallback;
}

function isPlatformRequirementError(message: string) {
  const normalized = message.toLowerCase();
  return ['permission', 'account', 'policy', 'production', 'package', 'insufficient', 'forbidden', 'play console'].some((k) =>
    normalized.includes(k)
  );
}

async function requestGoogleAccessToken(sa: ServiceAccount): Promise<{ accessToken: string } | { errorMessage: string }> {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  try {
    const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64Url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: tokenUri, exp: now + 3600, iat: now }));
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = base64Url(signer.sign(sa.private_key));
    const assertion = `${header}.${payload}.${signature}`;
    const tokenResp = await fetch(tokenUri, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
    });
    if (!tokenResp.ok) return { errorMessage: `Google OAuth token alınamadı: ${tokenResp.status} ${await tokenResp.text()}` };
    const tokenData = (await tokenResp.json()) as { access_token?: string };
    if (!tokenData.access_token) return { errorMessage: 'Google OAuth token yanıtı access_token içermiyor.' };
    return { accessToken: tokenData.access_token };
  } catch (error) {
    return { errorMessage: toActionableMessage(error, 'Google OAuth token isteği başarısız oldu.') };
  }
}

export async function validateGooglePlayServiceAccount(serviceAccountJson: string) {
  const sa = parseServiceAccount(serviceAccountJson);
  const tokenResult = await requestGoogleAccessToken(sa);
  if ('errorMessage' in tokenResult) return { clientEmail: sa.client_email, status: 'error' as const, errorMessage: tokenResult.errorMessage };
  return { clientEmail: sa.client_email, status: 'connected' as const, errorMessage: null };
}

export class GooglePlayPublisherProvider {
  private async getAccessToken(sa: ServiceAccount): Promise<string> {
    const tokenResult = await requestGoogleAccessToken(sa);
    if ('errorMessage' in tokenResult) throw new Error(tokenResult.errorMessage);
    return tokenResult.accessToken;
  }

  private async playRequest<T>(sa: ServiceAccount, path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken(sa);
    const resp = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) }
    });
    if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`);
    return (await resp.json()) as T;
  }

  async publishRelease(input: PublishInput): Promise<PublishResult> {
    let sa: ServiceAccount;
    try { sa = parseServiceAccount(input.serviceAccountJson); } catch (error) { return { status: 'failed', errorMessage: toActionableMessage(error, 'Service account geçersiz.') }; }
    let editId: string | undefined;
    try {
      const edit = await this.playRequest<{ id: string }>(sa, `applications/${input.packageName}/edits`, { method: 'POST' });
      editId = edit.id;
      const token = await this.getAccessToken(sa);
      const fileResp = await fetch(input.aabFileUrl);
      if (!fileResp.ok) throw new Error(`AAB dosyası indirilemedi: ${fileResp.status}`);
      const aabBuffer = Buffer.from(await fileResp.arrayBuffer());
      const uploadResp = await fetch(`https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${input.packageName}/edits/${editId}/bundles?uploadType=media`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }, body: new Uint8Array(aabBuffer)
      });
      if (!uploadResp.ok) throw new Error(`${uploadResp.status} ${await uploadResp.text()}`);
      const bundle = (await uploadResp.json()) as { versionCode?: number };
      const versionCode = String(bundle.versionCode ?? input.versionCode ?? '');
      await this.playRequest(sa, `applications/${input.packageName}/edits/${editId}/tracks/${input.track ?? 'production'}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track: input.track ?? 'production', releases: [{ name: input.versionName || `Game Factory ${versionCode}`, status: 'completed', versionCodes: [versionCode], releaseNotes: [{ language: 'tr-TR', text: input.releaseNotes || 'Game Factory yayın güncellemesi' }] }] })
      });
      await this.playRequest(sa, `applications/${input.packageName}/edits/${editId}:commit`, { method: 'POST' });
      return { status: 'published', editId, versionCode };
    } catch (error) {
      const errorMessage = toActionableMessage(error, 'Google Play publish başarısız oldu.');
      return { status: isPlatformRequirementError(errorMessage) ? 'blocked_by_platform_requirement' : 'failed', editId, errorMessage };
    }
  }
}
