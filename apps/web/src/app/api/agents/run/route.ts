import { NextResponse } from 'next/server';

import { runAgent } from '@/lib/server/agent-service';

export const maxDuration = 60;

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

function resolveStatusCode(error: string) {
  if (error.includes('Oturum bulunamadı')) {
    return 401;
  }

  if (error.includes('limitine ulaştınız')) {
    return 429;
  }

  if (error.includes('Görevini yaz')) {
    return 422;
  }

  return 400;
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);

    const body = (await request.json()) as {
      type?: string;
      userInput?: string;
      model?: string;
    };

    const result = await runAgent({
      accessToken: accessToken ?? undefined,
      type: body.type,
      userInput: body.userInput,
      model: body.model,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: resolveStatusCode(result.error) });
    }

    return NextResponse.json({
      result: result.data.result,
      runId: result.data.run.id,
      createdAt: result.data.run.created_at,
      status: result.data.run.status,
      usage: result.data.usage,
    });
  } catch (error) {
    console.error('POST /api/agents/run failed:', error);
    return NextResponse.json({ error: 'İşlem sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
