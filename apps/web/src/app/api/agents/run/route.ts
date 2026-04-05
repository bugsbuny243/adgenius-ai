import { NextResponse } from 'next/server';

import { runAgent } from '@/lib/server/agent-service';

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
    type?: string;
    userInput?: string;
    model?: string;
  };

  try {
    body = (await request.json()) as {
      type?: string;
      userInput?: string;
      model?: string;
    };
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const result = await runAgent({
    accessToken: accessToken ?? undefined,
    type: body.type,
    userInput: body.userInput,
    model: body.model,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    result: result.data.result,
    runId: result.data.run.id,
    createdAt: result.data.run.created_at,
  });
}
