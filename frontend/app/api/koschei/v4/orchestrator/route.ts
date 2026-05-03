import { NextResponse } from 'next/server';
import { runTextWithAiEngine } from '@/lib/ai-engine';
import { generateMultiplayerBlueprint, matchmakingSchemaSql } from '@/lib/game-factory/multiplayer-agent';
import { requestMeshyModel, pushGeneratedModelToUnity } from '@/lib/game-factory/art-agent';

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
    const body = (await request.json()) as { gameIdea?: string; gameName?: string; brief?: string; planKey?: 'starter' | 'pro' | 'studio' | 'multiplayer' };
    const gameIdea = String(body.gameIdea ?? '').trim();
    const gameName = String((body.gameName ?? gameIdea) || 'Koschei').trim();
    if (!gameIdea) return NextResponse.json({ ok: false, error: 'gameIdea zorunlu.' }, { status: 400 });

    const planKey = body.planKey ?? 'starter';
    const packageProfiles = {
      starter: {
        csharpDepth: 'clean-medium',
        netcodeComplexity: 'foundational',
        systemHint: 'C# kodunu okunabilir, modüler ve production-friendly yaz.'
      },
      pro: {
        csharpDepth: 'advanced',
        netcodeComplexity: 'intermediate',
        systemHint: 'C# kodunda service katmanı, monetization hookları ve 3rd-party entegrasyon noktaları kullan.'
      },
      studio: {
        csharpDepth: 'expert',
        netcodeComplexity: 'advanced',
        systemHint: 'C# kodunda event-driven mimari, genişletilebilir state management ve canlı operasyon uyumluluğu kur.'
      },
      multiplayer: {
        csharpDepth: 'elite',
        netcodeComplexity: 'high-scale',
        systemHint: 'C# kodunda yüksek ölçekli netcode, authoritative server pattern ve gecikme toleranslı senkronizasyon tasarla.'
      }
    } as const;
    const selectedProfile = packageProfiles[planKey];

    const [csharpResult, multiplayerResult, artResult] = await Promise.all([
      runTextWithAiEngine({
        agentSlug: 'yazilim',
        agentMode: 'orchestrator',
        userInput: `Paket: ${planKey} | C# derinliği: ${selectedProfile.csharpDepth} | Fikir: ${gameIdea}`,
        systemPrompt: `Yalnızca derlenebilir C# kodu üret. ${selectedProfile.systemHint}`,
      }),
      Promise.resolve(generateMultiplayerBlueprint(gameName, selectedProfile.netcodeComplexity)),
      requestMeshyModel(body.brief ?? gameIdea),
    ]);

    const csharpCode = sanitizeCSharpOutput(csharpResult.text);
    const artFileName = `${gameName.replace(/\W+/g, '_').toLowerCase()}_${Date.now()}.glb`;
    await pushGeneratedModelToUnity(artFileName, Buffer.from(JSON.stringify(artResult), 'utf8').toString('base64'), `feat(art): add ${artFileName}`);

    return NextResponse.json({
      ok: true,
      mode: 'koschei-v4',
      packageProfile: {
        planKey,
        csharpDepth: selectedProfile.csharpDepth,
        netcodeComplexity: selectedProfile.netcodeComplexity,
      },
      generated: {
        csharpCode,
        multiplayer: multiplayerResult,
        meshy: artResult,
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
