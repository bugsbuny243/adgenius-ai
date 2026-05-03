import { NextResponse } from 'next/server';
import { runTextWithAiEngine } from '@/lib/ai-engine';
import { triggerUnityCloudBuild } from '@/lib/server/unity-cloud-build';

type V4Body = {
  gameIdea?: string;
  gameName?: string;
};

function sanitizeCSharpOutput(raw: string): string {
  return raw
    .replace(/```csharp/gi, '')
    .replace(/```cs/gi, '')
    .replace(/```/g, '')
    .trim();
}

function toSafeClassName(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'KoscheiGenerated';
  return words.map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase()).join('');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as V4Body | null;
    const gameIdea = String(body?.gameIdea ?? '').trim();

    if (!gameIdea) {
      return NextResponse.json({ ok: false, error: 'gameIdea zorunludur.' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_PERSONAL_ACCESS_TOKEN?.trim();
    const owner = process.env.GITHUB_OWNER?.trim();
    const repo = process.env.GITHUB_REPO?.trim();

    if (!githubToken || !owner || !repo) {
      return NextResponse.json(
        { ok: false, error: 'GITHUB_PERSONAL_ACCESS_TOKEN, GITHUB_OWNER veya GITHUB_REPO eksik.' },
        { status: 500 }
      );
    }

    const [coderResult, artDirectorResult] = await Promise.all([
      runTextWithAiEngine({
        agentSlug: 'yazilim',
        agentMode: 'orchestrator',
        userInput: `Unity için şu fikre göre tek bir C# script üret: ${gameIdea}. Sadece saf C# kodu dön.`,
        systemPrompt: 'Sen kıdemli Unity C# geliştiricisisin. Yalnızca derlenebilir C# kodu üret.'
      }),
      runTextWithAiEngine({
        agentSlug: 'arastirma',
        agentMode: 'analysis',
        userInput: `Şu oyun fikri için 3D model ve asset üretim promptları hazırla: ${gameIdea}`,
        systemPrompt:
          'Sen bir Art Director agentsın. Unity odaklı, uygulanabilir asset listesi ve üretim promptları üret.'
      })
    ]);

    const sanitizedCode = sanitizeCSharpOutput(coderResult.text);
    const baseName = toSafeClassName(body?.gameName || gameIdea);
    const timestamp = Date.now();
    const fileName = `${baseName}_${timestamp}.cs`;
    const path = `unity-client/Assets/Scripts/KoscheiGenerated/${fileName}`;

    const githubApiResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `feat(koschei-v4): generate ${fileName}`,
        content: Buffer.from(sanitizedCode, 'utf8').toString('base64')
      })
    });

    if (!githubApiResponse.ok) {
      const errorText = await githubApiResponse.text();
      throw new Error(`GitHub dosya yazma hatası: ${githubApiResponse.status} ${errorText}`);
    }

    const unityBuild = await triggerUnityCloudBuild();

    return NextResponse.json({
      ok: true,
      mode: 'koschei-v4',
      generated: {
        scriptPath: path,
        csharp: sanitizedCode,
        artPrompts: artDirectorResult.text
      },
      unityBuild
    });
  } catch (error) {
    console.error('[koschei-v4/orchestrator] error', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen sunucu hatası.'
      },
      { status: 500 }
    );
  }
}
