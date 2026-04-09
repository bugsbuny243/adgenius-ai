import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RequestPayload = {
  workspaceId: string;
  userId: string;
  agentSlug: string;
  userInput: string;
};

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

Deno.serve(async (request) => {
  const body = (await request.json()) as RequestPayload;
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

  const { data: agentType } = await supabase
    .from("agent_types")
    .select("id,system_prompt,model_alias")
    .eq("slug", body.agentSlug)
    .eq("is_active", true)
    .single();

  if (!agentType) {
    return new Response(JSON.stringify({ error: "Ajan tipi bulunamadı." }), { status: 404 });
  }

  const { data: run } = await supabase
    .from("agent_runs")
    .insert({
      workspace_id: body.workspaceId,
      user_id: body.userId,
      agent_type_id: agentType.id,
      agent_slug: body.agentSlug,
      user_input: body.userInput,
      model_name: agentType.model_alias,
      status: "running"
    })
    .select("id")
    .single();

  const llmResponse = await fetch(`${API_URL}?key=${Deno.env.get("GEMINI_API_KEY")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${agentType.system_prompt}\n\n${body.userInput}` }] }]
    })
  });

  const payload = await llmResponse.json();
  const resultText = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!run || !llmResponse.ok) {
    if (run) {
      await supabase.from("agent_runs").update({ status: "failed", error_message: "Model isteği başarısız." }).eq("id", run.id);
    }

    return new Response(JSON.stringify({ error: "Çalıştırma başarısız." }), { status: 500 });
  }

  await supabase
    .from("agent_runs")
    .update({
      status: "completed",
      result_text: resultText,
      tokens_input: payload?.usageMetadata?.promptTokenCount ?? null,
      tokens_output: payload?.usageMetadata?.candidatesTokenCount ?? null
    })
    .eq("id", run.id);

  return new Response(JSON.stringify({ runId: run.id, result: resultText }), {
    headers: { "Content-Type": "application/json" }
  });
});
