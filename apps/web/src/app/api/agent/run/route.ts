import { NextRequest, NextResponse } from "next/server";
import { runAgentWorkflow } from "@/lib/server/run-agent";

export const runtime = "nodejs";

type RequestBody = {
  workspaceId?: string;
  userId?: string;
  userInput?: string;
  agentSlug?: string;
};

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as RequestBody;

  if (!payload.workspaceId || !payload.userId || !payload.userInput || !payload.agentSlug) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  try {
    const result = await runAgentWorkflow({
      workspaceId: payload.workspaceId,
      userId: payload.userId,
      userInput: payload.userInput,
      agentSlug: payload.agentSlug
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "İşlem başarısız.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
