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
  const accessToken = getAccessToken(request);

  let body: {
    runId?: string;
    title?: string;
    content?: string;
  };

  try {
    body = (await request.json()) as {
      runId?: string;
      title?: string;
      content?: string;
    };
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const result = await saveAgentOutput({
    accessToken: accessToken ?? undefined,
    runId: body.runId,
    title: body.title,
    content: body.content,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ saved: result.data });
}
