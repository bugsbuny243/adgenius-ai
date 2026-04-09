import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";
const DEFAULT_MODEL = "gemini-2.5-pro";

type OrchestratorPayload = {
  workspaceId: string;
  userId: string;
  agentTypeSlug: string;
  userInput: string;
  modelName?: string;
  metadata?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const payload = (await req.json()) as OrchestratorPayload;
  const modelName = payload.modelName ?? DEFAULT_MODEL;

  const { data: agentType, error: typeError } = await supabase
    .from("agent_types")
    .select("id,system_prompt,is_active")
    .eq("slug", payload.agentTypeSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (typeError || !agentType) {
    return new Response(JSON.stringify({ ok: false, error: "Agent type not found or inactive." }), { status: 400 });
  }

  const { data: queuedRun, error: insertError } = await supabase
    .from("agent_runs")
    .insert({
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      agent_type_id: agentType.id,
      status: "running",
      model_name: modelName,
      user_input: payload.userInput,
      metadata: payload.metadata ?? {},
      tokens_input: null,
      tokens_output: null
    })
    .select("id")
    .single();

  if (insertError || !queuedRun) {
    return new Response(JSON.stringify({ ok: false, error: insertError?.message ?? "Run insert failed." }), { status: 500 });
  }

  const geminiRes = await fetch(`${GEMINI_URL}?key=${Deno.env.get("GEMINI_API_KEY")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${agentType.system_prompt}\n\n${payload.userInput}` }] }],
      generationConfig: { responseMimeType: "text/plain" }
    })
  });

  const geminiJson = await geminiRes.json();
  const resultText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  const tokensInput = geminiJson?.usageMetadata?.promptTokenCount ?? null;
  const tokensOutput = geminiJson?.usageMetadata?.candidatesTokenCount ?? null;

  if (!geminiRes.ok || !resultText) {
    await supabase
      .from("agent_runs")
      .update({
        status: "failed",
        error_message: geminiJson?.error?.message ?? "Gemini request failed.",
        tokens_input: tokensInput,
        tokens_output: tokensOutput
      })
      .eq("id", queuedRun.id);

    return new Response(JSON.stringify({ ok: false, runId: queuedRun.id, error: geminiJson?.error ?? "Gemini failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }

  await supabase
    .from("agent_runs")
    .update({
      status: "completed",
      result_text: resultText,
      error_message: null,
      tokens_input: tokensInput,
      tokens_output: tokensOutput
    })
    .eq("id", queuedRun.id);

  return new Response(
    JSON.stringify({
      ok: true,
      runId: queuedRun.id,
      result: resultText,
      usage: { tokensInput, tokensOutput }
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
