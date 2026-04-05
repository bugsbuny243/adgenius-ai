import { NextResponse } from 'next/server';

import { saveAgentOutputAction } from '@/app/actions/agent-actions';

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

export async function POST(request: Request) {
  const accessToken = getAccessToken(request);

  const body = (await request.json()) as {
    runId?: string;
    title?: string;
    content?: string;
  };

  const result = await saveAgentOutputAction({
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
