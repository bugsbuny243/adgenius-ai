import { NextResponse } from 'next/server';

import { runAgent } from '@/lib/server/agent-service';

const TYPE_REGEX = /^[a-z0-9-]{2,64}$/;

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

  const type = body.type?.trim();
  const userInput = body.userInput?.trim();

  if (!type || !TYPE_REGEX.test(type)) {
    return NextResponse.json({ error: 'Geçerli bir agent type girin.' }, { status: 400 });
  }

  if (!userInput || userInput.length < 3 || userInput.length > 8000) {
    return NextResponse.json({ error: 'Prompt 3-8000 karakter aralığında olmalı.' }, { status: 400 });
  }

  const result = await runAgent({
    accessToken: accessToken ?? undefined,
    type,
    userInput,
    model: body.model,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    result: result.data.result,
    runId: result.data.run.id,
    status: result.data.run.status,
    createdAt: result.data.run.created_at,
  });
}
