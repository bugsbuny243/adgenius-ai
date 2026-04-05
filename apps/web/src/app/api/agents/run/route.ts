import { NextResponse } from 'next/server';

import { runAgent } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      systemPrompt?: string;
      userInput?: string;
    };

    if (!body.systemPrompt || !body.userInput) {
      return NextResponse.json({ error: 'systemPrompt ve userInput zorunludur.' }, { status: 400 });
    }

    const result = await runAgent({
      systemPrompt: body.systemPrompt,
      userInput: body.userInput,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
