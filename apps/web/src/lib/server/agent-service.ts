import 'server-only';

import { runAI } from '@/lib/ai';
import { createServerSupabase } from '@/lib/supabase/server';
import { assertCanRun, getMonthKey, incrementMonthlyUsage } from '@/lib/usage';
import { resolveWorkspaceContext, WorkspaceError } from '@/lib/workspace';

type ServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: string;
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

    const { data: pendingRun, error: pendingRunError } = await supabase
      .from('agent_runs')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        agent_type_id: agentType.id,
        user_input: input.userInput,
        model_name: modelName,
        status: 'pending',
      })
      .select('id, created_at, status')
      .single();

    if (pendingRunError || !pendingRun) {
      return {
        ok: false,
        error: `Çalıştırma başlatılamadı: ${pendingRunError?.message ?? 'Bilinmeyen hata'}`,
      };
    }

    try {
      const aiResult = await runAI({
        systemPrompt: agentType.system_prompt,
        userInput: input.userInput,
        model: input.model,
      });
      resultText = aiResult.text;
      modelName = aiResult.model;

      const { data: completedRun, error: completeError } = await supabase
        .from('agent_runs')
        .update({
          result_text: resultText,
          model_name: modelName,
          status: 'completed',
          error_message: null,
          tokens_input: aiResult.tokensInput,
          tokens_output: aiResult.tokensOutput,
          metadata: {
            completed_at: new Date().toISOString(),
            month_key: usage.monthKey,
          },
        })
        .eq('id', pendingRun.id)
        .select('id, created_at, status')
        .single();

      if (completeError || !completedRun) {
        return {
          ok: false,
          error: `Çalıştırma tamamlanamadı: ${completeError?.message ?? 'Bilinmeyen hata'}`,
        };
      }

      const nextRunsCount = await incrementMonthlyUsage(supabase, workspace.id, usage.monthKey);

      return {
        ok: true,
        data: {
          run: completedRun,
          result: resultText,
          usage: {
            runsCount: nextRunsCount,
            monthKey: getMonthKey(),
          },
        },
      };
    } catch (aiError) {
      const aiErrorMessage = cleanErrorMessage(aiError, 'AI yanıtı alınamadı. Lütfen tekrar deneyin.');

      await supabase
        .from('agent_runs')
        .update({
          result_text: null,
          status: 'failed',
          error_message: aiErrorMessage,
          metadata: {
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', pendingRun.id);

      return { ok: false, error: 'AI yanıtı alınamadı. Lütfen tekrar deneyin.' };
    }
  } catch (error) {
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

    const runId = input.runId?.trim();
    const content = input.content?.trim();

    if (!runId || !content) {
      return { ok: false, error: 'Kaydedilecek sonuç bulunamadı.' };
    }

    const supabase = createServerSupabase(input.accessToken);
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { data: runRow, error: runError } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('id', runId)
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (runError) {
      return { ok: false, error: `Çalıştırma kontrolü başarısız: ${runError.message}` };
    }

    if (!runRow) {
      return { ok: false, error: 'Bu çalıştırmaya erişim izniniz yok.' };
    }

    const { data: existingSaved, error: existingSavedError } = await supabase
      .from('saved_outputs')
      .select('id, title, created_at')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .eq('agent_run_id', runId)
      .maybeSingle();

    if (existingSavedError) {
      return { ok: false, error: `Kayıt kontrolü başarısız: ${existingSavedError.message}` };
    }

    if (existingSaved) {
      return { ok: true, data: existingSaved };
    }

    const finalTitle = input.title?.trim() || deriveTitle(content);

    const { data: saved, error: saveError } = await supabase
      .from('saved_outputs')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        agent_run_id: runId,
        title: finalTitle,
        content,
      })
      .select('id, title, created_at')
      .single();

    if (saveError) {
      if (saveError.code === '23505') {
        const { data: duplicateSaved } = await supabase
          .from('saved_outputs')
          .select('id, title, created_at')
          .eq('workspace_id', workspace.id)
          .eq('user_id', user.id)
          .eq('agent_run_id', runId)
          .maybeSingle();

        if (duplicateSaved) {
          return { ok: true, data: duplicateSaved };
        }

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
