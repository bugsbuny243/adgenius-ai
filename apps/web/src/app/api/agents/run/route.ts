import { NextResponse } from 'next/server';

import { runAgent } from '@/lib/server/agent-service';

function getAccessToken(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.replace('Bearer ', '').trim();
}

type RunRequestBody = {
  type: string;
  userInput: string;
  model?: string;
};

function createErrorResponse(status: number, code: string, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details: details ?? null,
      },
    },
    { status },
  );
}

function validateBody(body: unknown): { ok: true; data: RunRequestBody } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'İstek gövdesi bir JSON nesnesi olmalıdır.' };
  }

  const payload = body as Record<string, unknown>;
  const type = typeof payload.type === 'string' ? payload.type.trim() : '';
  const userInput = typeof payload.userInput === 'string' ? payload.userInput.trim() : '';
  const model = typeof payload.model === 'string' ? payload.model.trim() : undefined;

  if (!type) {
    return { ok: false, message: '`type` alanı zorunludur.' };
  }

  if (!userInput) {
    return { ok: false, message: '`userInput` alanı zorunludur.' };
  }

  if (type.length > 80) {
    return { ok: false, message: '`type` alanı çok uzun.' };
  }

  if (userInput.length > 12000) {
    return { ok: false, message: '`userInput` en fazla 12000 karakter olabilir.' };
  }

  if (model && model.length > 120) {
    return { ok: false, message: '`model` alanı çok uzun.' };
  }

  return {
    ok: true,
    data: {
      type,
      userInput,
      model,
    },
  };
}

export async function POST(request: Request) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    return createErrorResponse(401, 'UNAUTHORIZED', 'Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createErrorResponse(400, 'INVALID_JSON', 'Geçersiz istek gövdesi.');
  }

  const validation = validateBody(body);
  if (!validation.ok) {
    return createErrorResponse(422, 'VALIDATION_ERROR', validation.message);
  }

  const result = await runAgent({
    accessToken,
    type: validation.data.type,
    userInput: validation.data.userInput,
    model: validation.data.model,
  });

  if (!result.ok) {
    return createErrorResponse(400, 'RUN_FAILED', result.error);
  }

  return NextResponse.json({
    ok: true,
    result: result.data.result,
    runId: result.data.run.id,
    status: result.data.run.status,
    createdAt: result.data.run.created_at,
  });
}
