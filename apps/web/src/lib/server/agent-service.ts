import 'server-only';

import { runAI } from '@/lib/ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { assertCanRun, getMonthKey, incrementUsageCounter, UsageLimitError } from '@/lib/usage';
import { resolveWorkspaceContext, WorkspaceError } from '@/lib/workspace';

type ServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
      code?: 'USAGE_LIMIT_EXCEEDED';
      usage?: {
        planName: string;
        runLimit: number;
        runsCount: number;
        period: 'day' | 'month';
      };
    };

function cleanErrorMessage(error: unknown, fallback = 'Bir hata oluştu.'): string {
  if (error instanceof WorkspaceError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function deriveTitle(content: string) {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return 'Kaydedilen çıktı';
  }

  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine;
}

export async function runAgent(input: {
  accessToken?: string;
  type?: string;
  userInput?: string;
  model?: string;
}): Promise<
  ServiceResult<{
    run: { id: string; created_at: string; status: string };
    result: string;
    usage: { runsCount: number; monthKey: string };
  }>
> {
  try {
    if (!input.accessToken) {
      return { ok: false, error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' };
    }

    if (!input.type || !input.userInput?.trim()) {
      return { ok: false, error: 'Görevini yaz ve tekrar dene.' };
    }

    const supabase = createServerSupabase(input.accessToken);
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { data: agentType, error: agentTypeError } = await supabase
      .from('agent_types')
      .select('id, slug, name, system_prompt, is_active')
      .eq('slug', input.type)
      .maybeSingle();

    if (agentTypeError) {
      return { ok: false, error: `Agent bilgisi alınamadı: ${agentTypeError.message}` };
    }

    if (!agentType) {
      return { ok: false, error: 'Agent türü bulunamadı.' };
    }

    if (!agentType.is_active) {
      return { ok: false, error: 'Bu agent şu anda aktif değil.' };
    }

    const usage = await assertCanRun(supabase, workspace.id);

    let resultText = '';
    let modelName = input.model ?? 'ai-standard';

    try {
      const aiResult = await runAI({
        systemPrompt: agentType.system_prompt,
        userInput: input.userInput,
        model: input.model,
      });
      resultText = aiResult.text;
      modelName = aiResult.model;
    } catch {
      await supabase.from('agent_runs').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        agent_type_id: agentType.id,
        user_input: input.userInput,
        model_name: modelName,
        result_text: null,
        status: 'failed',
      });

      return { ok: false, error: 'AI yanıtı alınamadı. Lütfen tekrar deneyin.' };
    }

    const { data: createdRun, error: runInsertError } = await supabase
      .from('agent_runs')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        agent_type_id: agentType.id,
        user_input: input.userInput,
        model_name: modelName,
        result_text: resultText,
        status: 'completed',
      })
      .select('id, created_at, status')
      .single();

    if (runInsertError || !createdRun) {
      return {
        ok: false,
        error: `Çalıştırma kaydedilemedi: ${runInsertError?.message ?? 'Bilinmeyen hata'}`,
      };
    }

    const nextRunsCount = await incrementUsageCounter(supabase, workspace.id, usage.periodKey);

    return {
      ok: true,
      data: {
        run: createdRun,
        result: resultText,
        usage: {
          runsCount: nextRunsCount,
          monthKey: getMonthKey(),
        },
      },
    };
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return {
        ok: false,
        error: error.message,
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: {
          planName: error.usage.planName,
          runLimit: error.usage.runLimit,
          runsCount: error.usage.runsCount,
          period: error.usage.period,
        },
      };
    }

    return { ok: false, error: cleanErrorMessage(error) };
  }
}

export async function saveAgentOutput(input: {
  accessToken?: string;
  runId?: string;
  title?: string;
  content?: string;
}): Promise<ServiceResult<{ id: string; title: string; created_at: string }>> {
  try {
    if (!input.accessToken) {
      return { ok: false, error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' };
    }

    if (!input.runId || !input.content?.trim()) {
      return { ok: false, error: 'Kaydedilecek sonuç bulunamadı.' };
    }

    const supabase = createServerSupabase(input.accessToken);
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { data: runRow, error: runError } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('id', input.runId)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (runError) {
      return { ok: false, error: `Çalıştırma kontrolü başarısız: ${runError.message}` };
    }

    if (!runRow) {
      return { ok: false, error: 'Bu çalıştırmaya erişim izniniz yok.' };
    }

    const finalTitle = input.title?.trim() || deriveTitle(input.content);

    const { data: saved, error: saveError } = await supabase
      .from('saved_outputs')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        agent_run_id: input.runId,
        title: finalTitle,
        content: input.content,
      })
      .select('id, title, created_at')
      .single();

    if (saveError) {
      if (saveError.code === '23505') {
        return { ok: false, error: 'Bu çıktı zaten kaydedilmiş.' };
      }

      return { ok: false, error: `Çıktı kaydedilemedi: ${saveError.message}` };
    }

    if (!saved) {
      return { ok: false, error: 'Çıktı kaydedilemedi.' };
    }

    return { ok: true, data: saved };
  } catch (error) {
    return { ok: false, error: cleanErrorMessage(error) };
  }
}
