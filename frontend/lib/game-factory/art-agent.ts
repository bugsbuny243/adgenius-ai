import { Octokit } from 'octokit';

export function extractArtKeywords(brief: string): string[] {
  return brief
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 8);
}

export async function requestMeshyModel(brief: string) {
  const apiKey = process.env.MESHY_API_KEY?.trim();
  if (!apiKey) throw new Error('MESHY_API_KEY eksik.');

  const keywords = extractArtKeywords(brief);
  const prompt = `game ready stylized 3d model, ${keywords.join(', ')}`;

  const response = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, art_style: 'realistic', topology: 'quad' }),
  });

  if (!response.ok) {
    throw new Error(`Meshy isteği başarısız: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<{ result?: string; id?: string; status?: string }>;
}

export async function pushGeneratedModelToUnity(path: string, contentBase64: string, message: string) {
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
