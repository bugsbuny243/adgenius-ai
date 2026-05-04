const GENERATED_CONFIG_PATH = 'unity-client/Assets/Editor/koschei-build-config.json';
const GENERATED_SCRIPT_PATH = 'unity-client/Assets/Editor/AIGeneratedController.cs';

export interface UnityBuildConfigPayload {
  project_id: string;
  build_job_id: string;
  app_name: string;
  package_name: string;
  version_name: string;
  version_code: number;
  game_type: string;
  short_description: string;
  visual_style: string;
  controls: string;
  features: string[];
  target_platform: 'android';
}

type GithubContentFile = {
  type?: string;
  sha?: string;
  content?: string;
  encoding?: string;
};

function getGithubRepoConfig() {
  const owner = process.env.GITHUB_UNITY_REPO_OWNER?.trim();
  const repo = process.env.GITHUB_UNITY_REPO_NAME?.trim();
  const branch = process.env.GITHUB_UNITY_REPO_BRANCH?.trim();
  const token = process.env.GITHUB_UNITY_REPO_TOKEN?.trim();

  if (!owner || !repo || !branch || !token) {
    throw new Error('GitHub Unity repo yapılandırması eksik.');
  }

  return { owner, repo, branch, token };
}

async function githubContentsRequest(path: string, init?: RequestInit): Promise<Response> {
  const { token } = getGithubRepoConfig();
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });
}

async function getExistingFileSha(path: string, branch: string): Promise<string | null> {
  const response = await githubContentsRequest(`${path}?ref=${encodeURIComponent(branch)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Unity build config dosyası okunamadı.');

  const payload = (await response.json()) as GithubContentFile;
  return typeof payload.sha === 'string' && payload.sha.trim().length > 0 ? payload.sha.trim() : null;
}

async function putFile(path: string, branch: string, content: string, sha: string | null): Promise<void> {
  const response = await githubContentsRequest(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `chore: update koschei build config ${new Date().toISOString()}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {})
    })
  });

  if (!response.ok) throw new Error('Unity build config dosyası yazılamadı.');
}

async function verifyFileExists(path: string, branch: string): Promise<boolean> {
  const response = await githubContentsRequest(`${path}?ref=${encodeURIComponent(branch)}`);
  if (!response.ok) return false;

  const payload = (await response.json()) as GithubContentFile;
  return payload.type === 'file' && typeof payload.content === 'string' && payload.content.trim().length > 0;
}

export async function writeUnityBuildConfig(payload: UnityBuildConfigPayload): Promise<void> {
  const { owner, repo, branch } = getGithubRepoConfig();
  const encodedPath = GENERATED_CONFIG_PATH.split('/').map((part) => encodeURIComponent(part)).join('/');
  const apiPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;

  const content = `${JSON.stringify(payload, null, 2)}\n`;
  const sha = await getExistingFileSha(apiPath, branch);
  await putFile(apiPath, branch, content, sha);

  const verified = await verifyFileExists(apiPath, branch);
  if (!verified) throw new Error('Unity build config doğrulanamadı.');
}

export async function writeUnityGeneratedController(sourceCode: string, prompt: string): Promise<void> {
  const { owner, repo, branch } = getGithubRepoConfig();
  const encodedPath = GENERATED_SCRIPT_PATH.split('/').map((part) => encodeURIComponent(part)).join('/');
  const apiPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;

  const content = `${sourceCode.trim()}\n`;
  const sha = await getExistingFileSha(apiPath, branch);
  const commitPrefix = prompt.replace(/\s+/g, ' ').trim().slice(0, 72);
  const commitMessage = commitPrefix.length > 0
    ? `feat: update AI generated controller (${commitPrefix})`
    : `feat: update AI generated controller ${new Date().toISOString()}`;

  const response = await githubContentsRequest(apiPath, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMessage,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
      ...(sha ? { sha } : {})
    })
  });

  if (!response.ok) throw new Error('AI generated controller dosyası yazılamadı.');

  const verified = await verifyFileExists(apiPath, branch);
  if (!verified) throw new Error('AI generated controller doğrulanamadı.');
}
