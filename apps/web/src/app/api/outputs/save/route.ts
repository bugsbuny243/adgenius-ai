import { NextResponse } from 'next/server';

import { saveAgentOutput } from '@/lib/server/agent-service';

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);

    const body = (await request.json()) as {
      runId?: string;
      title?: string;
      content?: string;
    };

    const runId = body.runId?.trim();
    const content = body.content?.trim();
    const title = body.title?.trim();

    if (!runId || !content) {
      return NextResponse.json({ error: 'Kaydedilecek sonuç bulunamadı.' }, { status: 400 });
    }

    const result = await saveAgentOutput({
      accessToken: accessToken ?? undefined,
      runId,
      title,
      content,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ saved: result.data });
  } catch (error) {
    console.error('POST /api/outputs/save failed:', error);
    return NextResponse.json({ error: 'İşlem sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' }, { status: 500 });
  }
}
