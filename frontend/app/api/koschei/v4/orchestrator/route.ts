import { NextResponse } from 'next/server';
import { runTextWithAiEngine } from '@/lib/ai-engine';
import { generateMultiplayerBlueprint, matchmakingSchemaSql } from '@/lib/game-factory/multiplayer-agent';
import { requestPrimaryAssetModel, pushGeneratedModelToUnity } from '@/lib/game-factory/art-agent';

function sanitizeCSharpOutput(raw: string): string {
  const cleaned = raw.replace(/```csharp|```cs|```/gi, '').trim();
  const lines = cleaned.split('\n');
  const seen = new Set<string>();
  return lines
    .filter((line) => {
      const normalized = line.trim();
      if (!normalized.startsWith('var csharpCode')) return true;
      if (seen.has('csharpCode')) return false;
      seen.add('csharpCode');
      return true;
    })
    .join('\n');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { gameIdea?: string; gameName?: string; brief?: string };
    const gameIdea = String(body.gameIdea ?? '').trim();
    const gameName = String((body.gameName ?? gameIdea) || 'Koschei').trim();
    if (!gameIdea) return NextResponse.json({ ok: false, error: 'gameIdea zorunlu.' }, { status: 400 });

    const [csharpResult, multiplayerResult, artResult] = await Promise.all([
      runTextWithAiEngine({
        agentSlug: 'yazilim',
        agentMode: 'orchestrator',
        userInput: `Unity için şu fikre göre bir C# gameplay script üret: ${gameIdea}`,
        systemPrompt: 'Yalnızca derlenebilir C# kodu üret.',
      }),
      Promise.resolve(generateMultiplayerBlueprint(gameName, 'netcode')),
      requestPrimaryAssetModel(body.brief ?? gameIdea),
    ]);

    const csharpCode = sanitizeCSharpOutput(csharpResult.text);
    const artFileName = `${gameName.replace(/\W+/g, '_').toLowerCase()}_${Date.now()}.glb`;
    await pushGeneratedModelToUnity(artFileName, Buffer.from(JSON.stringify(artResult), 'utf8').toString('base64'), `feat(art): add ${artFileName}`);

    return NextResponse.json({
      ok: true,
      mode: 'koschei-v4',
      generated: {
        csharpCode,
        multiplayer: multiplayerResult,
        primaryAssetGenerator: artResult,
        matchmaking: {
          engine: 'supabase-realtime',
          table: 'matchmaking_queue',
          schemaSql: matchmakingSchemaSql(),
        },
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' }, { status: 500 });
  }
}
