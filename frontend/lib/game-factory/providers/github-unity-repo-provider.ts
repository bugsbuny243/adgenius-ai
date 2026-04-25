import { getServerEnv } from '@/lib/env';

type GameProjectRef = {
  id: string;
  name: string;
  slug: string;
  game_type?: string | null;
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
  release_notes?: string | null;
};

type GeneratedUnityFile = { path: string; content: string };

const BLOCKED_PATTERNS = [/\.env/i, /\.jks$/i, /\.keystore$/i, /service.?account/i, /credentials?/i, /token/i];

function assertSafePath(path: string) {
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(path))) {
    throw new Error(`Güvenlik nedeniyle bu dosya yolu güncellenemez: ${path}`);
  }
}

function hashPrompt(prompt: string) {
  let hash = 0;
  for (let index = 0; index < prompt.length; index += 1) {
    hash = (hash * 31 + prompt.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;

  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = h / 60;
  const x = chroma * (1 - Math.abs((hPrime % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r = chroma;
    g = x;
  } else if (hPrime >= 1 && hPrime < 2) {
    r = x;
    g = chroma;
  } else if (hPrime >= 2 && hPrime < 3) {
    g = chroma;
    b = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    g = x;
    b = chroma;
  } else if (hPrime >= 4 && hPrime < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  const match = l - chroma / 2;
  const toHex = (value: number) => Math.round((value + match) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function paletteFromHash(hash: number) {
  const hue = hash % 360;
  const hue2 = (hue + 100) % 360;
  const hue3 = (hue + 200) % 360;
  return {
    playerColor: hslToHex(hue, 85, 60),
    groundColor: hslToHex(hue2, 40, 32),
    obstacleColor: hslToHex(hue3, 75, 52)
  };
}

function summarizePrompt(prompt: string) {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 140) return normalized;
  return `${normalized.slice(0, 137)}...`;
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
    const promptSummary = summarizePrompt(summary);
    const hashed = hashPrompt(gameBrief.prompt);
    const palette = paletteFromHash(hashed);
    const speedMultiplier = Number((1 + (hashed % 40) / 100).toFixed(2));
    const jumpForce = 6 + (hashed % 5);
    const config = {
      gameTitle: gameProject.name,
      packageName: gameProject.package_name,
      gameType: gameProject.game_type || 'runner_2d',
      promptSummary,
      playerColor: palette.playerColor,
      groundColor: palette.groundColor,
      obstacleColor: palette.obstacleColor,
      speedMultiplier,
      jumpForce,
      scoreLabel: 'Skor',
      releaseVersion: `${gameProject.current_version_name}+${gameProject.current_version_code}`
    };
    const csConfig = `using System;
using UnityEngine;

namespace Koschei.Generated
{
    [Serializable]
    public class KoscheiGeneratedGameConfig
    {
        public string gameTitle = ${JSON.stringify(config.gameTitle)};
        public string packageName = ${JSON.stringify(config.packageName)};
        public string gameType = ${JSON.stringify(config.gameType)};
        public string promptSummary = ${JSON.stringify(config.promptSummary)};
        public string playerColor = ${JSON.stringify(config.playerColor)};
        public string groundColor = ${JSON.stringify(config.groundColor)};
        public string obstacleColor = ${JSON.stringify(config.obstacleColor)};
        public float speedMultiplier = ${config.speedMultiplier}f;
        public float jumpForce = ${config.jumpForce}f;
        public string scoreLabel = ${JSON.stringify(config.scoreLabel)};
        public string releaseVersion = ${JSON.stringify(config.releaseVersion)};

        public static KoscheiGeneratedGameConfig LoadFromTextAsset(TextAsset jsonAsset)
        {
            if (jsonAsset == null || string.IsNullOrWhiteSpace(jsonAsset.text))
            {
                return new KoscheiGeneratedGameConfig();
            }

            return JsonUtility.FromJson<KoscheiGeneratedGameConfig>(jsonAsset.text) ?? new KoscheiGeneratedGameConfig();
        }
    }
}
`;

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
            generatedAt: new Date().toISOString(),
            generatedConfig: config
          },
          null,
          2
        )
      },
      {
        path: 'Assets/Koschei/Generated/koschei-game-config.json',
        content: JSON.stringify(config, null, 2)
      },
      {
        path: 'Assets/Koschei/Generated/KoscheiGeneratedGameConfig.cs',
        content: csConfig
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
