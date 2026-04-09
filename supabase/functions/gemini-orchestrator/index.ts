import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

type OrchestratorPayload = {
  projectId?: string;
  prompt?: string;
  userId?: string;
};

const safeJsonParse = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return {
      strategy: "Gemini çıktısı JSON parse edilemedi.",
      creatives: [],
      funnel: [],
      kpiAlerts: [],
      raw
    };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Only POST is supported" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const body: OrchestratorPayload = await req.json();
  const projectId = body.projectId?.trim() || "default-project";
  const prompt = body.prompt?.trim();
  const userId = body.userId?.trim() || "anonymous";

  if (!prompt) {
    return new Response(JSON.stringify({ ok: false, error: "prompt is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const systemPrompt = `You are Gemini acting as the backend intelligence layer for Koschei frontend.
Return only strict JSON with this shape:
{
  "strategy": {"summary": string, "channelMix": string[], "budgetModel": string},
  "creatives": [{"headline": string, "angle": string, "cta": string}],
  "funnel": [{"stage": string, "action": string, "metric": string}],
  "kpiAlerts": [{"metric": string, "status": "good" | "watch" | "critical", "note": string}],
  "ops": {"sharding": string, "caching": string, "queueing": string}
}
Optimize for high traffic and pragmatic execution.`;

  const geminiResponse = await fetch(`${GEMINI_URL}?key=${Deno.env.get("GEMINI_API_KEY")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\nUser:${userId}\nPrompt:${prompt}` }] }],
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        responseMimeType: "application/json"
      }
    })
  });

  const payload = await geminiResponse.json();
  const generated = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = safeJsonParse(generated);

  const { error } = await supabase.from("agent_runs").insert({
    project_id: projectId,
    agent_name: "gemini-orchestrator",
    status: geminiResponse.ok ? "completed" : "failed",
    input: { prompt, userId },
    output: parsed,
    tokens_used: payload?.usageMetadata?.totalTokenCount ?? 0
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (!geminiResponse.ok) {
    return new Response(JSON.stringify({ ok: false, error: "Gemini request failed", details: payload }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ ok: true, data: parsed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
