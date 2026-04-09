import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

Deno.serve(async (req) => {
  const body = await req.json();
  const { projectId, prompt, userId } = body;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const systemPrompt = `
You are Gemini working as the full backend brain for Koschei platform.
Return JSON with keys: strategy, creatives, funnel, kpiAlerts.
Optimize for ads growth and 1M user scale.
`;

  const geminiResponse = await fetch(`${GEMINI_URL}?key=${Deno.env.get("GEMINI_API_KEY")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\nUser:${userId}\nPrompt:${prompt}` }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  const payload = await geminiResponse.json();
  const generated = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  const { error } = await supabase.from("agent_runs").insert({
    project_id: projectId,
    agent_name: "gemini-orchestrator",
    status: geminiResponse.ok ? "completed" : "failed",
    input: { prompt, userId },
    output: JSON.parse(generated),
    tokens_used: payload?.usageMetadata?.totalTokenCount ?? 0
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, data: JSON.parse(generated) }), {
    headers: { "Content-Type": "application/json" }
  });
});
