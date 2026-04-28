import 'server-only';

const BUILD_CONFIG_PATH = 'Assets/Koschei/Generated/koschei-build-config.json';
const BUILD_CONFIG_PATH_ENCODED = BUILD_CONFIG_PATH.split('/').map(encodeURIComponent).join('/');

export type KoscheiUnityBuildConfig = {
  unity_game_project_id: string;
  build_job_id: string;
  app_name: string;
  package_name: string;
  version_code: number;
  version_name: string;
  target_platform: 'android';
  game_brief: Record<string, unknown>;
};

export type WriteBuildConfigInput = {
  owner: string;
  repo: string;
  branch: string;
  payload: KoscheiUnityBuildConfig;
};

export type WriteBuildConfigResult = {
  branch: string;
  commitSha: string | null;
  path: string;
};

class GitHubApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
  }
}

function getConfig() {
  const token = process.env.GITHUB_UNITY_REPO_TOKEN?.trim();
  if (!token) {
    throw new Error('GITHUB_UNITY_REPO_TOKEN eksik.');
  }

  return { token };
}

async function githubRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = getConfig();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.toLowerCase().includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : (payload as { message?: string })?.message;
    throw new GitHubApiError(message || `GitHub API hatası: ${response.status}`, response.status);
  }

  return payload as T;
}

async function getExistingFileSha(owner: string, repo: string, branch: string): Promise<string | null> {
  try {
    const file = await githubRequest<{ sha?: string }>(
      `/repos/${owner}/${repo}/contents/${BUILD_CONFIG_PATH_ENCODED}?ref=${encodeURIComponent(branch)}`
    );
    return typeof file.sha === 'string' && file.sha ? file.sha : null;
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Unity template repository must include an Editor pre-build script that reads
 * Assets/Koschei/Generated/koschei-build-config.json and applies:
 * - PlayerSettings.productName
 * - PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, packageName)
 * - PlayerSettings.bundleVersion
 * - PlayerSettings.Android.bundleVersionCode
 */
export async function writeUnityBuildConfigToRepo(input: WriteBuildConfigInput): Promise<WriteBuildConfigResult> {
  const existingSha = await getExistingFileSha(input.owner, input.repo, input.branch);
  const contentJson = JSON.stringify(input.payload, null, 2);
  const encoded = Buffer.from(contentJson, 'utf8').toString('base64');

  const result = await githubRequest<{ commit?: { sha?: string } }>(`/repos/${input.owner}/${input.repo}/contents/${BUILD_CONFIG_PATH_ENCODED}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: `chore(build): write Koschei build config for ${input.payload.build_job_id}`,
        content: encoded,
        branch: input.branch,
        ...(existingSha ? { sha: existingSha } : {})
      })
    }
  );

  return {
    branch: input.branch,
    commitSha: result.commit?.sha ?? null,
    path: BUILD_CONFIG_PATH
  };
}
