import { Octokit } from 'octokit';

export function extractArtKeywords(brief: string): string[] {
  return brief
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8);
}

function requireProductionOnlyMode() {
  const appEnv = String(process.env.APP_ENV ?? process.env.NODE_ENV ?? '').toLowerCase();
  if (appEnv && appEnv !== 'production') {
    throw new Error(`Sistem yalnızca production modunda çalışır. Aktif mod: ${appEnv}`);
  }
}

export async function requestPrimaryAssetModel(brief: string) {
  requireProductionOnlyMode();

  const keywords = extractArtKeywords(brief);
  const prompt = `game ready stylized 3d model, ${keywords.join(', ')}`;

  const primaryAssetApi = process.env.PRIMARY_ASSET_API_URL?.trim();
  const primaryAssetApiKey = process.env.PRIMARY_ASSET_API_KEY?.trim();
  if (!primaryAssetApi || !primaryAssetApiKey) {
    throw new Error('PRIMARY_ASSET_API_URL ve PRIMARY_ASSET_API_KEY zorunlu.');
  }

  const response = await fetch(primaryAssetApi, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${primaryAssetApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      provider: 'railway-primary',
      engines: ['triposr', 'instantmesh'],
      deliveryTargets: ['production-storage', 'unity-addressables'],
      releaseChannel: 'live',
    }),
  });

  if (!response.ok) {
    throw new Error(`Primary asset isteği başarısız: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<{ result?: string; id?: string; status?: string }>;
}

export async function pushGeneratedModelToUnity(path: string, contentBase64: string, message: string) {
  requireProductionOnlyMode();
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (!token || !owner || !repo) throw new Error('GitHub env değişkenleri eksik.');

  const octokit = new Octokit({ auth: token });
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo,
    path: `unity-client/Assets/Models/Generated/${path}`,
    message,
    content: contentBase64,
  });
}
