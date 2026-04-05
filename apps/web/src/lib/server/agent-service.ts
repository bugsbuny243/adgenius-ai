import 'server-only';

import { runAI } from '@/lib/ai';
import { isDevAuthBypassEnabled, resolveDevBypassWorkspaceContext } from '@/lib/dev-session';
import { createServerSupabase, createServerSupabaseAdmin } from '@/lib/supabase/server';
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

async function resolveServiceContext(accessToken?: string) {
  if (accessToken) {
    const supabase = createServerSupabase(accessToken);
    const context = await resolveWorkspaceContext(supabase);
    return { supabase, context };
  }

  if (isDevAuthBypassEnabled()) {
    const supabase = createServerSupabaseAdmin();
    const context = await resolveDevBypassWorkspaceContext(supabase);
    return { supabase, context };
  }

  throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
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
    if (!input.type || !input.userInput?.trim()) {
      return { ok: false, error: 'Görevini yaz ve tekrar dene.' };
    }

    const { supabase, context } = await resolveServiceContext(input.accessToken);

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

    const usage = await assertCanRun(supabase, context.workspace.id);

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
    } catch (error) {
      await supabase.from('agent_runs').insert({
        workspace_id: context.workspace.id,
        user_id: context.user.id,
        agent_type_id: agentType.id,
        user_input: input.userInput,
        model_name: modelName,
        result_text: null,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'AI yanıtı alınamadı.',
        metadata: { bypass: isDevAuthBypassEnabled() && !input.accessToken },
      });

      return { ok: false, error: 'AI yanıtı alınamadı. Lütfen tekrar deneyin.' };
    }

    const { data: createdRun, error: runInsertError } = await supabase
      .from('agent_runs')
      .insert({
        workspace_id: context.workspace.id,
        user_id: context.user.id,
        agent_type_id: agentType.id,
        user_input: input.userInput,
        model_name: modelName,
        result_text: resultText,
        status: 'completed',
        error_message: null,
        metadata: { bypass: isDevAuthBypassEnabled() && !input.accessToken },
      })
      .select('id, created_at, status')
      .single();

    if (runInsertError || !createdRun) {
      return {
        ok: false,
        error: `Çalıştırma kaydedilemedi: ${runInsertError?.message ?? 'Bilinmeyen hata'}`,
      };
    }

    const nextRunsCount = await incrementMonthlyUsage(supabase, context.workspace.id, usage.monthKey);

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
    const runId = input.runId?.trim();
    const content = input.content?.trim();

    if (!runId || !content) {
      return { ok: false, error: 'Kaydedilecek sonuç bulunamadı.' };
    }

    const { supabase, context } = await resolveServiceContext(input.accessToken);

    const { data: runRow, error: runError } = await supabase
      .from('agent_runs')
      .select('id')
      .eq('id', runId)
      .eq('workspace_id', context.workspace.id)
      .eq('user_id', context.user.id)
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
      .eq('workspace_id', context.workspace.id)
      .eq('user_id', context.user.id)
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
        workspace_id: context.workspace.id,
        user_id: context.user.id,
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
          .eq('workspace_id', context.workspace.id)
          .eq('user_id', context.user.id)
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
