const githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

type GitHubFileResponse = {
  sha?: string;
};

async function githubRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!githubToken) {
    throw new Error("Missing GITHUB_PERSONAL_ACCESS_TOKEN environment variable.");
  }

  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as T;
}

export async function pushCodeToGitHub(fileName: string, csharpCode: string) {
  const owner = "SENIN_GITHUB_KULLANICI_ADIN";
  const repo = "koschei-monorepo";
  const path = `Assets/Scripts/KoscheiAI/${fileName}`;
  const contentEncoded = Buffer.from(csharpCode, "utf8").toString("base64");

  let sha: string | undefined;
  try {
    const existingFile = await githubRequest<GitHubFileResponse>(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    );
    sha = existingFile.sha;
  } catch {
    // File may not exist yet; continue without SHA for create semantics.
  }

  await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `🤖 Koschei Agent: ${fileName} otonom olarak üretildi ve eklendi.`,
      content: contentEncoded,
      ...(sha ? { sha } : {}),
    }),
  });
}
