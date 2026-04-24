import { getServerEnv } from '@/lib/env';

type GameProjectRef = {
  id: string;
  name: string;
  slug: string;
  package_name: string;
  unity_branch: string | null;
  current_version_code: number;
  current_version_name: string;
};

type GameBriefRef = {
  prompt: string;
  generated_summary: string | null;
  store_short_description: string | null;
  store_full_description: string | null;
};

type GeneratedUnityFile = { path: string; content: string };

const BLOCKED_PATTERNS = [/\.env/i, /\.jks$/i, /\.keystore$/i, /service.?account/i, /credentials?/i, /token/i];

function assertSafePath(path: string) {
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(path))) {
    throw new Error(`Güvenlik nedeniyle bu dosya yolu güncellenemez: ${path}`);
  }
}

export class GitHubUnityRepoProvider {
  private readonly env = getServerEnv();

  private getConfig(gameProject: GameProjectRef) {
    const repoOwner = this.env.GITHUB_UNITY_REPO_OWNER;
    const repoName = this.env.GITHUB_UNITY_REPO_NAME;
    const token = this.env.GITHUB_UNITY_REPO_TOKEN;
    const branch = gameProject.unity_branch || this.env.GITHUB_UNITY_REPO_BRANCH || 'main';

    if (!repoOwner || !repoName || !token) {
      throw new Error('GitHub Unity repo ayarları eksik. GITHUB_UNITY_REPO_OWNER, GITHUB_UNITY_REPO_NAME ve GITHUB_UNITY_REPO_TOKEN zorunludur.');
    }

    return { owner: repoOwner, repo: repoName, token, branch };
  }

  async generateUnityProjectFiles(gameProject: GameProjectRef, gameBrief: GameBriefRef): Promise<GeneratedUnityFile[]> {
    const summary = gameBrief.generated_summary || gameBrief.prompt;
    return [
      {
        path: 'Assets/Koschei/Generated/game_factory_brief.json',
        content: JSON.stringify(
          {
            projectId: gameProject.id,
            name: gameProject.name,
            slug: gameProject.slug,
            packageName: gameProject.package_name,
            prompt: gameBrief.prompt,
            summary,
            shortDescription: gameBrief.store_short_description,
            fullDescription: gameBrief.store_full_description,
            generatedAt: new Date().toISOString()
          },
          null,
          2
        )
      },
      {
        path: 'Assets/Koschei/Generated/version.txt',
        content: `${gameProject.current_version_name}+${gameProject.current_version_code}`
      }
    ];
  }

  async commitUnityProjectChanges(gameProject: GameProjectRef, files: GeneratedUnityFile[]): Promise<{ commitSha: string }> {
    const { owner, repo, branch, token } = this.getConfig(gameProject);
    files.forEach((file) => assertSafePath(file.path));

    const latest = await this.getLatestCommit(gameProject);
    const baseTreeSha = latest.treeSha;

    const treeItems = files.map((file) => ({
      path: file.path,
      mode: '100644',
      type: 'blob',
      content: file.content
    }));

    const treeResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
    });

    if (!treeResp.ok) {
      throw new Error(`GitHub tree oluşturma başarısız: ${treeResp.status} ${await treeResp.text()}`);
    }

    const treeData = await treeResp.json();

    const commitResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Game Factory: ${gameProject.slug} Unity dosya güncellemesi`,
        tree: treeData.sha,
        parents: [latest.commitSha]
      })
    });

    if (!commitResp.ok) {
      throw new Error(`GitHub commit başarısız: ${commitResp.status} ${await commitResp.text()}`);
    }

    const commitData = await commitResp.json();

    const refResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sha: commitData.sha, force: false })
    });

    if (!refResp.ok) {
      throw new Error(`GitHub branch güncellemesi başarısız: ${refResp.status} ${await refResp.text()}`);
    }

    return { commitSha: commitData.sha as string };
  }

  async getLatestCommit(gameProject: GameProjectRef): Promise<{ commitSha: string; treeSha: string }> {
    const { owner, repo, branch, token } = this.getConfig(gameProject);
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${branch}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    });

    if (!resp.ok) {
      throw new Error(`GitHub son commit alınamadı: ${resp.status} ${await resp.text()}`);
    }

    const data = await resp.json();
    return {
      commitSha: data.sha as string,
      treeSha: data.commit.tree.sha as string
    };
  }
}
