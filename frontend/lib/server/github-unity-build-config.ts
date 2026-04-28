import 'server-only';

interface WriteConfigParams {
  owner: string;
  repo: string;
  branch: string;
  payload: {
    project_id: string;
    build_job_id: string;
    app_name: string;
    package_name: string;
    version_code: number;
    version_name: string;
    target_platform: string;
  };
}

interface WriteConfigResult {
  branch: string;
  commitSha: string | null;
  path: string;
}

export async function writeUnityBuildConfigToRepo(
  params: WriteConfigParams
): Promise<WriteConfigResult> {
  const token = process.env.GITHUB_UNITY_REPO_TOKEN?.trim();
  if (!token) throw new Error('GITHUB_UNITY_REPO_TOKEN eksik.');

  const { owner, repo, branch, payload } = params;
  const path = 'Assets/Koschei/Generated/koschei-build-config.json';
  const content = JSON.stringify(payload, null, 2);
  const base64Content = Buffer.from(content).toString('base64');

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Mevcut dosyayı al (SHA için)
  let existingSha: string | undefined;
  try {
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers }
    );
    if (getRes.ok) {
      const data = await getRes.json();
      existingSha = data.sha;
    }
  } catch {
    // Dosya yok, ilk kez oluşturulacak
  }

  // Dosyayı yaz
  const body: Record<string, unknown> = {
    message: `chore: update koschei build config for ${payload.package_name} v${payload.version_name}`,
    content: base64Content,
    branch,
  };
  if (existingSha) body.sha = existingSha;

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers, body: JSON.stringify(body) }
  );

  if (!putRes.ok) {
    const err = await putRes.text().catch(() => '');
    throw new Error(`GitHub config yazma hatası ${putRes.status}: ${err}`);
  }

  const putData = await putRes.json();
  const commitSha: string | null = putData?.commit?.sha ?? null;

  return { branch, commitSha, path };
}
