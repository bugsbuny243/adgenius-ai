import 'server-only';

import { getApiAuthContext, json } from '@/app/api/game-factory/_auth';
import { requireActiveGameAgentPackage } from '@/lib/game-agent-access';
import { runTextWithAiEngine } from '@/lib/ai-engine';
import { GitHubUnityRepoProvider } from '@/lib/game-factory/providers/github-unity-repo-provider';
import { UnityCloudBuildProvider } from '@/lib/game-factory/providers/unity-cloud-build-provider';

type GenerateRequest = { prompt?: unknown };

type MonetizationMode = 'admob' | 'iap' | 'admob+iap' | 'none';

type GameParameters = {
  gameName: string;
  gameType: string;
  graphics: {
    palette: string[];
    background: string;
  };
  mechanics: string[];
  monetization: MonetizationMode;
  platforms: string[];
};

type GeneratedUnityFile = { path: string; content: string };

const DEFAULT_PARAMETERS: GameParameters = {
  gameName: 'Koschei Runner',
  gameType: 'runner_2d',
  graphics: {
    palette: ['#4F46E5', '#06B6D4', '#22C55E'],
    background: 'Neon city skyline'
  },
  mechanics: ['Sonsuz koşu', 'Engelden kaçınma', 'Skor toplama'],
  monetization: 'admob',
  platforms: ['android']
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toSlug(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function inferMonetization(prompt: string): MonetizationMode {
  const normalized = prompt.toLowerCase();
  const hasAdmob = /admob|reklam|ads|rewarded/.test(normalized);
  const hasIap = /iap|in-app|in app|satın al|purchase|premium/.test(normalized);
  if (hasAdmob && hasIap) return 'admob+iap';
  if (hasIap) return 'iap';
  if (hasAdmob) return 'admob';
  return 'admob';
}

function sanitizePalette(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_PARAMETERS.graphics.palette;

  const palette = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

  return palette.length > 0 ? palette : DEFAULT_PARAMETERS.graphics.palette;
}

function sanitizePlatforms(value: unknown): string[] {
  if (!Array.isArray(value)) return ['android'];
  const platforms = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const normalized = new Set(platforms.map((platform) => (platform === 'google-play' ? 'android' : platform)));
  if (!normalized.has('android')) normalized.add('android');
  return Array.from(normalized);
}

function sanitizeMechanics(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_PARAMETERS.mechanics;
  const mechanics = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);

  return mechanics.length > 0 ? mechanics : DEFAULT_PARAMETERS.mechanics;
}

function normalizeGameParameters(raw: Partial<GameParameters>, prompt: string): GameParameters {
  const gameName = isNonEmptyString(raw.gameName) ? raw.gameName.trim() : DEFAULT_PARAMETERS.gameName;
  const gameType = isNonEmptyString(raw.gameType) ? raw.gameType.trim().toLowerCase() : DEFAULT_PARAMETERS.gameType;
  const background = isNonEmptyString(raw.graphics?.background)
    ? raw.graphics.background.trim()
    : DEFAULT_PARAMETERS.graphics.background;
  const monetization =
    raw.monetization === 'admob' || raw.monetization === 'iap' || raw.monetization === 'admob+iap' || raw.monetization === 'none'
      ? raw.monetization
      : inferMonetization(prompt);

  return {
    gameName,
    gameType,
    graphics: {
      palette: sanitizePalette(raw.graphics?.palette),
      background
    },
    mechanics: sanitizeMechanics(raw.mechanics),
    monetization,
    platforms: sanitizePlatforms(raw.platforms)
  };
}

function extractJsonObject(text: string): string {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return text;
  return text.slice(first, last + 1);
}

async function analyzePrompt(prompt: string): Promise<GameParameters> {
  try {
    const ai = await runTextWithAiEngine({
      agentSlug: 'yazilim',
      agentMode: 'analysis',
      systemPrompt:
        'Sen bir oyun sistem mimarısısın. Sadece JSON üret. Şema: {"gameName":string,"gameType":string,"graphics":{"palette":string[],"background":string},"mechanics":string[],"monetization":"admob"|"iap"|"admob+iap"|"none","platforms":string[]}',
      userInput: `Kullanıcı promptu: ${prompt}`
    });

    const jsonText = extractJsonObject(ai.text.trim());
    const parsed = JSON.parse(jsonText) as Partial<GameParameters>;
    return normalizeGameParameters(parsed, prompt);
  } catch (error) {
    console.warn('[game-factory/generate] prompt analysis fallback', {
      message: error instanceof Error ? error.message : String(error)
    });
    return normalizeGameParameters({}, prompt);
  }
}

function buildUnityScripts(params: GameParameters): GeneratedUnityFile[] {
  const mechanicList = params.mechanics.map((item) => `        \"${item.replace(/"/g, '\\"')}\"`).join(',\n');
  const paletteList = params.graphics.palette.map((item) => `        \"${item.replace(/"/g, '\\"')}\"`).join(',\n');

  const playerController = `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public float moveSpeed = 6f;
    public float jumpForce = 8f;
    private Rigidbody2D rb;
    private bool isGrounded;

    void Start()
    {
        rb = GetComponent<Rigidbody2D>();
        Debug.Log("Game: ${params.gameName} | Type: ${params.gameType}");
    }

    void Update()
    {
        transform.Translate(Vector2.right * moveSpeed * Time.deltaTime);

        if ((Input.GetKeyDown(KeyCode.Space) || Input.touchCount > 0) && isGrounded)
        {
            rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
            isGrounded = false;
        }
    }

    void OnCollisionEnter2D(Collision2D collision)
    {
        if (collision.gameObject.CompareTag("Ground"))
        {
            isGrounded = true;
        }
    }
}
`;

  const enemySpawner = `using UnityEngine;

public class EnemySpawner : MonoBehaviour
{
    public GameObject[] enemyPrefabs;
    public float spawnInterval = 1.8f;
    public Transform spawnPoint;

    private float timer;

    void Update()
    {
        timer += Time.deltaTime;
        if (timer >= spawnInterval)
        {
            SpawnEnemy();
            timer = 0f;
        }
    }

    void SpawnEnemy()
    {
        if (enemyPrefabs == null || enemyPrefabs.Length == 0 || spawnPoint == null)
        {
            return;
        }

        var randomPrefab = enemyPrefabs[Random.Range(0, enemyPrefabs.Length)];
        Instantiate(randomPrefab, spawnPoint.position, Quaternion.identity);
    }
}
`;

  const gameManager = `using System.Collections.Generic;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance;

    public string gameName = "${params.gameName.replace(/"/g, '\\"')}";
    public string gameType = "${params.gameType.replace(/"/g, '\\"')}";
    public string backgroundTheme = "${params.graphics.background.replace(/"/g, '\\"')}";

    public List<string> mechanics = new List<string>
    {
${mechanicList}
    };

    public List<string> palette = new List<string>
    {
${paletteList}
    };

    private int score;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void AddScore(int amount)
    {
        score += amount;
    }

    public int GetScore()
    {
        return score;
    }
}
`;

  const adManager = `using UnityEngine;

public class AdManager : MonoBehaviour
{
    public string monetizationMode = "${params.monetization}";

    public void TryShowInterstitial()
    {
        if (monetizationMode == "admob" || monetizationMode == "admob+iap")
        {
            Debug.Log("AdMob interstitial gösterimi tetiklendi.");
        }
    }

    public bool IsIapEnabled()
    {
        return monetizationMode == "iap" || monetizationMode == "admob+iap";
    }
}
`;

  return [
    { path: 'Assets/Scripts/PlayerController.cs', content: playerController },
    { path: 'Assets/Scripts/EnemySpawner.cs', content: enemySpawner },
    { path: 'Assets/Scripts/GameManager.cs', content: gameManager },
    { path: 'Assets/Scripts/AdManager.cs', content: adManager },
    {
      path: 'Assets/Scripts/GameConfig.generated.json',
      content: JSON.stringify(
        {
          gameName: params.gameName,
          gameType: params.gameType,
          graphics: params.graphics,
          mechanics: params.mechanics,
          monetization: params.monetization,
          platforms: params.platforms,
          generatedAt: new Date().toISOString()
        },
        null,
        2
      )
    }
  ];
}

export async function POST(request: Request) {
  const context = await getApiAuthContext(request);
  if (context instanceof Response) return context;

  const packageGateResponse = await requireActiveGameAgentPackage(context.supabase, context.userId, context.workspaceId);
  if (packageGateResponse) return packageGateResponse;

  const body = (await request.json().catch(() => null)) as GenerateRequest | null;
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';

  if (!prompt) {
    return json({ ok: false, error: 'prompt zorunlu.' }, 400);
  }

  const gameParameters = await analyzePrompt(prompt);
  const slug = toSlug(gameParameters.gameName) || `generated-${Date.now()}`;
  const packageName = `com.koschei.generated.${slug.replace(/-/g, '')}`;

  const { data: project, error: projectError } = await context.supabase
    .from('unity_game_projects')
    .insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      app_name: gameParameters.gameName,
      user_prompt: prompt,
      package_name: packageName,
      target_platform: 'android',
      game_type: gameParameters.gameType,
      status: 'queued',
      approval_status: 'approved',
      game_brief: {
        generatedBy: 'ai-game-architect',
        ...gameParameters
      }
    })
    .select('id, app_name, package_name, game_type, current_version_code, current_version_name')
    .single();

  if (projectError || !project) {
    return json({ ok: false, error: projectError?.message ?? 'Proje kaydedilemedi.' }, 400);
  }

  try {
    const githubProvider = new GitHubUnityRepoProvider();
    const unityProvider = new UnityCloudBuildProvider();

    const files = buildUnityScripts(gameParameters);
    const commitResult = await githubProvider.commitUnityProjectChanges(
      {
        id: project.id,
        name: project.app_name,
        slug,
        package_name: project.package_name,
        game_type: project.game_type,
        unity_branch: null,
        current_version_code: project.current_version_code ?? 1,
        current_version_name: project.current_version_name ?? '1.0.0'
      },
      files
    );

    const buildResult = await unityProvider.triggerBuild({ id: project.id });
    const queuedAt = new Date().toISOString();

    const { data: job, error: jobError } = await context.supabase
      .from('unity_build_jobs')
      .insert({
        unity_game_project_id: project.id,
        workspace_id: context.workspaceId,
        requested_by: context.userId,
        build_target: 'android',
        build_type: 'release',
        build_target_id: process.env.UNITY_BUILD_TARGET_ID ?? null,
        status: buildResult.status === 'failed' ? 'failed' : 'queued',
        queued_at: queuedAt,
        external_build_id: buildResult.externalBuildId,
        metadata: {
          prompt,
          gameParameters,
          unityBuildNumber: buildResult.externalBuildId ? Number(buildResult.externalBuildId) : null,
          unityBuildTargetId: process.env.UNITY_BUILD_TARGET_ID ?? null,
          templateCommitSha: commitResult.commitSha
        }
      })
      .select('id')
      .single();

    if (jobError || !job) {
      return json({ ok: false, error: jobError?.message ?? 'Build işi kaydedilemedi.' }, 400);
    }

    await context.supabase.from('unity_game_projects').update({ status: 'building' }).eq('id', project.id);

    return json({
      ok: true,
      projectId: project.id,
      buildJobId: job.id,
      estimatedTime: '10-15 dakika'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generate pipeline başarısız.';

    await context.supabase
      .from('unity_game_projects')
      .update({ status: 'build_failed' })
      .eq('id', project.id)
      .eq('workspace_id', context.workspaceId)
      .eq('user_id', context.userId);

    return json({ ok: false, error: message }, 502);
  }
}
