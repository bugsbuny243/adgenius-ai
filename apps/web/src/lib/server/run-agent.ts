import "server-only";

import { runKoscheiModel } from "@/lib/ai/koschei-engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RunAgentInput = {
  workspaceId: string;
  userId: string;
  userInput: string;
  agentSlug: string;
};

type AgentTypeRow = {
  id: string;
  system_prompt: string;
  model_alias: string;
};

type RunRow = {
  id: string;
};

export const runAgentWorkflow = async (input: RunAgentInput) => {
  const supabase = createServerSupabaseClient();

  const { data: agentType, error: agentTypeError } = await supabase
    .from("agent_types")
    .select("id,system_prompt,model_alias")
    .eq("slug", input.agentSlug)
    .eq("is_active", true)
    .single<AgentTypeRow>();

  if (agentTypeError || !agentType) {
    throw new Error("Aktif ajan bulunamadı.");
  }

  const { data: createdRun, error: runInsertError } = await supabase
    .from("agent_runs")
    .insert({
      workspace_id: input.workspaceId,
      user_id: input.userId,
      agent_type_id: agentType.id,
      agent_slug: input.agentSlug,
      user_input: input.userInput,
      model_name: agentType.model_alias,
      status: "running"
    })
    .select("id")
    .single<RunRow>();

  if (runInsertError || !createdRun) {
    throw new Error("Ajan çalışması kaydedilemedi.");
  }

  try {
    const generation = await runKoscheiModel({
      systemPrompt: agentType.system_prompt,
      userInput: input.userInput,
      model: "gemini-2.5-pro"
    });

    await supabase
      .from("agent_runs")
      .update({
        status: "completed",
        result_text: generation.text,
        tokens_input: generation.tokensIn,
        tokens_output: generation.tokensOut
      })
      .eq("id", createdRun.id);

    await supabase.rpc("increment_usage_counter", {
      p_workspace_id: input.workspaceId,
      p_month_key: new Date().toISOString().slice(0, 7)
    });

    return { runId: createdRun.id, text: generation.text };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Bilinmeyen hata";

    await supabase
      .from("agent_runs")
      .update({
        status: "failed",
        error_message: errorMessage
      })
      .eq("id", createdRun.id);

    throw error;
  }
};
