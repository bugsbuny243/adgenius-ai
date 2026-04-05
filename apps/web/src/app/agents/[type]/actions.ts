'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/src/lib/supabase/server'
import { getUserWorkspaceId, requireUser } from '@/src/lib/auth'
import { runAgent } from '@/src/lib/gemini'
import { assertUsageWithinLimit, incrementUsageCounter } from '@/src/lib/usage'
import { V1_AGENT_CATALOG } from '@/src/lib/agents'

export async function runAgentAction(agentSlug: string, formData: FormData) {
  const user = await requireUser()
  const supabase = await createClient()
  const userInput = String(formData.get('userInput') ?? '').trim()

  if (!userInput) {
    return { ok: false as const, error: 'Lütfen bir görev girin.' }
  }

  const workspaceId = await getUserWorkspaceId(user.id)

  try {
    await assertUsageWithinLimit(workspaceId)
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Kullanım limiti hatası.' }
  }

  let { data: agentType } = await supabase
    .from('agent_types')
    .select('id,name,system_prompt,is_active')
    .eq('slug', agentSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (!agentType) {
    const fallback = V1_AGENT_CATALOG.find((item) => item.slug === agentSlug)

    if (!fallback) {
      return { ok: false as const, error: 'Geçersiz veya pasif agent türü.' }
    }

    const { data: created } = await supabase
      .from('agent_types')
      .upsert(
        {
          slug: fallback.slug,
          name: fallback.name,
          icon: fallback.icon,
          description: fallback.description,
          system_prompt: fallback.systemPrompt,
          placeholder: fallback.placeholder,
          is_active: true,
        },
        { onConflict: 'slug' },
      )
      .select('id,name,system_prompt,is_active')
      .single()

    agentType = created
  }

  if (!agentType) {
    return { ok: false as const, error: 'Agent kaydı oluşturulamadı.' }
  }

  try {
    const result = await runAgent({
      systemPrompt: agentType.system_prompt,
      userInput,
    })

    const { data: runRecord, error: runError } = await supabase
      .from('agent_runs')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        agent_type_id: agentType.id,
        user_input: userInput,
        model_name: result.modelName,
        result_text: result.text,
        status: 'completed',
        tokens_input: result.usageMetadata?.promptTokenCount ?? null,
        tokens_output: result.usageMetadata?.candidatesTokenCount ?? null,
      })
      .select('id,result_text')
      .single()

    if (runError) {
      return { ok: false as const, error: runError.message }
    }

    await incrementUsageCounter(workspaceId)
    revalidatePath('/dashboard')
    revalidatePath('/runs')

    return { ok: true as const, runId: runRecord.id as string, resultText: runRecord.result_text as string }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini çağrısı başarısız oldu.'

    await supabase.from('agent_runs').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      agent_type_id: agentType.id,
      user_input: userInput,
      model_name: 'gemini-2.5-flash',
      status: 'failed',
      result_text: message,
    })

    return { ok: false as const, error: message }
  }
}

export async function saveOutputAction(runId: string, formData: FormData) {
  const user = await requireUser()
  const title = String(formData.get('title') ?? '').trim() || 'Kaydedilen çıktı'
  const content = String(formData.get('content') ?? '').trim()

  if (!content) {
    return { ok: false as const, error: 'Kaydedilecek içerik bulunamadı.' }
  }

  const workspaceId = await getUserWorkspaceId(user.id)
  const supabase = await createClient()

  const { error } = await supabase.from('saved_outputs').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    agent_run_id: runId,
    title,
    content,
  })

  if (error) {
    return { ok: false as const, error: error.message }
  }

  revalidatePath('/saved')
  revalidatePath('/dashboard')
  return { ok: true as const }
}
