# Koschei Project Snapshot

## File Tree (tracked files)

```text
.env.example
.gitignore
README.md
backend/supabase/functions/gemini-orchestrator/index.ts
frontend/app/about/page.tsx
frontend/app/agents/[id]/actions.ts
frontend/app/agents/[id]/page.tsx
frontend/app/agents/page.tsx
frontend/app/api/agents/run/route.ts
frontend/app/api/bootstrap/route.ts
frontend/app/api/health/route.ts
frontend/app/articles/[slug]/page.tsx
frontend/app/articles/page.tsx
frontend/app/auth/callback/route.ts
frontend/app/composer/actions.ts
frontend/app/composer/page.tsx
frontend/app/confirm-email/page.tsx
frontend/app/connections/page.tsx
frontend/app/contact/page.tsx
frontend/app/cookies/page.tsx
frontend/app/dashboard/actions.ts
frontend/app/dashboard/error.tsx
frontend/app/dashboard/loading.tsx
frontend/app/dashboard/page.tsx
frontend/app/error.tsx
frontend/app/globals.css
frontend/app/layout.tsx
frontend/app/loading.tsx
frontend/app/login/page.tsx
frontend/app/not-found.tsx
frontend/app/page.tsx
frontend/app/pricing/page.tsx
frontend/app/privacy-policy/page.tsx
frontend/app/projects/[id]/actions.ts
frontend/app/projects/[id]/page.tsx
frontend/app/projects/actions.ts
frontend/app/projects/page.tsx
frontend/app/reset-password/page.tsx
frontend/app/robots.ts
frontend/app/runs/page.tsx
frontend/app/saved/actions.ts
frontend/app/saved/page.tsx
frontend/app/settings/page.tsx
frontend/app/signin/page.tsx
frontend/app/signup/page.tsx
frontend/app/sitemap.ts
frontend/app/terms/page.tsx
frontend/app/update-password/page.tsx
frontend/app/upgrade/page.tsx
frontend/components/agent-editor/AgentEditorRenderer.tsx
frontend/components/agent-editor/AgentEditorShell.tsx
frontend/components/agent-editor/LivePreviewPanel.tsx
frontend/components/agent-editor/ResultPanel.tsx
frontend/components/agent-editor/RunStatusPoller.tsx
frontend/components/agent-editor/SocialOutputPanel.tsx
frontend/components/nav.tsx
frontend/components/public-site-nav.tsx
frontend/components/runs-list.tsx
frontend/components/saved-list.tsx
frontend/lib/agent-editor.ts
frontend/lib/ai-engine.ts
frontend/lib/app-context.ts
frontend/lib/connectors/instagram.ts
frontend/lib/connectors/tiktok.ts
frontend/lib/connectors/types.ts
frontend/lib/connectors/youtube.ts
frontend/lib/env.ts
frontend/lib/knowledge.ts
frontend/lib/public-articles.ts
frontend/lib/publish-queue.ts
frontend/lib/social-content.ts
frontend/lib/supabase-browser.ts
frontend/lib/supabase-server.ts
frontend/lib/workspace.ts
frontend/middleware.ts
frontend/next-env.d.ts
frontend/next.config.ts
frontend/package.json
frontend/postcss.config.mjs
frontend/public/ads.txt
frontend/scripts/validate-runtime-env.mjs
frontend/tailwind.config.ts
frontend/tsconfig.json
```

## Full contents of tracked files

### .env.example

```text
# Public (build-time + client)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Server runtime
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_KEY

```

### .gitignore

```text
node_modules/
frontend/node_modules/
.env
.env.*
!.env.example
dist/
.DS_Store

```

### README.md

```md
# Koschei AI Command Center

Workspace tabanlı bir **AI command center foundation**:
- Next.js App Router + TypeScript + Tailwind
- Supabase Auth + Postgres + RLS
- 

## Tech stack

- `frontend`: Next.js 16, React 19, TypeScript, Tailwind
- `backend/supabase/migrations/*`: workspace-centric SQL foundation + RLS

## Project structure

```
project-root/
├── backend/
│   └── supabase/
│       ├── functions/
│       └── migrations/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   └── scripts/
└── README.md
```

## Environment variables

Railway (Production) için aşağıdaki değişkenleri **service level** olarak tanımlayın:

### Public (build-time + client)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server (runtime)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- 

> Not: `NEXT_PUBLIC_*` değişkenleri build-time’da bundle’a gömülür. Bu değerler değişirse **rebuild + redeploy** zorunludur.

## Railway deployment (normal Next.js)

- Root Directory: `/frontend`
- Build Command: `npm install && npm run build`
- Start Command: `npx next start -H 0.0.0.0 -p $PORT`

Docker / standalone / static export kullanılmaz.

## Railway setup steps

1. Railway service root’unu `/frontend` olarak ayarlayın.
2. Build Command’i `npm install && npm run build` yapın.
3. Start Command’i `npx next start -H 0.0.0.0 -p $PORT` yapın.
4. Tüm env değişkenlerini girin (yukarıdaki liste).
5. Deploy edin.
6. Health endpoint kontrol edin:
   - `GET /api/health`

## Cache / stale build notu

Aşağıdaki durumlarda clean rebuild yapın:
- `NEXT_PUBLIC_*` değerleri değiştiyse
- önceki yanlış root/build config ile artifact cache oluştuysa

Railway’de yeni deploy sırasında cache’i temizleyip yeniden build alın.

## Local run

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

## Healthcheck response (safe)

`/api/health` sadece status/boolean döner:
- app up/down
- public env ready/missingCount
- server env ready/missingCount
- supabase ready/not ready

Secret değerler response içinde asla dönülmez.

```

### backend/supabase/functions/gemini-orchestrator/index.ts

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type OrchestratorPayload = {
  workspaceId?: string;
  userId?: string;
  agentTypeId?: string;
  projectId?: string;
  modelName?: string;
  userInput?: string;
  metadata?: Record<string, unknown>;
  saveOutput?: boolean;
  contextSelection?: {
    workspaceMemoryEntryIds?: string[];
    projectKnowledgeEntryIds?: string[];
    sourceIds?: string[];
    savedOutputIds?: string[];
  };
};

type AuthenticatedUser = {
  id: string;
};

function normalizeIds(ids: string[] | undefined) {
  return [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];
}

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function parseBearerToken(authHeader: string | null) {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token.trim();
}

async function resolveAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const token = parseBearerToken(req.headers.get('authorization'));
  if (!token) return null;

  const authClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const {
    data: { user },
    error
  } = await authClient.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { id: user.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, error: 'Only POST is supported' });
  }

  const authenticatedUser = await resolveAuthenticatedUser(req);
  if (!authenticatedUser) {
    return jsonResponse(401, { ok: false, error: 'Authentication required' });
  }

  let body: OrchestratorPayload;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { ok: false, error: 'Invalid JSON payload' });
  }

  const workspaceId = body.workspaceId?.trim();
  const requestedUserId = body.userId?.trim();
  const agentTypeId = body.agentTypeId?.trim();
  const projectId = body.projectId?.trim() || null;
  const userInput = body.userInput?.trim();
  const metadata = body.metadata ?? {};
  const saveOutput = body.saveOutput ?? true;
  const workspaceMemoryEntryIds = normalizeIds(body.contextSelection?.workspaceMemoryEntryIds);
  const projectKnowledgeEntryIds = normalizeIds(body.contextSelection?.projectKnowledgeEntryIds);
  const savedOutputIds = normalizeIds(body.contextSelection?.savedOutputIds);

  if (!workspaceId || !agentTypeId || !userInput) {
    return jsonResponse(400, {
      ok: false,
      error: 'workspaceId, agentTypeId and userInput are required'
    });
  }

  if (requestedUserId && requestedUserId !== authenticatedUser.id) {
    return jsonResponse(403, { ok: false, error: 'userId does not match authenticated user' });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', authenticatedUser.id)
    .maybeSingle();

  if (membershipError) {
    return jsonResponse(500, { ok: false, error: 'Failed to verify workspace membership' });
  }

  if (!membership) {
    return jsonResponse(403, { ok: false, error: 'User is not authorized for workspace' });
  }

  if (projectId) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (projectError) {
      return jsonResponse(500, { ok: false, error: 'Failed to validate project access' });
    }

    if (!project) {
      return jsonResponse(403, { ok: false, error: 'Project does not belong to workspace' });
    }
  }

  const { data: agentType, error: agentTypeError } = await supabase
    .from('agent_types')
    .select('id, workspace_id, model_name, is_active')
    .eq('id', agentTypeId)
    .eq('is_active', true)
    .maybeSingle();

  if (agentTypeError) {
    return jsonResponse(500, { ok: false, error: 'Failed to validate agent type' });
  }

  if (!agentType || (agentType.workspace_id !== null && agentType.workspace_id !== workspaceId)) {
    return jsonResponse(403, { ok: false, error: 'Agent type is unavailable for workspace' });
  }

  const modelName = agentType.model_name?.trim() || 'default';

  const [memoryResult, knowledgeResult, outputResult] = await Promise.all([
    workspaceMemoryEntryIds.length
      ? supabase
          .from('workspace_memory_entries')
          .select('id, title, content, entry_type, priority')
          .eq('workspace_id', workspaceId)
          .eq('is_active', true)
          .in('id', workspaceMemoryEntryIds)
      : Promise.resolve({ data: [], error: null }),
    projectKnowledgeEntryIds.length
      ? supabase
          .from('project_knowledge_entries')
          .select('id, title, content, entry_type, source_id')
          .eq('workspace_id', workspaceId)
          .in('id', projectKnowledgeEntryIds)
      : Promise.resolve({ data: [], error: null }),
    savedOutputIds.length
      ? supabase
          .from('saved_outputs')
          .select('id, title, content, project_id, project_item_id')
          .eq('workspace_id', workspaceId)
          .in('id', savedOutputIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (memoryResult.error || knowledgeResult.error || outputResult.error) {
    return jsonResponse(500, { ok: false, error: 'Failed to load selected context.' });
  }

  const memoryEntries = memoryResult.data ?? [];
  const knowledgeEntries = knowledgeResult.data ?? [];
  const selectedSources: Array<{ id: string; title: string; source_type: string; source_url: string | null; raw_text: string | null }> = [];
  const selectedOutputs = outputResult.data ?? [];

  if (
    memoryEntries.length !== workspaceMemoryEntryIds.length ||
    knowledgeEntries.length !== projectKnowledgeEntryIds.length ||
    selectedOutputs.length !== savedOutputIds.length
  ) {
    return jsonResponse(403, { ok: false, error: 'One or more selected context records are invalid for this workspace' });
  }

  const assembledContext = {
    workspaceMemory: memoryEntries,
    projectKnowledge: knowledgeEntries,
    sources: selectedSources.map((source) => ({
      id: source.id,
      title: source.title,
      sourceType: source.source_type,
      sourceUrl: source.source_url,
      rawText: source.raw_text
    })),
    savedOutputs: selectedOutputs
  };

  const systemInstruction =
    'You are a workspace-aware agent. Use provided workspace memory, project knowledge, sources, and saved outputs when they are relevant and prefer them over generic assumptions.';

  const { data: snapshot, error: snapshotError } = await supabase
    .from('context_snapshots')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      agent_type_id: agentTypeId,
      user_id: authenticatedUser.id,
      input_text: userInput,
      assembled_context: assembledContext,
      system_instruction: systemInstruction
    })
    .select('id')
    .single();

  if (snapshotError || !snapshot) {
    return jsonResponse(500, { ok: false, error: snapshotError?.message ?? 'Failed to create context snapshot' });
  }

  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      workspace_id: workspaceId,
      user_id: authenticatedUser.id,
      agent_type_id: agentTypeId,
      model_name: modelName,
      status: 'processing',
      user_input: userInput,
      metadata: {
        ...metadata,
        project_id: projectId,
        context_snapshot_id: snapshot.id
      },
      tokens_input: 0,
      tokens_output: 0
    })
    .select('id')
    .single();

  if (runError || !run) {
    return jsonResponse(500, { ok: false, error: runError?.message ?? 'Failed to create run' });
  }

  const runContextRows = [
    ...selectedSources.map((source) => ({
      workspace_id: workspaceId,
      agent_run_id: run.id,
      context_snapshot_id: snapshot.id,
      source_id: source.id,
      role: 'knowledge_source'
    })),
    ...selectedOutputs.map((output) => ({
      workspace_id: workspaceId,
      agent_run_id: run.id,
      context_snapshot_id: snapshot.id,
      saved_output_id: output.id,
      project_item_id: output.project_item_id,
      role: 'saved_output'
    })),
    ...knowledgeEntries
      .filter((entry) => entry.source_id)
      .map((entry) => ({
        workspace_id: workspaceId,
        agent_run_id: run.id,
        context_snapshot_id: snapshot.id,
        source_id: entry.source_id,
        role: 'project_knowledge_source'
      }))
  ];

  if (runContextRows.length > 0) {
    await supabase.from('run_context_sources').insert(runContextRows);
  }

  const contextText = [
    memoryEntries.length
      ? `Workspace memory:\n${memoryEntries.map((entry) => `- ${entry.title}: ${entry.content}`).join('\n')}`
      : null,
    knowledgeEntries.length
      ? `Project knowledge:\n${knowledgeEntries.map((entry) => `- ${entry.title}: ${entry.content}`).join('\n')}`
      : null,
    selectedSources.length
      ? `Sources:\n${selectedSources
          .map((source) => `- ${source.title}: ${(source.raw_text ?? '').slice(0, 1200)}`)
          .join('\n')}`
      : null,
    selectedOutputs.length
      ? `Saved outputs:\n${selectedOutputs.map((output) => `- ${output.title || output.id}: ${output.content}`).join('\n')}`
      : null
  ]
    .filter(Boolean)
    .join('\n\n');

  const geminiResponse = await fetch(`${GEMINI_URL}?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: contextText
                ? `${contextText}\n\nUser request:\n${userInput}`
                : userInput
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        topP: 0.9
      }
    })
  });

  const payload = await geminiResponse.json();
  const resultText = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  const tokensInput = payload?.usageMetadata?.promptTokenCount ?? 0;
  const tokensOutput = payload?.usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = payload?.usageMetadata?.totalTokenCount ?? tokensInput + tokensOutput;

  if (!geminiResponse.ok || !resultText) {
    const errorMessage = payload?.error?.message ?? 'AI request failed';

    await supabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: errorMessage,
        metadata: { ...metadata, ai_error: payload },
        updated_at: new Date().toISOString()
      })
      .eq('id', run.id);

    return jsonResponse(502, { ok: false, error: errorMessage, runId: run.id });
  }

  await supabase
    .from('agent_runs')
    .update({
      status: 'completed',
      result_text: resultText,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      metadata: { ...metadata, ai_usage: payload?.usageMetadata ?? null, context_snapshot_id: snapshot.id },
      updated_at: new Date().toISOString()
    })
    .eq('id', run.id);

  if (saveOutput) {
    await supabase.from('saved_outputs').insert({
      workspace_id: workspaceId,
      user_id: authenticatedUser.id,
      agent_run_id: run.id,
      project_id: projectId,
      title: 'AI Output',
      content: resultText,
      metadata: { source: 'ai-orchestrator', context_snapshot_id: snapshot.id }
    });
  }

  await supabase.rpc('increment_usage_counters', {
    target_workspace_id: workspaceId,
    input_tokens: tokensInput,
    output_tokens: tokensOutput
  });

  await supabase.from('usage_metering').insert([
    {
      workspace_id: workspaceId,
      user_id: authenticatedUser.id,
      agent_run_id: run.id,
      metric: 'run',
      quantity: 1,
      metadata: { modelName }
    },
    {
      workspace_id: workspaceId,
      user_id: authenticatedUser.id,
      agent_run_id: run.id,
      metric: 'token_total',
      quantity: totalTokens,
      metadata: { modelName }
    }
  ]);

  return new Response(
    JSON.stringify({
      ok: true,
      runId: run.id,
      contextSnapshotId: snapshot.id,
      data: {
        resultText,
        tokensInput,
        tokensOutput,
        totalTokens
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
});

```

### frontend/app/about/page.tsx

```ts
import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Hakkımızda | Koschei AI',
  description: 'Koschei AI ürün vizyonu, çalışma yaklaşımı ve mevcut kapsamı hakkında bilgi alın.'
};

export default function AboutPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Hakkımızda</h1>
      <p className="text-white/75">
        Koschei AI, içerik operasyonu yürüten ekiplerin süreçlerini daha görünür ve yönetilebilir hale getirmek için
        geliştirilen bir Next.js tabanlı ürün deneyimidir.
      </p>
      <p className="text-white/75">
        Platform; görev akışı takibi, AI destekli taslak üretimi ve ekip içi koordinasyon adımlarını aynı çalışma
        alanında toplar. Yaklaşımımız “insan denetimli hızlandırma”dır: ürün ekiplerin yerine karar vermez, ekiplerin
        daha hızlı ve tutarlı çalışmasına yardımcı olur.
      </p>
      <p className="text-white/75">
        Yol haritamızda entegrasyon ve otomasyon yeteneklerinin genişletilmesi bulunur. Ancak yalnızca aktif ve testten
        geçmiş özellikleri canlı ürün kapsamı olarak sunarız.
      </p>
    </main>
  );
}

```

### frontend/app/agents/[id]/actions.ts

```ts
'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

const SUPPORTED_SOCIAL_PLATFORMS = ['youtube', 'instagram', 'tiktok'] as const;

function buildInternalUrl(pathname: string, headerList: Headers): string {
  const protocol = headerList.get('x-forwarded-proto') ?? 'http';
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000';
  return `${protocol}://${host}${pathname}`;
}

function parseRunMetadata(source: unknown): { editorState: Record<string, unknown>; freeNotes: string; derivedPrompt: string } {
  if (!source || typeof source !== 'object') {
    return { editorState: {}, freeNotes: '', derivedPrompt: '' };
  }

  const metadata = source as Record<string, unknown>;
  return {
    editorState: metadata.editor_state && typeof metadata.editor_state === 'object' ? (metadata.editor_state as Record<string, unknown>) : {},
    freeNotes: typeof metadata.free_notes === 'string' ? metadata.free_notes : '',
    derivedPrompt: typeof metadata.derived_prompt === 'string' ? metadata.derived_prompt : ''
  };
}

function toUserFacingRunError(errorCode: string): string {
  if (errorCode === 'workspace_not_found') return 'Çalışma alanı bulunamadı.';
  if (errorCode === 'agent_not_found') return 'Agent bulunamadı.';
  if (errorCode === 'invalid_payload') return 'Çalıştırma verisi doğrulanamadı.';
  if (errorCode === 'invalid_user' || errorCode === 'missing_token') return 'Oturum doğrulanamadı.';
  if (errorCode === 'run_not_found') return 'Çalıştırma kaydı bulunamadı.';
  if (errorCode === 'empty_result') return 'AI motoru boş sonuç döndürdü. Lütfen tekrar deneyin.';
  if (errorCode === 'run_timeout') return 'Çalıştırma zaman aşımına uğradı. Lütfen tekrar deneyin.';
  if (errorCode === 'missing_environment') return 'Sunucu yapılandırması eksik. Lütfen yöneticinizle iletişime geçin.';
  return errorCode || 'Çalıştırma sırasında hata oluştu.';
}

export async function runAgentAction(agentId: string, formData: FormData) {
  const rawPrompt = String(formData.get('prompt') ?? '').trim();
  const derivedPrompt = String(formData.get('derived_prompt') ?? '').trim();
  const freeNotes = String(formData.get('free_notes') ?? '').trim();
  const editorStateRaw = String(formData.get('editor_state') ?? '').trim();
  const projectIdRaw = String(formData.get('project_id') ?? '').trim();
  const projectId = projectIdRaw || null;

  const prompt = derivedPrompt || rawPrompt;

  if (!prompt) {
    redirect(`/agents/${agentId}?error=İstem gerekli.`);
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const {
    data: { session }
  } = await serverSupabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    redirect(`/agents/${agentId}?error=Oturum doğrulanamadı.`);
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const [agentRes, projectRes] = await Promise.all([
    serverSupabase.from('agent_types').select('id').eq('id', agentId).eq('is_active', true).maybeSingle(),
    projectId
      ? serverSupabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .eq('workspace_id', currentWorkspaceId)
          .eq('user_id', currentUserId)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const agent = agentRes.data;
  const project = projectRes.data;

  if (!agent) {
    redirect(`/agents/${agentId}?error=Agent bulunamadı.`);
  }

  if (projectId && !project) {
    redirect(`/agents/${agentId}?error=Seçilen proje doğrulanamadı.`);
  }

  let parsedEditorState: Record<string, unknown> = {};
  if (editorStateRaw) {
    try {
      const payload = JSON.parse(editorStateRaw) as Record<string, unknown>;
      if (payload && typeof payload === 'object') {
        parsedEditorState = payload;
      }
    } catch {
      parsedEditorState = {};
    }
  }

  const { data: run, error: runInsertError } = await serverSupabase
    .from('agent_runs')
    .insert({
      workspace_id: currentWorkspaceId,
      user_id: currentUserId,
      agent_type_id: agentId,
      user_input: prompt,
      metadata: {
        project_id: projectId,
        editor_state: parsedEditorState,
        derived_prompt: derivedPrompt || prompt,
        free_notes: freeNotes,
        input_mode: 'agent-live-editor-v2'
      },
      status: 'pending'
    })
    .select('id')
    .single();

  if (runInsertError || !run) {
    redirect(`/agents/${agentId}?error=Çalıştırma başlatılamadı.`);
  }

  try {
    const requestHeaders = await headers();
    const runResponse = await fetch(buildInternalUrl('/api/agents/run', requestHeaders), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        runId: run.id,
        agentTypeId: agentId,
        userInput: prompt,
        projectId,
        metadata: {
          editor_state: parsedEditorState,
          derived_prompt: derivedPrompt || prompt,
          free_notes: freeNotes
        }
      }),
      signal: AbortSignal.timeout(45_000)
    });

    if (!runResponse.ok) {
      const payload = (await runResponse.json().catch(() => null)) as { error?: string } | null;
      const message = toUserFacingRunError(payload?.error ?? '');

      await serverSupabase
        .from('agent_runs')
        .update({
          status: 'failed',
          error_message: message,
          result_text: null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', run.id)
        .eq('workspace_id', currentWorkspaceId)
        .eq('user_id', currentUserId)
        .in('status', ['pending', 'processing']);

      redirect(`/agents/${agentId}?error=${encodeURIComponent(message)}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Çalıştırma başlatma hatası.';
    const isTimeout = message.toLowerCase().includes('timeout') || message.toLowerCase().includes('aborted');

    const { data: latestRun } = await serverSupabase
      .from('agent_runs')
      .select('status')
      .eq('id', run.id)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (latestRun?.status === 'processing' && isTimeout) {
      redirect(`/agents/${agentId}?run_id=${run.id}&error=${encodeURIComponent('Çalıştırma arka planda devam ediyor. Sonuç alanı otomatik güncellenecek.')}`);
    }

    await serverSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: message,
        result_text: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', run.id)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .in('status', ['pending', 'processing']);

    redirect(`/agents/${agentId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/dashboard');
  revalidatePath(`/agents/${agentId}`);
  redirect(`/agents/${agentId}?run_id=${run.id}`);
}

export async function rerunAgentAction(agentId: string, formData: FormData) {
  const sourceRunId = String(formData.get('source_run_id') ?? '').trim();

  if (!sourceRunId) {
    redirect(`/agents/${agentId}?error=Yeniden çalıştırma için kaynak run seçilemedi.`);
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const { data: sourceRun } = await serverSupabase
    .from('agent_runs')
    .select('id, user_input, metadata')
    .eq('id', sourceRunId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .eq('agent_type_id', agentId)
    .maybeSingle();

  if (!sourceRun?.user_input) {
    redirect(`/agents/${agentId}?error=Kaynak run bulunamadı.`);
  }

  const parsed = parseRunMetadata(sourceRun.metadata);
  const runFormData = new FormData();
  runFormData.set('prompt', sourceRun.user_input);
  runFormData.set('derived_prompt', parsed.derivedPrompt || sourceRun.user_input);
  runFormData.set('free_notes', parsed.freeNotes);
  runFormData.set('editor_state', JSON.stringify(parsed.editorState));
  const sourceProjectId =
    sourceRun.metadata && typeof sourceRun.metadata === 'object' && 'project_id' in sourceRun.metadata && typeof sourceRun.metadata.project_id === 'string'
      ? sourceRun.metadata.project_id
      : '';
  if (sourceProjectId) {
    runFormData.set('project_id', sourceProjectId);
  }

  await runAgentAction(agentId, runFormData);
}

export async function saveOutputAction(agentId: string, formData: FormData) {
  const runId = String(formData.get('run_id') ?? '').trim();
  const title = String(formData.get('title') ?? 'Kaydedilen çıktı').trim() || 'Kaydedilen çıktı';

  if (!runId) {
    redirect(`/agents/${agentId}?error=Çalıştırma kimliği eksik.`);
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const { data: run } = await serverSupabase
    .from('agent_runs')
    .select('id, result_text')
    .eq('id', runId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .eq('status', 'completed')
    .maybeSingle();

  if (!run?.result_text) {
    redirect(`/agents/${agentId}?error=Kaydedilecek sonuç bulunamadı.`);
  }

  const { data: existingOutput } = await serverSupabase
    .from('saved_outputs')
    .select('id')
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .eq('agent_run_id', run.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOutput?.id) {
    await serverSupabase
      .from('saved_outputs')
      .update({
        title,
        content: run.result_text,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingOutput.id)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId);
  } else {
    await serverSupabase.from('saved_outputs').insert({
      workspace_id: currentWorkspaceId,
      user_id: currentUserId,
      agent_run_id: run.id,
      title,
      content: run.result_text
    });
  }

  revalidatePath('/saved');
  redirect(`/agents/${agentId}?run_id=${runId}`);
}

export async function createProjectItemFromOutputAction(agentId: string, runIdParam: string, formData: FormData) {
  const outputId = String(formData.get('output_id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  if (!outputId || !projectId || !title) {
    redirect(`/agents/${agentId}?error=Proje öğesi için tüm alanları doldurun.`);
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const { data: output } = await serverSupabase
    .from('saved_outputs')
    .select('id, content')
    .eq('id', outputId)
    .eq('workspace_id', currentWorkspaceId)
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (!output) {
    redirect(`/agents/${agentId}?error=Kaydedilen çıktı bulunamadı.`);
  }

  const baseItem = {
    workspace_id: currentWorkspaceId,
    project_id: projectId,
    user_id: currentUserId,
    title,
    content: output.content,
    item_type: 'agent_output'
  };

  const { error: withSavedOutputError } = await serverSupabase.from('project_items').insert({
    ...baseItem,
    saved_output_id: output.id
  });

  if (withSavedOutputError) {
    redirect(`/agents/${agentId}?error=Çıktı projeye eklenemedi: ${withSavedOutputError.message}`);
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

export async function attachSavedOutputToProjectAction(agentId: string, runIdParam: string, formData: FormData) {
  const runId = String(formData.get('run_id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  const title = String(formData.get('title') ?? 'Agent Çıktısı').trim() || 'Agent Çıktısı';

  if (!runId || !projectId) {
    redirect(`/agents/${agentId}?error=Proje seçimi zorunludur.`);
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId, userId: currentUserId } = await getWorkspaceContext();

  const [{ data: run }, { data: project }] = await Promise.all([
    serverSupabase
      .from('agent_runs')
      .select('id, result_text')
      .eq('id', runId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .eq('status', 'completed')
      .maybeSingle(),
    serverSupabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('workspace_id', currentWorkspaceId)
      .eq('user_id', currentUserId)
      .maybeSingle()
  ]);

  if (!run?.result_text || !project) {
    redirect(`/agents/${agentId}?error=Run veya proje doğrulanamadı.`);
  }

  await serverSupabase.from('saved_outputs').insert({
    workspace_id: currentWorkspaceId,
    user_id: currentUserId,
    agent_run_id: run.id,
    title,
    content: run.result_text
  });

  revalidatePath('/saved');
  revalidatePath(`/projects/${projectId}`);
  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

export async function queueSocialPublishAction(agentId: string, runIdParam: string, formData: FormData) {
  const runId = String(formData.get('run_id') ?? '').trim();
  const contentItemId = String(formData.get('content_item_id') ?? '').trim();
  const selectedPlatform = String(formData.get('target_platform') ?? '')
    .trim()
    .toLowerCase();

  if (!runId || !contentItemId || !SUPPORTED_SOCIAL_PLATFORMS.includes(selectedPlatform as (typeof SUPPORTED_SOCIAL_PLATFORMS)[number])) {
    redirect(`/agents/${agentId}?run_id=${runIdParam}&error=Yayın kuyruğu için geçerli platform seçin.`);
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId, userId } = await getWorkspaceContext();

  const { data: contentItem } = await serverSupabase
    .from('content_items')
    .select(
      'id, workspace_id, project_id, brief, youtube_title, youtube_description, instagram_caption, tiktok_caption, platforms'
    )
    .eq('id', contentItemId)
    .eq('run_id', runId)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!contentItem) {
    redirect(`/agents/${agentId}?run_id=${runIdParam}&error=Yayın için içerik kaydı bulunamadı.`);
  }

  const payload: Record<string, unknown> = {
    brief: contentItem.brief ?? '',
    platform: selectedPlatform,
    source: 'agent_detail',
    run_id: runId,
    content_item_id: contentItem.id,
    project_id: contentItem.project_id ?? null
  };

  if (selectedPlatform === 'youtube') {
    payload.youtube_title = contentItem.youtube_title ?? null;
    payload.youtube_description = contentItem.youtube_description ?? null;
  }
  if (selectedPlatform === 'instagram') {
    payload.instagram_caption = contentItem.instagram_caption ?? null;
  }
  if (selectedPlatform === 'tiktok') {
    payload.tiktok_caption = contentItem.tiktok_caption ?? null;
  }

  const { error: queueError } = await serverSupabase.from('publish_jobs').insert({
    workspace_id: workspaceId,
    project_id: contentItem.project_id,
    content_output_id: contentItem.id,
    payload,
    queued_at: new Date().toISOString(),
    status: 'queued',
    target_platform: selectedPlatform
  });

  if (queueError) {
    redirect(`/agents/${agentId}?run_id=${runIdParam}&error=Yayın kuyruğuna eklenemedi: ${queueError.message}`);
  }

  revalidatePath('/composer');
  revalidatePath(`/agents/${agentId}`);
  redirect(`/agents/${agentId}?run_id=${runIdParam}`);
}

```

### frontend/app/agents/[id]/page.tsx

```ts
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { AgentEditorShell } from '@/components/agent-editor/AgentEditorShell';
import { RunStatusPoller } from '@/components/agent-editor/RunStatusPoller';
import { ResultPanel } from '@/components/agent-editor/ResultPanel';
import { SocialOutputPanel } from '@/components/agent-editor/SocialOutputPanel';
import { buildFormSummary, getAgentEditorConfig, parseEditorMetadata } from '@/lib/agent-editor';
import { deriveQueuePreview, neutralizeVendorTerms, sanitizeUserFacingEngineLabel, toPlatformLabel, toQueueStateHint, toQueueStatusLabel } from '@/lib/publish-queue';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import {
  attachSavedOutputToProjectAction,
  createProjectItemFromOutputAction,
  queueSocialPublishAction,
  rerunAgentAction,
  runAgentAction,
  saveOutputAction
} from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STALE_PENDING_MS = 2 * 60 * 1000;

function getStatusLabel(status: string): string {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'failed') return 'Hata';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'pending') return 'Sırada';
  return status;
}

type AgentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_id?: string; edit_run_id?: string; error?: string }>;
};

export default async function AgentDetailPage({ params, searchParams }: AgentDetailPageProps) {
  const { id } = await params;
  const { run_id: runIdParam, edit_run_id: editRunIdParam, error: errorParam } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { workspaceId, userId } = await getWorkspaceContext();

  const runAgent = runAgentAction.bind(null, id);
  const saveOutput = saveOutputAction.bind(null, id);
  const rerunAgent = rerunAgentAction.bind(null, id);
  const createProjectItem = createProjectItemFromOutputAction.bind(null, id, runIdParam ?? '');
  const attachOutput = attachSavedOutputToProjectAction.bind(null, id, runIdParam ?? '');
  const queueSocialPublish = queueSocialPublishAction.bind(null, id, runIdParam ?? '');

  const [{ data: agent }, { data: projects }] = await Promise.all([
    supabase.from('agent_types').select('id, slug, name, description, is_active').eq('id', id).maybeSingle(),
    supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  ]);

  if (!agent) {
    notFound();
  }

  const runQuery = supabase
    .from('agent_runs')
    .select('id, user_input, result_text, status, error_message, created_at, updated_at, completed_at, metadata, model_name')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('agent_type_id', id)
    .order('created_at', { ascending: false });

  const { data: recentRuns } = await runQuery.limit(10);

  const activeRun = runIdParam
    ? recentRuns?.find((run) => run.id === runIdParam) ?? null
    : recentRuns?.[0] ?? null;

  const editableRun = editRunIdParam
    ? recentRuns?.find((run) => run.id === editRunIdParam) ?? activeRun
    : activeRun;

  const initialEditorMetadata = parseEditorMetadata(editableRun?.metadata);
  const config = getAgentEditorConfig(agent.slug);
  const formSummary = activeRun ? buildFormSummary(config, parseEditorMetadata(activeRun.metadata).editorState) : [];
  const activeMetadata = activeRun ? parseEditorMetadata(activeRun.metadata) : null;
  const isPending = activeRun?.status === 'pending' || activeRun?.status === 'processing';
  const isStalePending = activeRun
    ? isPending && Date.now() - new Date(activeRun.updated_at ?? activeRun.created_at).getTime() > STALE_PENDING_MS
    : false;
  const resultText = activeRun
    ? neutralizeVendorTerms(
        activeRun.result_text ||
          (activeRun.status === 'failed' ? activeRun.error_message || 'Çalıştırma hata ile sonlandı.' : '') ||
          (activeRun.status === 'completed' ? 'Çalıştırma tamamlandı ancak sonuç metni boş görünüyor.' : '') ||
          'Sonuç hazırlanıyor. Sayfa otomatik güncellenecek...'
      )
    : '';

  const { data: savedOutputs } = await supabase
    .from('saved_outputs')
    .select('id, agent_run_id, title')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const activeOutput = activeRun ? (savedOutputs ?? []).find((output) => output.agent_run_id === activeRun.id) : null;

  const activeContentItem = activeRun
    ? (
        await supabase
          .from('content_items')
          .select(
            'id, brief, platforms, youtube_title, youtube_description, instagram_caption, tiktok_caption, status, project_id, saved_output_id'
          )
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .eq('run_id', activeRun.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  const { data: publishJobs } =
    activeContentItem?.id
      ? await supabase
          .from('publish_jobs')
          .select('id, status, target_platform, queued_at, content_output_id, payload, project_id')
          .eq('workspace_id', workspaceId)
          .eq('content_output_id', activeContentItem.id)
          .order('queued_at', { ascending: false })
          .limit(10)
      : { data: [] };


  const [{ data: linkedProject }, { data: linkedSavedOutput }] = await Promise.all([
    activeContentItem?.project_id
      ? supabase.from('projects').select('id, name').eq('workspace_id', workspaceId).eq('id', activeContentItem.project_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    activeContentItem?.saved_output_id
      ? supabase
          .from('saved_outputs')
          .select('id, title, content')
          .eq('workspace_id', workspaceId)
          .eq('id', activeContentItem.saved_output_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{agent.name}</h2>
            <p className="text-sm text-white/60">Slug: {agent.slug}</p>
            <p className="mt-2 text-sm text-white/75">{agent.description || 'Bu agent için açıklama eklenmemiş.'}</p>
          </div>
          <span className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/70">{agent.is_active ? 'Aktif' : 'Pasif'}</span>
        </div>

        {errorParam ? <p className="mb-3 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{neutralizeVendorTerms(errorParam)}</p> : null}

        <AgentEditorShell
          agentSlug={agent.slug}
          projects={projects ?? []}
          runAction={runAgent}
          initialMetadata={initialEditorMetadata}
        />
      </section>

      <section className="panel mb-4">
        <h3 className="mb-3 text-lg font-semibold">Sonuç</h3>
        <p className="mb-3 text-sm text-white/65">Form özeti, ek notlar ve üretilen çıktı ayrı bloklarda gösterilir.</p>
        {activeRun ? (
          <div className="space-y-3">
            <RunStatusPoller runId={activeRun.id} status={activeRun.status} />
            <p className="text-xs text-white/60">
              Durum: <span className="font-medium text-white/85">{getStatusLabel(activeRun.status)}</span>
            </p>
            <p className="text-xs text-white/50">
              Oluşturulma: {new Date(activeRun.created_at).toLocaleString('tr-TR')}
              {activeRun.completed_at ? ` • Tamamlanma: ${new Date(activeRun.completed_at).toLocaleString('tr-TR')}` : ''}
            </p>
            <p className="text-xs text-white/50">Çalışma motoru: {sanitizeUserFacingEngineLabel(activeRun.metadata && typeof activeRun.metadata === 'object' && 'ai_engine' in activeRun.metadata ? activeRun.metadata.ai_engine : null)}</p>

            {isPending ? (
              <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Çalıştırma devam ediyor. Sonuç tamamlandığında bu alan otomatik güncellenir.
              </p>
            ) : null}
            {isStalePending ? (
                <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  Bu çalıştırma beklenenden uzun sürdü. "Bu sonucu düzenle" ile aynı girdi üzerinden yeniden çalıştırabilirsiniz.
                </p>
              ) : null}
            {activeRun.status === 'failed' ? (
              <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {neutralizeVendorTerms(activeRun.error_message || 'Çalıştırma tamamlanamadı. Aynı girdiyi düzenleyip yeniden deneyebilirsiniz.')}
              </p>
            ) : null}

            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Form Özeti</p>
              {formSummary.length ? (
                <ul className="space-y-1 text-sm text-white/85">
                  {formSummary.map((item) => (
                    <li key={item.label}>
                      <span className="text-white/60">{item.label}: </span>
                      {item.value}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/70">Form alanı kaydı yok.</p>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Ek Notlar</p>
              <p className="text-sm whitespace-pre-wrap text-white/80">{activeMetadata?.freeNotes || 'Ek not girilmedi.'}</p>
            </div>

            {agent.slug === 'sosyal' ? (
              activeContentItem ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                    <p>
                      İçerik kaydı: <span className="text-white/85">{activeContentItem.id}</span>
                    </p>
                    <p>
                      Durum: <span className="text-white/85">{activeContentItem.status ?? 'draft'}</span>
                    </p>
                    <p>
                      Proje bağlantısı:{' '}
                      <span className="text-white/85">{activeContentItem.project_id ? activeContentItem.project_id : 'Yok'}</span>
                    </p>
                  </div>
                  <SocialOutputPanel
                    youtubeTitle={activeContentItem.youtube_title}
                    youtubeDescription={activeContentItem.youtube_description}
                    instagramCaption={activeContentItem.instagram_caption}
                    tiktokCaption={activeContentItem.tiktok_caption}
                  />

                  <form action={queueSocialPublish} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                    <input type="hidden" name="run_id" value={activeRun.id} />
                    <input type="hidden" name="content_item_id" value={activeContentItem.id} />
                    <select name="target_platform" defaultValue="youtube" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                    <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Yayın Kuyruğuna Ekle</button>
                  </form>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-white/50">Yayın Kuyruğu Geçmişi</p>
                    <p className="mb-2 text-xs text-white/55">Bu alan yalnızca mevcut kuyruk kayıtlarının hazırlık durumunu gösterir.</p>
                    {publishJobs && publishJobs.length > 0 ? (
                      <div className="space-y-2 text-sm text-white/80">
                        {publishJobs.map((job) => {
                          const preview = deriveQueuePreview({
                            payload: job.payload,
                            targetPlatform: job.target_platform,
                            contentItem: activeContentItem,
                            savedOutput: linkedSavedOutput
                          });

                          return (
                            <div key={job.id} className="rounded-md border border-white/10 p-2">
                              <p className="text-white/90">{toPlatformLabel(job.target_platform)} • {toQueueStatusLabel(job.status)}</p>
                              <p className="text-xs text-white/60">{toQueueStateHint(job.status)} • {job.queued_at ? new Date(job.queued_at).toLocaleString('tr-TR') : 'Tarih yok'}</p>
                              <p className="mt-1 text-white/80">İçerik özeti: {preview.summary}</p>
                              {preview.detail ? <p className="text-xs text-white/65">Detay: {preview.detail}</p> : null}
                              <p className="text-xs text-white/60">Proje: {linkedProject?.name ?? 'Bağlı proje yok'}</p>
                              {preview.payloadPartial ? <p className="text-xs text-amber-200">Payload kısmi olduğundan özet mevcut içerikten türetildi.</p> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-white/65">Henüz bu içerik için yayın kuyruğu kaydı bulunmuyor.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <ResultPanel text={resultText} status={activeRun.status as 'completed' | 'failed' | 'pending' | 'processing'} />
                  <p className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/65">
                    Platform bazlı içerik blokları henüz kayda alınamadı. Ham çıktı aşağıda görüntüleniyor.
                  </p>
                </div>
              )
            ) : (
              <ResultPanel text={resultText} status={activeRun.status as 'completed' | 'failed' | 'pending' | 'processing'} />
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/agents/${id}?run_id=${activeRun.id}&edit_run_id=${activeRun.id}`}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon"
              >
                Bu sonucu düzenle
              </Link>
              <form action={rerunAgent}>
                <input type="hidden" name="source_run_id" value={activeRun.id} />
                <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Aynı girdiyi tekrar çalıştır</button>
              </form>
            </div>

            {activeRun.status === 'completed' ? (
              <div className="space-y-3">
                <form action={saveOutput} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="run_id" value={activeRun.id} />
                  <input
                    type="text"
                    name="title"
                    defaultValue={activeOutput?.title ?? 'Kaydedilen çıktı'}
                    className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                  />
                  <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Çıktıyı kaydet</button>
                </form>

                {activeOutput ? (
                  <form action={createProjectItem} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="output_id" value={activeOutput.id} />
                    <select name="project_id" defaultValue="" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                      <option value="">Projeye ekle</option>
                      {projects?.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="title"
                      defaultValue="Agent Çıktısı"
                      className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                    />
                    <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Proje öğesi oluştur</button>
                  </form>
                ) : (
                  <form action={attachOutput} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="run_id" value={activeRun.id} />
                    <select name="project_id" defaultValue="" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                      <option value="">Projeye kaydet</option>
                      {projects?.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="title"
                      defaultValue="Agent Çıktısı"
                      className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                    />
                    <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Kaydet ve projeye bağla</button>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">Henüz bu agent için çalıştırma bulunmuyor. Editörü doldurup ilk çalıştırmayı başlatabilirsiniz.</p>
        )}
      </section>

      <section className="panel">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Geçmiş çalıştırmalar</h3>
          <Link href="/agents" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-neon">
            Agent listesine dön
          </Link>
        </div>

        <div className="space-y-2">
          {recentRuns?.map((run) => (
            <Link key={run.id} href={`/agents/${id}?run_id=${run.id}`} className="block rounded-lg border border-white/10 p-3 text-sm hover:border-neon">
              <p className="text-white/70">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
              <p className="text-xs text-white/50">Durum: {getStatusLabel(run.status)}</p>
              <p className="text-xs text-white/50">Motor: {sanitizeUserFacingEngineLabel(run.metadata && typeof run.metadata === 'object' && 'ai_engine' in run.metadata ? run.metadata.ai_engine : null)}</p>
              <p className="mt-1 text-white/90">{run.user_input.slice(0, 100) || 'İstem yok'}</p>
            </Link>
          ))}
          {!recentRuns?.length ? <p className="text-sm text-white/70">Kayıtlı çalıştırma bulunamadı.</p> : null}
        </div>
      </section>
    </main>
  );
}

```

### frontend/app/agents/page.tsx

```ts
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getAgentBadge(slug: string): string {
  if (slug === 'arastirma') return 'araştırma odaklı';
  if (slug === 'yazilim' || slug === 'rapor') return 'derin analiz';
  return 'hızlı';
}

export default async function AgentsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { data: agents, error } = await supabase
    .from('agent_types')
    .select('id, slug, name, description, is_active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Agent listesi yüklenemedi: ${error.message}`);
  }

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-4 text-2xl font-semibold">Agent Kataloğu</h2>
        {agents && agents.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-white/10 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="mt-1 text-sm text-white/80">{agent.description || 'Açıklama mevcut değil.'}</p>
                  </div>
                  <span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-1 text-xs uppercase text-neon">
                    {getAgentBadge(agent.slug)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-md border border-white/10 px-2 py-1 text-xs uppercase text-white/70">
                    {agent.is_active ? 'aktif' : 'pasif'}
                  </span>
                  <Link href={`/agents/${agent.id}`} className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-neon">
                    Çalıştır
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70">Henüz agent tanımı bulunmuyor.</p>
        )}
      </section>
    </main>
  );
}

```

### frontend/app/api/agents/run/route.ts

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';
import { runTextStreamWithAiEngine, runTextWithAiEngine } from '@/lib/ai-engine';
import {
  createSocialPublishPayload,
  normalizeSocialContentDraft,
  type SocialContentDraft,
  type SocialPlatform
} from '@/lib/social-content';

type RunRequestBody = {
  runId?: string;
  agentTypeId?: string;
  userInput?: string;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
};

const RUN_TIMEOUT_MS = 40_000;
const FALLBACK_ENGINE_NAME = 'Koschei AI motoru';

function toRunFailureMessage(input: string): string {
  const code = input.trim().toLowerCase();
  if (code === 'run_timeout') return 'Çalıştırma zaman aşımına uğradı.';
  if (code === 'empty_result') return 'AI motoru boş sonuç döndürdü.';
  if (code.startsWith('run_update_failed:')) return 'Çalıştırma kaydı güncellenemedi.';
  return input || 'Çalıştırma sırasında beklenmeyen bir hata oluştu.';
}

function resolveProjectIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>).project_id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizePlatforms(value: unknown): SocialPlatform[] {
  if (!Array.isArray(value)) {
    return ['youtube', 'instagram', 'tiktok'];
  }

  const normalized = value
    .map((entry) => String(entry).toLowerCase().trim())
    .filter((entry): entry is SocialPlatform => ['youtube', 'instagram', 'tiktok'].includes(entry));

  return normalized.length ? Array.from(new Set(normalized)) : ['youtube', 'instagram', 'tiktok'];
}

function getAccessToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
}

async function insertContentItemWithFallbacks(
  serviceSupabase: unknown,
  payload: {
    workspaceId: string;
    userId: string;
    runId: string;
    projectId: string | null;
    savedOutputId: string | null;
    draft: SocialContentDraft;
  }
): Promise<string | null> {
  const candidates = [
    {
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      project_id: payload.projectId,
      run_id: payload.runId,
      saved_output_id: payload.savedOutputId,
      status: 'draft',
      brief: payload.draft.brief,
      platforms: payload.draft.platforms,
      youtube_title: payload.draft.youtubeTitle,
      youtube_description: payload.draft.youtubeDescription,
      instagram_caption: payload.draft.instagramCaption,
      tiktok_caption: payload.draft.tiktokCaption
    },
    {
      workspace_id: payload.workspaceId,
      user_id: payload.userId,
      project_id: payload.projectId,
      run_id: payload.runId,
      saved_output_id: payload.savedOutputId,
      brief: payload.draft.brief,
      platforms: payload.draft.platforms,
      youtube_title: payload.draft.youtubeTitle,
      youtube_description: payload.draft.youtubeDescription,
      instagram_caption: payload.draft.instagramCaption,
      tiktok_caption: payload.draft.tiktokCaption
    }
  ];

  for (const candidate of candidates) {
    const { data, error } = await ((serviceSupabase as { from: (table: string) => { insert: (value: unknown) => { select: (query: string) => { maybeSingle: () => Promise<{ data: { id?: string } | null; error: { message?: string } | null }> } } } }).from('content_items')).insert(candidate).select('id').maybeSingle();
    if (!error && data?.id) {
      return data.id;
    }
  }

  return null;
}

async function insertPublishJobsWithFallbacks(
  serviceSupabase: unknown,
  payload: {
    workspaceId: string;
    projectId: string | null;
    contentItemId: string;
    draft: SocialContentDraft;
  }
) {
  for (const platform of payload.draft.platforms) {
    const candidates = [
      {
        workspace_id: payload.workspaceId,
        project_id: payload.projectId,
        content_output_id: payload.contentItemId,
        target_platform: platform,
        status: 'queued',
        queued_at: new Date().toISOString(),
        payload: createSocialPublishPayload(payload.draft, platform)
      },
      {
        workspace_id: payload.workspaceId,
        project_id: payload.projectId,
        content_output_id: payload.contentItemId,
        target_platform: platform,
        status: 'draft',
        queued_at: new Date().toISOString(),
        payload: createSocialPublishPayload(payload.draft, platform)
      }
    ];

    for (const candidate of candidates) {
      const { error } = await ((serviceSupabase as { from: (table: string) => { insert: (value: unknown) => Promise<{ error: { message?: string } | null }> } }).from('publish_jobs')).insert(candidate);
      if (!error) {
        break;
      }
    }
  }
}

export async function POST(request: Request) {
  const {
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    GEMINI_API_KEY: modelApiKey
  } = getServerEnv();

  if (!url || !anonKey || !serviceRoleKey || !modelApiKey) {
    console.error('[agents/run] Required server environment is missing.');
    return NextResponse.json({ ok: false, error: 'missing_environment' }, { status: 500 });
  }

  const accessToken = getAccessToken(request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RunRequestBody | null;
  const runId = body?.runId?.trim();
  const agentTypeId = body?.agentTypeId?.trim();
  const userInput = body?.userInput?.trim();
  const projectId = body?.projectId?.trim() || null;
  const requestMetadata = body?.metadata ?? null;

  if (!runId || !agentTypeId || !userInput) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  const serviceSupabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'invalid_user' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: 'Çalışma alanı bulunamadı.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing']);

    return NextResponse.json({ ok: false, error: 'workspace_not_found' }, { status: 404 });
  }

  const { data: run } = await supabase
    .from('agent_runs')
    .select('id, workspace_id, user_id, agent_type_id, metadata, status, result_text, error_message, created_at, updated_at')
    .eq('id', runId)
    .eq('workspace_id', membership.workspace_id)
    .eq('user_id', user.id)
    .eq('agent_type_id', agentTypeId)
    .maybeSingle();

  if (!run) {
    return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404 });
  }

  if (run.status === 'completed' && run.result_text) {
    return NextResponse.json({ ok: true, runId, result: run.result_text, fromCache: true });
  }

  if (run.status === 'completed' && !run.result_text) {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: 'Çalıştırma tamamlandı ancak sonuç metni boş döndü.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', user.id);

    return NextResponse.json({ ok: false, error: 'empty_result' }, { status: 409 });
  }

  if (run.status === 'failed' && run.error_message) {
    return NextResponse.json({ ok: false, error: run.error_message }, { status: 409 });
  }

  const { data: agentType } = await supabase
    .from('agent_types')
    .select('id, slug, system_prompt')
    .eq('id', agentTypeId)
    .eq('is_active', true)
    .maybeSingle();

  if (!agentType) {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: 'Agent bulunamadı.',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: false, error: 'agent_not_found' }, { status: 404 });
  }

  try {
    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'processing',
        error_message: null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...(run.metadata ?? {}),
          ...(requestMetadata ?? {}),
          ai_engine: FALLBACK_ENGINE_NAME
        }
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id)
      .in('status', ['pending', 'processing']);

    const shouldStream =
      requestMetadata &&
      typeof requestMetadata === 'object' &&
      'stream' in requestMetadata &&
      typeof requestMetadata.stream === 'boolean'
        ? requestMetadata.stream
        : agentType.slug === 'arastirma' || agentType.slug === 'rapor';

    const aiRun = await Promise.race([
      shouldStream
        ? runTextStreamWithAiEngine({
            apiKey: modelApiKey,
            agentSlug: agentType.slug,
            userInput,
            systemPrompt: agentType.system_prompt
          })
        : runTextWithAiEngine({
            apiKey: modelApiKey,
            agentSlug: agentType.slug,
            userInput,
            systemPrompt: agentType.system_prompt
          }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('run_timeout')), RUN_TIMEOUT_MS);
      })
    ]);

    const resultText = aiRun.text;

    if (!resultText) {
      throw new Error('empty_result');
    }

    const normalizedMetadata = {
      ...(run.metadata ?? {}),
      ...(requestMetadata ?? {}),
      ai_engine: aiRun.displayLabel
    };

    const { error: updateError } = await serviceSupabase
      .from('agent_runs')
      .update({
        result_text: resultText,
        status: 'completed',
        error_message: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        model_name: aiRun.alias,
        tokens_input: aiRun.usage.inputTokens,
        tokens_output: aiRun.usage.outputTokens,
        metadata: normalizedMetadata
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    if (updateError) {
      throw new Error(`run_update_failed:${updateError.message}`);
    }

    if (agentType.slug === 'sosyal') {
      const requestEditorState =
        requestMetadata && typeof requestMetadata === 'object' && 'editor_state' in requestMetadata
          ? (requestMetadata.editor_state as Record<string, unknown>)
          : null;
      const preferredPlatform =
        requestEditorState && typeof requestEditorState.platform === 'string' ? requestEditorState.platform.toLowerCase() : null;
      const platforms: SocialPlatform[] = preferredPlatform ? normalizePlatforms([preferredPlatform]) : ['youtube', 'instagram', 'tiktok'];

      const resolvedProjectId = resolveProjectIdFromMetadata(run.metadata) ?? projectId;

      const draft = normalizeSocialContentDraft({
        sourceBrief: userInput,
        sourcePlatforms: platforms,
        rawText: resultText
      });

      const { data: existingSavedOutput } = await serviceSupabase
        .from('saved_outputs')
        .select('id')
        .eq('workspace_id', membership.workspace_id)
        .eq('user_id', user.id)
        .eq('agent_run_id', runId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let savedOutputId: string | null = null;
      if (existingSavedOutput?.id) {
        savedOutputId = existingSavedOutput.id;
        await serviceSupabase
          .from('saved_outputs')
          .update({
            project_id: resolvedProjectId,
            title: 'Sosyal medya çıktısı',
            content: resultText,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSavedOutput.id)
          .eq('workspace_id', membership.workspace_id)
          .eq('user_id', user.id);
      } else {
        const { data: savedOutput } = await serviceSupabase
          .from('saved_outputs')
          .insert({
            workspace_id: membership.workspace_id,
            user_id: user.id,
            project_id: resolvedProjectId,
            agent_run_id: runId,
            title: 'Sosyal medya çıktısı',
            content: resultText
          })
          .select('id')
          .maybeSingle();
        savedOutputId = savedOutput?.id ?? null;
      }

      const { data: existingContentItem } = await serviceSupabase
        .from('content_items')
        .select('id')
        .eq('workspace_id', membership.workspace_id)
        .eq('user_id', user.id)
        .eq('run_id', runId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let contentItemId: string | null = null;
      if (existingContentItem?.id) {
        contentItemId = existingContentItem.id;
        await serviceSupabase
          .from('content_items')
          .update({
            project_id: resolvedProjectId,
            saved_output_id: savedOutputId,
            brief: draft.brief,
            platforms: draft.platforms,
            youtube_title: draft.youtubeTitle,
            youtube_description: draft.youtubeDescription,
            instagram_caption: draft.instagramCaption,
            tiktok_caption: draft.tiktokCaption,
            status: 'draft',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingContentItem.id)
          .eq('workspace_id', membership.workspace_id)
          .eq('user_id', user.id);
      } else {
        contentItemId = await insertContentItemWithFallbacks(serviceSupabase, {
          workspaceId: membership.workspace_id,
          userId: user.id,
          runId,
          projectId: resolvedProjectId,
          savedOutputId,
          draft
        });
      }

      if (contentItemId) {
        await insertPublishJobsWithFallbacks(serviceSupabase, {
          workspaceId: membership.workspace_id,
          projectId: resolvedProjectId,
          contentItemId,
          draft
        });
      }
    }

    return NextResponse.json({ ok: true, runId, result: resultText });
  } catch (error) {
    const message = toRunFailureMessage(error instanceof Error ? error.message : 'unknown_error');

    await serviceSupabase
      .from('agent_runs')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          ...(run.metadata ?? {}),
          ...(requestMetadata ?? {}),
          ai_engine: FALLBACK_ENGINE_NAME
        }
      })
      .eq('id', runId)
      .eq('user_id', user.id)
      .eq('workspace_id', membership.workspace_id);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

```

### frontend/app/api/bootstrap/route.ts

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

function getTokenFromHeader(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim() || null;
}

function buildWorkspaceName(email: string | undefined, userId: string): { baseName: string; fullName: string } {
  const baseName = (email?.split('@')[0] ?? `user-${userId.slice(0, 6)}`).trim() || `user-${userId.slice(0, 6)}`;
  return {
    baseName,
    fullName: `${baseName}'s Workspace`
  };
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(request: Request) {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey } = getServerEnv();

  if (!url || !anonKey) {
    console.error('[bootstrap] Supabase server configuration is missing.');
    return NextResponse.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  }

  const accessToken = getTokenFromHeader(request);
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 401 });
  }

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'invalid_user' }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ ok: false, error: membershipError.message }, { status: 400 });
  }

  if (membership?.workspace_id) {
    return NextResponse.json({ ok: true, existing: true, workspaceId: membership.workspace_id });
  }

  const { baseName, fullName } = buildWorkspaceName(user.email, user.id);
  const baseSlug = `ws-${user.id.slice(0, 12)}`;

  let workspaceId = '';
  let slugCandidate = baseSlug;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: fullName,
        slug: slugCandidate,
        owner_id: user.id
      })
      .select('id')
      .single();

    if (!workspaceError && workspace) {
      workspaceId = workspace.id;
      break;
    }

    if (workspaceError?.code === '23505') {
      slugCandidate = `${baseSlug}-${randomSuffix()}`;
      continue;
    }

    return NextResponse.json({ ok: false, error: workspaceError?.message ?? 'workspace_insert_failed' }, { status: 400 });
  }

  if (!workspaceId) {
    return NextResponse.json({ ok: false, error: 'workspace_slug_conflict' }, { status: 409 });
  }

  const { error: memberInsertError } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: user.id,
    role: 'owner'
  });

  if (memberInsertError) {
    return NextResponse.json({ ok: false, error: memberInsertError.message }, { status: 400 });
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    full_name: baseName
  });

  if (profileError) {
    return NextResponse.json({ ok: false, error: profileError.message }, { status: 400 });
  }

  const { error: subscriptionError } = await supabase.from('subscriptions').insert({
    workspace_id: workspaceId,
    plan_name: 'free',
    run_limit: 30,
    status: 'active'
  });

  if (subscriptionError) {
    return NextResponse.json({ ok: false, error: subscriptionError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, workspaceId });
}

```

### frontend/app/api/health/route.ts

```ts
import { NextResponse } from 'next/server';
import { getEnvDiagnostics } from '@/lib/env';

export async function GET() {
  const diagnostics = getEnvDiagnostics();

  return NextResponse.json({
    app: 'up',
    environment: {
      public: {
        ready: diagnostics.publicReady,
        missingCount: diagnostics.missingPublicEnv.length
      },
      server: {
        ready: diagnostics.serverReady,
        missingCount: diagnostics.missingServerEnv.length
      }
    },
    supabase: {
      browserClientReady: diagnostics.publicReady,
      serverClientReady: Boolean(diagnostics.serverEnv.SUPABASE_URL && diagnostics.serverEnv.SUPABASE_ANON_KEY),
      ready: diagnostics.publicReady && Boolean(diagnostics.serverEnv.SUPABASE_URL && diagnostics.serverEnv.SUPABASE_ANON_KEY)
    }
  });
}

```

### frontend/app/articles/[slug]/page.tsx

```ts
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicSiteNav } from '@/components/public-site-nav';
import { getPublicArticleBySlug, publicArticles } from '@/lib/public-articles';

export function generateStaticParams() {
  return publicArticles.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = getPublicArticleBySlug(params.slug);
  if (!article) {
    return {
      title: 'Yazı bulunamadı | Koschei AI'
    };
  }

  return {
    title: `${article.title} | Koschei AI`,
    description: article.description
  };
}

export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = getPublicArticleBySlug(params.slug);
  if (!article) {
    notFound();
  }

  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <article className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-lilac">Yazı</p>
          <h1 className="text-3xl font-bold">{article.title}</h1>
          <p className="max-w-3xl text-white/75">{article.description}</p>
        </header>

        {article.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-2xl font-semibold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-white/80">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}

```

### frontend/app/articles/page.tsx

```ts
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';
import { publicArticles } from '@/lib/public-articles';

export const metadata: Metadata = {
  title: 'Yazılar | Koschei AI',
  description: 'AI agent, içerik operasyonu ve ekip iş akışları hakkında Koschei AI kaynakları.'
};

export default function ArticlesPage() {
  return (
    <main className="panel space-y-6">
      <PublicSiteNav />
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Kaynaklar</p>
        <h1 className="text-3xl font-bold">Yazılar</h1>
        <p className="max-w-3xl text-white/75">
          Bu bölümde AI destekli içerik operasyonu, proje akışları ve ekip çalışma modeli hakkında pratik içerikler
          bulabilirsiniz.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {publicArticles.map((article) => (
          <article key={article.slug} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-xl font-semibold">{article.title}</h2>
            <p className="mt-2 text-sm text-white/75">{article.description}</p>
            <Link href={`/articles/${article.slug}`} className="mt-4 inline-block text-sm text-neon hover:underline">
              Yazıyı oku
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}

```

### frontend/app/auth/callback/route.ts

```ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = requestUrl.searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/signin?error=missing_code', request.url));
  }

  if (!isSupabaseServerConfigured()) {
    return NextResponse.redirect(new URL('/signin?error=supabase_not_configured', request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(new URL(`/signin?error=${encodeURIComponent(exchangeError.message)}`, request.url));
    }

    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error('Auth callback failed.', { error });
    return NextResponse.redirect(new URL('/signin?error=callback_failed', request.url));
  }
}

```

### frontend/app/composer/actions.ts

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { getAppContextOrRedirect } from '@/lib/app-context';

type Platform = 'youtube' | 'instagram' | 'tiktok';

const SUPPORTED_STATUS_VALUES = ['draft', 'queued', 'processing', 'published', 'failed'] as const;

function buildVariants(brief: string, platforms: Platform[]) {
  const cleanBrief = brief.trim();
  return {
    youtubeTitle: `🎯 ${cleanBrief.slice(0, 58)}`,
    youtubeDescription: `${cleanBrief}\n\nBu içerik AI motoru ile planlandı. #icerik`,
    instagramCaption: `${cleanBrief}\n\n#icerik #instagram`,
    tiktokCaption: `${cleanBrief.slice(0, 120)} #icerik #tiktok`,
    platforms
  };
}

function buildPublishPayload(input: {
  brief: string;
  platform: Platform;
  variants: ReturnType<typeof buildVariants>;
  runId: string;
  contentItemId: string;
  savedOutputId: string;
  projectId: string | null;
}) {
  const payload: Record<string, unknown> = {
    brief: input.brief,
    platform: input.platform,
    run_id: input.runId,
    content_item_id: input.contentItemId,
    saved_output_id: input.savedOutputId,
    project_id: input.projectId,
    source: 'composer'
  };

  if (input.platform === 'youtube') {
    payload.youtube_title = input.variants.youtubeTitle;
    payload.youtube_description = input.variants.youtubeDescription;
  }
  if (input.platform === 'instagram') {
    payload.instagram_caption = input.variants.instagramCaption;
  }
  if (input.platform === 'tiktok') {
    payload.tiktok_caption = input.variants.tiktokCaption;
  }

  return payload;
}

export async function createContentJobAction(formData: FormData) {
  const brief = String(formData.get('brief') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim() || null;
  const selectedPlatforms = formData.getAll('platforms').map((value) => String(value)) as Platform[];

  if (!brief || selectedPlatforms.length === 0) {
    return;
  }

  const { supabase, userId, workspace } = await getAppContextOrRedirect();
  const variants = buildVariants(brief, selectedPlatforms);
  const queuedAt = new Date().toISOString();

  const { data: run, error: runError } = await supabase
    .from('agent_runs')
    .insert({
      workspace_id: workspace.workspaceId,
      user_id: userId,
      status: 'completed',
      model_name: 'default',
      user_input: brief,
      metadata: {
        project_id: projectId
      },
      result_text: JSON.stringify(variants, null, 2),
      completed_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (runError || !run) {
    throw new Error(`İçerik çalıştırması kaydedilemedi: ${runError?.message ?? 'bilinmeyen hata'}`);
  }

  const title = `İçerik işi • ${new Date().toLocaleString('tr-TR')}`;

  const { data: saved, error: savedError } = await supabase
    .from('saved_outputs')
    .insert({
      workspace_id: workspace.workspaceId,
      project_id: projectId,
      user_id: userId,
      agent_run_id: run.id,
      title,
      content: JSON.stringify(variants, null, 2)
    })
    .select('id')
    .single();

  if (savedError || !saved) {
    throw new Error(`Kaydedilen çıktı oluşturulamadı: ${savedError?.message ?? 'bilinmeyen hata'}`);
  }

  const { data: contentItem, error: contentItemError } = await supabase
    .from('content_items')
    .insert({
      workspace_id: workspace.workspaceId,
      project_id: projectId,
      user_id: userId,
      brief,
      platforms: selectedPlatforms,
      youtube_title: variants.youtubeTitle,
      youtube_description: variants.youtubeDescription,
      instagram_caption: variants.instagramCaption,
      tiktok_caption: variants.tiktokCaption,
      run_id: run.id,
      saved_output_id: saved.id,
      status: 'draft'
    })
    .select('id')
    .single();

  if (contentItemError || !contentItem) {
    throw new Error(`İçerik kaydı oluşturulamadı: ${contentItemError?.message ?? 'bilinmeyen hata'}`);
  }

  const insertResults = await Promise.all(
    selectedPlatforms.map((platform) =>
      supabase.from('publish_jobs').insert({
        workspace_id: workspace.workspaceId,
        project_id: projectId,
        content_output_id: contentItem.id,
        target_platform: platform,
        status: 'draft',
        queued_at: queuedAt,
        payload: buildPublishPayload({
          brief,
          platform,
          variants,
          runId: run.id,
          contentItemId: contentItem.id,
          savedOutputId: saved.id,
          projectId
        })
      })
    )
  );

  const queueError = insertResults.find((result) => result.error)?.error;
  if (queueError) {
    throw new Error(`Yayın kuyruğuna eklenemedi: ${queueError.message}`);
  }

  revalidatePath('/composer');
  revalidatePath('/dashboard');
  revalidatePath('/runs');
  revalidatePath('/saved');
}

export async function updatePublishStatusAction(formData: FormData) {
  const jobId = String(formData.get('job_id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();

  if (!jobId || !SUPPORTED_STATUS_VALUES.includes(status as (typeof SUPPORTED_STATUS_VALUES)[number])) {
    return;
  }

  const { supabase, workspace } = await getAppContextOrRedirect();

  await supabase
    .from('publish_jobs')
    .update({
      status
    })
    .eq('workspace_id', workspace.workspaceId)
    .eq('id', jobId);

  revalidatePath('/composer');
}

```

### frontend/app/composer/page.tsx

```ts
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { deriveQueuePreview, toPlatformLabel, toQueueStateHint, toQueueStatusLabel } from '@/lib/publish-queue';
import { createContentJobAction, updatePublishStatusAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ComposerPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const [{ data: projects }, { data: items }, { data: jobs }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('workspace_id', workspace.workspaceId).order('created_at', { ascending: false }),
    supabase
      .from('content_items')
      .select('id, brief, platforms, youtube_title, instagram_caption, tiktok_caption, created_at')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('publish_jobs')
      .select('id, status, target_platform, content_output_id, queued_at, project_id, payload')
      .eq('workspace_id', workspace.workspaceId)
      .order('queued_at', { ascending: false })
      .limit(20)
  ]);

  const relatedContentIds = Array.from(new Set((jobs ?? []).map((job) => job.content_output_id).filter(Boolean)));
  const relatedProjectIds = Array.from(new Set((jobs ?? []).map((job) => job.project_id).filter(Boolean)));

  const [{ data: relatedContentItems }, { data: relatedProjects }] = await Promise.all([
    relatedContentIds.length
      ? supabase
          .from('content_items')
          .select('id, brief, youtube_title, youtube_description, instagram_caption, tiktok_caption, saved_output_id')
          .eq('workspace_id', workspace.workspaceId)
          .in('id', relatedContentIds)
      : Promise.resolve({ data: [], error: null }),
    relatedProjectIds.length
      ? supabase.from('projects').select('id, name').eq('workspace_id', workspace.workspaceId).in('id', relatedProjectIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  const savedOutputIds = Array.from(new Set((relatedContentItems ?? []).map((item) => item.saved_output_id).filter(Boolean)));
  const { data: relatedSavedOutputs } = savedOutputIds.length
    ? await supabase.from('saved_outputs').select('id, title, content').eq('workspace_id', workspace.workspaceId).in('id', savedOutputIds)
    : { data: [] };

  const contentById = new Map((relatedContentItems ?? []).map((item) => [item.id, item]));
  const projectById = new Map((relatedProjects ?? []).map((project) => [project.id, project]));
  const savedById = new Map((relatedSavedOutputs ?? []).map((item) => [item.id, item]));

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <h2 className="mb-3 text-xl font-semibold">İçerik Oluşturucu</h2>
        <form action={createContentJobAction} className="space-y-3">
          <label className="block text-sm">
            Proje
            <select name="project_id" className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
              <option value="">Projeye bağlama (opsiyonel)</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            Brief
            <textarea
              required
              name="brief"
              rows={4}
              placeholder="Ne üretmek istiyorsun? Hedef kitle, ton, CTA..."
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2"
            />
          </label>

          <fieldset>
            <legend className="text-sm">Platform varyantları</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label><input type="checkbox" name="platforms" value="youtube" defaultChecked /> YouTube</label>
              <label><input type="checkbox" name="platforms" value="instagram" defaultChecked /> Instagram</label>
              <label><input type="checkbox" name="platforms" value="tiktok" defaultChecked /> TikTok</label>
            </div>
          </fieldset>

          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Varyantları Üret ve Kaydet
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Son Üretilen İçerikler</h3>
          {items && items.length > 0 ? (
            <div className="space-y-3 text-sm">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 p-3">
                  <p className="text-xs text-white/60">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
                  <p className="mt-1 font-medium">Brief: {item.brief}</p>
                  <p>YouTube: {item.youtube_title}</p>
                  <p>Instagram: {item.instagram_caption}</p>
                  <p>TikTok: {item.tiktok_caption}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">Henüz içerik işi yok.</p>
          )}
        </article>

        <article className="panel">
          <h3 className="mb-1 text-lg font-semibold">Yayın Kuyruğu</h3>
          <p className="mb-3 text-xs text-white/60">Sıraya alınan gönderiler ve hazırlık durumları mevcut alanlarla listelenir.</p>
          {jobs && jobs.length > 0 ? (
            <div className="space-y-3 text-sm">
              {jobs.map((job) => {
                const relatedContent = job.content_output_id ? contentById.get(job.content_output_id) : null;
                const relatedProject = job.project_id ? projectById.get(job.project_id) : null;
                const relatedSaved = relatedContent?.saved_output_id ? savedById.get(relatedContent.saved_output_id) : null;
                const preview = deriveQueuePreview({
                  payload: job.payload,
                  targetPlatform: job.target_platform,
                  contentItem: relatedContent,
                  savedOutput: relatedSaved
                });

                return (
                  <form key={job.id} action={updatePublishStatusAction} className="rounded-lg border border-white/10 p-3">
                    <input type="hidden" name="job_id" value={job.id} />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium text-white/90">{toPlatformLabel(job.target_platform)}</p>
                      <span className="text-white/45">•</span>
                      <p className="text-white/80">{toQueueStatusLabel(job.status)}</p>
                      <span className="text-white/45">•</span>
                      <p className="text-xs text-white/60">{toQueueStateHint(job.status)}</p>
                    </div>
                    <p className="mt-1 text-xs text-white/55">Kuyruğa alınma: {job.queued_at ? new Date(job.queued_at).toLocaleString('tr-TR') : 'Zaman bilgisi yok'}</p>
                    <p className="mt-2 text-white/80">İçerik özeti: {preview.summary}</p>
                    {preview.detail ? <p className="text-xs text-white/65">Detay: {preview.detail}</p> : null}
                    <p className="text-xs text-white/60">Proje: {relatedProject?.name ?? 'Bağlı proje yok'}</p>
                    <p className="text-xs text-white/60">İçerik kaynağı: {job.content_output_id ?? 'İçerik kaydı bulunamadı'}</p>
                    {preview.payloadPartial ? <p className="mt-1 text-xs text-amber-200">Uyarı: Payload alanı kısmi görünüyor; önizleme ilişkili içerikten türetildi.</p> : null}
                    {!relatedContent && job.content_output_id ? <p className="mt-1 text-xs text-amber-200">Bağlı içerik kaydı artık bulunamıyor olabilir.</p> : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button name="status" value="draft" className="rounded-md border border-white/20 px-2 py-1">Taslak</button>
                      <button name="status" value="queued" className="rounded-md border border-white/20 px-2 py-1">Sıraya Alındı</button>
                      <button name="status" value="processing" className="rounded-md border border-white/20 px-2 py-1">İşleniyor</button>
                      <button name="status" value="published" className="rounded-md border border-white/20 px-2 py-1">Yayın hazırlığında</button>
                      <button name="status" value="failed" className="rounded-md border border-white/20 px-2 py-1">Başarısız</button>
                    </div>
                  </form>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-white/70">Kuyruk boş. İçerik üretip platform seçerek sıraya ekleyebilirsiniz.</p>
          )}
        </article>
      </section>
    </main>
  );
}

```

### frontend/app/confirm-email/page.tsx

```ts
import Link from 'next/link';

export default function ConfirmEmailPage() {
  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">E-postanı doğrula</h1>
      <p className="mb-6 text-sm text-white/70">Gelen kutunu kontrol et ve doğrulama bağlantısına tıklayarak hesabını etkinleştir.</p>
      <Link href="/signin" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-neon hover:text-neon">
        Giriş sayfasına dön
      </Link>
    </main>
  );
}

```

### frontend/app/connections/page.tsx

```ts
import { Nav } from '@/components/nav';
import { instagramConnector } from '@/lib/connectors/instagram';
import { tiktokConnector } from '@/lib/connectors/tiktok';
import { youtubeConnector } from '@/lib/connectors/youtube';

export const dynamic = 'force-dynamic';

export default async function ConnectionsPage() {
  const statuses = await Promise.all([
    youtubeConnector.getStatus(),
    instagramConnector.getStatus(),
    tiktokConnector.getStatus()
  ]);

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-4 text-xl font-semibold">Bağlantılar</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {statuses.map((item) => (
            <article key={item.platform} className="rounded-xl border border-white/10 p-4">
              <p className="text-lg font-semibold capitalize">{item.platform}</p>
              <p className="text-sm text-white/70">Durum: {item.label}</p>
              <p className="mt-2 text-xs text-white/50">Gerçek OAuth yakında eklenecek.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

```

### frontend/app/contact/page.tsx

```ts
import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'İletişim | Koschei AI',
  description: 'Destek, ürün soruları ve iş birliği talepleri için Koschei AI iletişim bilgileri.'
};

export default function ContactPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">İletişim</h1>
      <p className="text-white/75">
        Ürün kullanımı, hesap işlemleri veya iş birliği talepleri için bize e-posta üzerinden ulaşabilirsiniz.
      </p>
      <p className="font-medium">
        <a className="text-neon hover:underline" href="mailto:hello@tradepigloball.co">
          hello@tradepigloball.co
        </a>
      </p>
      <p className="text-white/70">
        Gelen talepleri öncelik sırasına göre değerlendiriyor ve mümkün olan en kısa sürede geri dönüş sağlıyoruz.
      </p>
    </main>
  );
}

```

### frontend/app/cookies/page.tsx

```ts
import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Çerez Politikası | Koschei AI',
  description: 'Koschei AI çerez politikası ve çerez tercihleri hakkında açıklamalar.'
};

export default function CookiesPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Çerez Politikası</h1>
      <p className="text-white/75">
        Koschei AI, site performansını izlemek, temel kullanıcı deneyimini sağlamak ve reklam/ölçüm süreçlerini
        desteklemek için çerezler veya benzer teknolojiler kullanabilir.
      </p>
      <p className="text-white/75">
        Bazı çerezler oturum yönetimi ve güvenlik için zorunludur. Analitik ve reklam amaçlı çerezler ise ilgili üçüncü
        taraf sağlayıcıların politikalarına göre çalışabilir.
      </p>
      <p className="text-white/75">
        Tarayıcı ayarlarınız üzerinden çerez tercihlerinizi güncelleyebilirsiniz. Ancak zorunlu çerezlerin devre dışı
        bırakılması bazı sayfa işlevlerinin beklenenden farklı çalışmasına neden olabilir.
      </p>
      <p className="text-white/75">
        Veri işleme hakkında genel bilgi için Gizlilik Politikası sayfamızı inceleyebilir veya destek ekibimize e-posta
        ile ulaşabilirsiniz.
      </p>
    </main>
  );
}

```

### frontend/app/dashboard/actions.ts

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export async function addWorkspaceMemoryAction(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const entryType = String(formData.get('entry_type') ?? 'note').trim() || 'note';

  if (!title || !content) return;

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/signin');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('workspace_memory_entries').insert({
    workspace_id: currentWorkspaceId,
    entry_type: entryType,
    title,
    content,
    priority: 0,
    is_active: true,
    created_by: currentUser.id
  });

  revalidatePath('/dashboard');
}

```

### frontend/app/dashboard/error.tsx

```ts
'use client';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">Dashboard yüklenemedi</h2>
      <p className="text-sm text-white/70">{error.message}</p>
      <button onClick={reset} className="mt-3 rounded-lg border border-white/20 px-3 py-1 text-sm">
        Yeniden Dene
      </button>
    </section>
  );
}

```

### frontend/app/dashboard/loading.tsx

```ts
export default function DashboardLoading() {
  return <section className="panel text-sm text-white/70">Dashboard yükleniyor...</section>;
}

```

### frontend/app/dashboard/page.tsx

```ts
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { neutralizeVendorTerms, sanitizeUserFacingEngineLabel } from '@/lib/publish-queue';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function toDisplayStatus(status: string): string {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'pending') return 'Sırada';
  if (status === 'failed') return 'Hata';
  return status;
}

const QUICK_AGENTS = [
  { slug: 'yazilim', label: 'Yazılım', mood: 'Derin analiz' },
  { slug: 'sosyal', label: 'Sosyal Medya', mood: 'Hızlı' },
  { slug: 'arastirma', label: 'Araştırma', mood: 'Araştırma odaklı' },
  { slug: 'rapor', label: 'Rapor', mood: 'Derin analiz' }
] as const;

export default async function DashboardPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    projectsRes,
    runsRes,
    savedRes,
    recentRunsRes,
    recentSavedRes,
    subscriptionRes,
    usageRes,
    agentsRes
  ] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
    supabase.from('agent_runs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
    supabase.from('saved_outputs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.workspaceId),
    supabase
      .from('agent_runs')
      .select('id, status, model_name, error_message, user_input, result_text, created_at, agent_type_id, agent_types(name)')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('saved_outputs')
      .select('id, title, content, created_at, agent_run_id')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('subscriptions')
      .select('plan_name, run_limit, status')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.workspaceId)
      .gte('created_at', monthStart.toISOString()),
    supabase.from('agent_types').select('id, slug, name').eq('is_active', true).limit(8)
  ]);

  const runLimit = subscriptionRes.data?.run_limit ?? 30;
  const usedRuns = usageRes.count ?? 0;
  const percent = Math.min(100, Math.round((usedRuns / Math.max(1, runLimit)) * 100));

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <h2 className="text-lg font-semibold">Çalışma Alanı</h2>
        <p className="text-white/70">{workspace.workspaceName}</p>
      </section>

      {usedRuns >= runLimit ? (
        <section className="panel mb-4 border-amber-300/40 bg-amber-500/10">
          <p className="text-sm text-amber-100">Aylık run limitiniz doldu. Kesintisiz kullanım için planınızı yükseltin.</p>
          <Link href="/upgrade" className="mt-2 inline-flex rounded-lg border border-amber-200/60 px-3 py-1.5 text-sm text-amber-50">Yükselt</Link>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Aktif plan" value={subscriptionRes.data?.plan_name ?? 'free'} />
        <MetricCard title="Toplam çalışma" value={String(runsRes.count ?? 0)} />
        <MetricCard title="Kaydedilen" value={String(savedRes.count ?? 0)} />
        <MetricCard title="Projeler" value={String(projectsRes.count ?? 0)} />
      </section>

      <section className="panel mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Aylık kullanım</h3>
          <p className="text-sm text-white/70">{usedRuns} / {runLimit}</p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon" style={{ width: `${percent}%` }} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Hızlı Agent Erişimi</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {(agentsRes.data ?? []).map((agent) => {
              const quick = QUICK_AGENTS.find((item) => item.slug === agent.slug);
              return (
                <Link key={agent.id} href={`/agents/${agent.id}`} className="rounded-lg border border-white/10 p-3 hover:border-neon">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-white/60">{quick?.mood ?? 'Hızlı mod'}</p>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Son Kaydedilenler</h3>
          <div className="space-y-2 text-sm">
            {(recentSavedRes.data ?? []).map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                <p className="font-medium">{item.title ?? 'Kaydedilen çıktı'}</p>
                <p className="line-clamp-2 text-white/70">{item.content}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel mt-4">
        <h3 className="mb-3 text-lg font-semibold">Son Çalıştırmalar</h3>
        <div className="space-y-2 text-sm">
          {(recentRunsRes.data ?? []).map((run) => (
            <div key={run.id} className="rounded-lg border border-white/10 px-3 py-2">
              <p>Durum: {toDisplayStatus(run.status)}</p>
              <p className="text-white/70">Motor: {sanitizeUserFacingEngineLabel(run.model_name)}</p>
              <p className="line-clamp-2 text-white/65">{run.user_input || 'İstem kaydı yok.'}</p>
              <p className="text-white/60">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
              {run.error_message ? <p className="text-red-200">Hata: {neutralizeVendorTerms(run.error_message)}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="panel">
      <h2 className="text-sm text-white/70">{title}</h2>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}

```

### frontend/app/error.tsx

```ts
'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="panel mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Bir hata oluştu</h1>
      <p className="mt-2 text-sm text-white/70">İşlem tamamlanamadı. Lütfen tekrar dene.</p>
      <p className="mt-2 text-xs text-red-300">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-lg border border-white/20 px-4 py-2">
        Tekrar Dene
      </button>
    </main>
  );
}

```

### frontend/app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

body {
  @apply bg-ink text-white antialiased;
}

.panel {
  @apply rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur;
}

```

### frontend/app/layout.tsx

```ts
import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Koschei İçerik Platformu',
  description: 'Koschei, ekiplerin içerik üretim süreçlerini tek merkezden yönetmesini sağlar.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Script
          id="adsense-script"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6081394144742471"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
          {children}
          <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-white/70">
            <nav className="flex flex-wrap gap-4">
              <Link href="/" className="transition hover:text-neon">
                Ana Sayfa
              </Link>
              <Link href="/about" className="transition hover:text-neon">
                Hakkımızda
              </Link>
              <Link href="/contact" className="transition hover:text-neon">
                İletişim
              </Link>
              <Link href="/articles" className="transition hover:text-neon">
                Yazılar
              </Link>
              <Link href="/privacy-policy" className="transition hover:text-neon">
                Gizlilik Politikası
              </Link>
              <Link href="/terms" className="transition hover:text-neon">
                Kullanım Koşulları
              </Link>
              <Link href="/cookies" className="transition hover:text-neon">
                Çerez Politikası
              </Link>
              <Link href="/login" className="transition hover:text-neon">
                Giriş
              </Link>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}

```

### frontend/app/loading.tsx

```ts
export default function GlobalLoading() {
  return (
    <main className="panel mx-auto max-w-xl">
      <p className="animate-pulse text-sm text-white/70">Yükleniyor...</p>
    </main>
  );
}

```

### frontend/app/login/page.tsx

```ts
import { redirect } from 'next/navigation';

export default function LoginRedirectPage() {
  redirect('/signin');
}

```

### frontend/app/not-found.tsx

```ts
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="panel mx-auto max-w-xl text-center">
      <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-white/70">Aradığın sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Link href="/dashboard" className="mt-4 inline-block rounded-lg border border-white/20 px-4 py-2">
        Göstergeye Dön
      </Link>
    </main>
  );
}

```

### frontend/app/page.tsx

```ts
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const faqItems = [
  {
    q: 'Koschei bugün ne sunuyor?',
    a: 'Koschei, içerik odaklı ekiplerin görevlerini tek ekranda izlemesine, brief hazırlamasına ve AI destekli taslak üretimine yardımcı olur.'
  },
  {
    q: 'Platform her şeyi otomatik olarak yayınlıyor mu?',
    a: 'Hayır. Platform öneriler üretir ve iş akışını hızlandırır. Yayınlama ve son onay adımları kullanıcı denetimi ile yapılır.'
  },
  {
    q: 'Kimler için uygun?',
    a: 'Küçük ekipler, ajanslar ve içerik operasyonunu daha düzenli yürütmek isteyen ürün/pazarlama ekipleri için uygundur.'
  },
  {
    q: 'Planlanan özellikler neler?',
    a: 'Geliştirme planında daha güçlü entegrasyonlar ve gelişmiş otomasyon araçları bulunur. Ancak bu özellikler hazır olduğunda ayrı olarak duyurulur.'
  }
];

export default function HomePage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />

      <section className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei AI</p>
        <h1 className="text-4xl font-bold">İçerik operasyonu için AI destekli çalışma alanı</h1>
        <p className="max-w-3xl text-white/75">
          Koschei, ekiplerin içerik görevlerini daha düzenli yönetmesine yardımcı olan bir iş akışı platformudur. Brief
          hazırlama, taslak üretimi ve süreç takibi gibi adımları tek yerde birleştirir.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">
            Hesap oluştur
          </Link>
          <Link href="/login" className="rounded-xl border border-white/20 px-5 py-3">
            Giriş yap
          </Link>
          <Link href="/articles" className="rounded-xl border border-white/20 px-5 py-3">
            Yazıları incele
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-2xl font-semibold">Kimler için?</h2>
          <p className="mt-2 text-white/75">
            İçerik üretiminde görev takibi zorlaşan küçük/orta ölçekli ekipler, ajanslar ve çoklu kanal içerik planlayan
            ekipler için tasarlanmıştır.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h2 className="text-2xl font-semibold">Bugün kullanılabilenler</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-white/75">
            <li>İçerik brief ve görev akışı yönetimi</li>
            <li>AI destekli taslak ve metin önerileri</li>
            <li>Proje ve çalışma adımlarını dashboard üzerinden takip</li>
          </ul>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h2 className="text-2xl font-semibold">Planlanan geliştirmeler</h2>
        <p className="mt-2 text-white/75">
          Üçüncü taraf platform entegrasyonları ve daha gelişmiş otomasyon yetenekleri üzerinde çalışıyoruz. Bu alanlar
          aşamalı olarak yayınlanır ve canlıya alınan özellikler ürün duyurularında açıkça belirtilir.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Sık sorulan sorular</h2>
        <div className="space-y-3">
          {faqItems.map((item) => (
            <article key={item.q} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-1 text-white/75">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="text-sm text-white/70">
        <p>
          Yasal ve güven sayfaları: <Link href="/about" className="text-neon hover:underline">Hakkımızda</Link>,{' '}
          <Link href="/contact" className="text-neon hover:underline">İletişim</Link>,{' '}
          <Link href="/privacy-policy" className="text-neon hover:underline">Gizlilik Politikası</Link>,{' '}
          <Link href="/terms" className="text-neon hover:underline">Kullanım Koşulları</Link> ve{' '}
          <Link href="/cookies" className="text-neon hover:underline">Çerez Politikası</Link>.
        </p>
      </section>
    </main>
  );
}

```

### frontend/app/pricing/page.tsx

```ts
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

const plans = [
  {
    name: 'Ücretsiz',
    badge: 'Başlangıç için',
    price: '₺0',
    period: '/ay',
    features: ['30 run/ay', 'Temel agent erişimi', 'Sonuç kaydetme', 'Proje organizasyonu'],
    cta: { href: '/signup', label: 'Ücretsiz Başla' }
  },
  {
    name: 'Başlangıç',
    badge: 'En popüler',
    price: '₺590',
    period: '/ay',
    features: ['300 run/ay', 'Öncelikli işlem', 'Araştırma destekli kullanım', 'Gelişmiş üretim akışı'],
    cta: { href: '/signup', label: 'Başlangıç Planını Seç' }
  },
  {
    name: 'Pro',
    badge: 'Ekipler için',
    price: '₺1.490',
    period: '/ay',
    features: ['Yüksek limit yaklaşımı', 'Derin analiz modu', 'Öncelikli işlem', 'İleri kullanım senaryoları'],
    cta: { href: '/signup', label: 'Pro Planına Geç' }
  }
] as const;

export default function PricingPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Fiyatlandırma</p>
        <h1 className="text-4xl font-bold">Ekibiniz için net ve güvenilir planlar</h1>
        <p className="max-w-3xl text-white/75">
          Koschei AI, çekirdek üretim akışınızı hızlandırmak için tasarlanmıştır. Planlarınızı ihtiyaçlarınıza göre yükseltebilir,
          kullanım durumunu ürün içinden anlık takip edebilirsiniz.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-wide text-white/60">{plan.badge}</p>
            <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-3xl font-bold">
              {plan.price}
              <span className="text-base font-medium text-white/65">{plan.period}</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <Link href={plan.cta.href} className="mt-5 inline-flex rounded-xl border border-neon/60 px-4 py-2 text-sm text-neon hover:bg-neon/10">
              {plan.cta.label}
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/75">
        <p>
          Güven ve şeffaflık önceliğimizdir. Gerçek yayın entegrasyonları hazır değilse sistem bunu açıkça belirtir; yanıltıcı
          "yayınlandı" mesajı gösterilmez.
        </p>
      </section>
    </main>
  );
}

```

### frontend/app/privacy-policy/page.tsx

```ts
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Koschei AI',
  description: 'Koschei AI gizlilik politikası: veri işleme, saklama ve kullanıcı hakları hakkında bilgiler.'
};

export default function PrivacyPolicyPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Gizlilik Politikası</h1>
      <p className="text-white/75">
        Koschei AI, hizmetin çalışması için gerekli olan temel hesap ve kullanım verilerini işler. Bu veriler; giriş
        işlemleri, güvenlik kontrolleri, ürün performansını izleme ve kullanıcı desteği sağlama amacıyla kullanılır.
      </p>
      <p className="text-white/75">
        Platform içinde oluşturduğunuz içerik taslakları ve iş akışı kayıtları, hizmet kalitesi ve operasyonel devamlılık
        için saklanabilir. Verilere erişim yalnızca yetkili sistemler ve gerekli durumlarda destek süreçleri ile
        sınırlıdır.
      </p>
      <p className="text-white/75">
        Sitede analiz, ölçümleme veya reklam gösterimi için üçüncü taraf hizmetler kullanılabilir. Bu hizmetler çerez ve
        benzeri teknolojilerden yararlanabilir. Çerez kullanımına ilişkin detaylar için{' '}
        <Link href="/cookies" className="text-neon hover:underline">
          Çerez Politikası
        </Link>{' '}
        sayfasını inceleyebilirsiniz.
      </p>
      <p className="text-white/75">
        Gizlilik haklarınız ve veri talepleriniz için{' '}
        <a className="text-neon hover:underline" href="mailto:hello@tradepigloball.co">
          hello@tradepigloball.co
        </a>{' '}
        adresine yazabilirsiniz.
      </p>
    </main>
  );
}

```

### frontend/app/projects/[id]/actions.ts

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export async function createProjectItemAction(projectId: string, formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const details = String(formData.get('details') ?? '').trim();

  if (!title) return;

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) redirect('/signin');

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('project_items').insert({
    workspace_id: currentWorkspaceId,
    project_id: projectId,
    user_id: currentUser.id,
    item_type: 'note',
    title,
    content: details || null
  });

  revalidatePath(`/projects/${projectId}`);
}

```

### frontend/app/projects/[id]/page.tsx

```ts
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import { createProjectItemAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { workspaceId, userId } = await getWorkspaceContext();

  const createItem = createProjectItemAction.bind(null, id);

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, created_at')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const [{ data: items, error: itemsError }, { data: outputs, error: outputsError }, { data: contentItems, error: contentItemsError }] =
    await Promise.all([
    supabase
      .from('project_items')
      .select('id, item_type, title, content, saved_output_id, created_at, updated_at')
      .eq('project_id', project.id)
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_outputs')
      .select('id, title, content, created_at')
      .eq('project_id', project.id)
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('content_items')
      .select('id, brief, created_at')
      .eq('project_id', project.id)
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <p className="text-sm text-white/70">{project.description || 'Açıklama henüz eklenmedi.'}</p>
            <p className="mt-1 text-xs text-white/60">Oluşturulma: {new Date(project.created_at).toLocaleString('tr-TR')}</p>
          </div>
          <Link href="/projects" className="rounded-lg border border-white/20 px-3 py-2 text-sm">
            Projelere dön
          </Link>
        </div>

        <form action={createItem} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input
            name="title"
            required
            placeholder="Öğe başlığı"
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <input
            name="details"
            placeholder="Öğe detayları (opsiyonel)"
            className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Öğe Ekle
          </button>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Proje Öğeleri</h3>
          {itemsError ? (
            <p className="text-sm text-red-300">Öğeler yüklenemedi: {itemsError.message}</p>
          ) : items && items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-white/70 line-clamp-3">{item.content || 'İçerik henüz girilmedi.'}</p>
                  <p className="text-xs text-white/50">İçerik türü: {item.item_type}</p>
                  {item.saved_output_id ? (
                    <p className="text-xs text-white/50">Kaydedilen çıktı: {item.saved_output_id}</p>
                  ) : null}
                  <p className="text-xs text-white/50">Eklenme: {new Date(item.created_at).toLocaleString('tr-TR')}</p>
                  <p className="text-xs text-white/50">Son güncelleme: {new Date(item.updated_at ?? item.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">Henüz öğe yok.</p>
          )}
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Son Kaydedilen Çıktılar</h3>
          {outputsError ? (
            <p className="text-sm text-red-300">Kaydedilen çıktılar yüklenemedi: {outputsError.message}</p>
          ) : outputs && outputs.length > 0 ? (
            <div className="space-y-2">
              {outputs.map((output) => (
                <div key={output.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">{output.title || 'Kaydedilen çıktı'}</p>
                  <p className="text-sm text-white/70 line-clamp-3">{output.content}</p>
                  <p className="text-xs text-white/50">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">Bu projeye bağlı kayıtlı çıktı bulunmuyor.</p>
          )}
        </article>

        <article className="panel lg:col-span-2">
          <h3 className="mb-3 text-lg font-semibold">İçerik Öğeleri</h3>
          {contentItemsError ? (
            <p className="text-sm text-red-300">İçerik öğeleri yüklenemedi: {contentItemsError.message}</p>
          ) : contentItems && contentItems.length > 0 ? (
            <div className="space-y-2">
              {contentItems.map((contentItem) => (
                <div key={contentItem.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <p className="font-medium">İçerik öğesi</p>
                  <p className="text-sm text-white/70 line-clamp-3">{contentItem.brief || 'Brief kaydı yok.'}</p>
                  <p className="text-xs text-white/50">Eklenme: {new Date(contentItem.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/70">Bu projede içerik öğesi bulunmuyor.</p>
          )}
        </article>
      </section>
    </main>
  );
}

```

### frontend/app/projects/actions.ts

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();

  if (!name) return;

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser }
  } = await serverSupabase.auth.getUser();

  if (!currentUser) {
    redirect('/signin');
  }

  const { workspaceId: currentWorkspaceId } = await getWorkspaceContext();

  await serverSupabase.from('projects').insert({
    workspace_id: currentWorkspaceId,
    user_id: currentUser.id,
    name,
    description: description || null
  });

  revalidatePath('/projects');
  revalidatePath('/dashboard');
}

```

### frontend/app/projects/page.tsx

```ts
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { createProjectAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const { supabase, workspace, userId } = await getAppContextOrRedirect();

  const [{ data: projects, error }, { data: items, error: itemsError }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, description, created_at, updated_at, workspace_id, user_id')
      .eq('workspace_id', workspace.workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_items')
      .select('project_id, item_type, created_at')
      .eq('workspace_id', workspace.workspaceId)
      .eq('user_id', userId)
  ]);

  const itemStats = (items ?? []).reduce<Record<string, { count: number; types: Set<string>; lastItemAt: string | null }>>((acc, item) => {
    if (!acc[item.project_id]) {
      acc[item.project_id] = { count: 0, types: new Set<string>(), lastItemAt: null };
    }

    acc[item.project_id].count += 1;
    acc[item.project_id].types.add(item.item_type);
    const currentLast = acc[item.project_id].lastItemAt;
    acc[item.project_id].lastItemAt =
      !currentLast || new Date(item.created_at).getTime() > new Date(currentLast).getTime() ? item.created_at : currentLast;
    return acc;
  }, {});

  return (
    <main>
      <Nav />

      <section className="panel mb-4">
        <h2 className="mb-4 text-2xl font-semibold">Projeler</h2>
        <form action={createProjectAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input name="name" required placeholder="Proje adı" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <input name="description" placeholder="Kısa açıklama" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
          <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
            Oluştur
          </button>
        </form>
      </section>

      <section className="panel">
        {itemsError ? <p className="mb-3 text-xs text-amber-200">Öğe özeti yüklenemedi, proje listesi gösteriliyor.</p> : null}
        {error ? (
          <p className="text-sm text-red-300">Projeler yüklenemedi: {error.message}</p>
        ) : projects && projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-white/10 px-4 py-3">
                <p className="font-medium">{project.name}</p>
                <p className="text-sm text-white/60">{project.description || 'Açıklama yok.'}</p>
                <p className="mt-2 text-xs text-white/55">Öğe sayısı: {itemStats[project.id]?.count ?? 0}</p>
                <p className="text-xs text-white/55">İçerik tipleri: {Array.from(itemStats[project.id]?.types ?? []).join(', ') || 'Henüz yok'}</p>
                <p className="text-xs text-white/55">Oluşturulma: {new Date(project.created_at).toLocaleString('tr-TR')}</p>
                <p className="text-xs text-white/55">
                  Son güncelleme:{' '}
                  {new Date(itemStats[project.id]?.lastItemAt ?? project.updated_at ?? project.created_at).toLocaleString('tr-TR')}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/70">Henüz proje yok.</p>
        )}
      </section>
    </main>
  );
}

```

### frontend/app/reset-password/page.tsx

```ts
'use client';

import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setErrorMessage('Sistem ayarları eksik. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      const redirectTo = `${window.location.origin}/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setErrorMessage('Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin.');
        return;
      }

      setMessage('Şifre yenileme bağlantısı e-posta adresine gönderildi. Gelen kutunu kontrol et.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Şifreni yenile</h1>
      <p className="mb-6 text-sm text-white/70">Hesabına bağlı e-posta adresini gir, sana şifre yenileme bağlantısı gönderelim.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          E-posta
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="ornek@koschei.ai"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}
        </button>
      </form>

      {message ? <p className="mt-4 text-sm text-lilac">{message}</p> : null}
      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
    </main>
  );
}

```

### frontend/app/robots.ts

```ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/contact', '/privacy-policy', '/terms', '/cookies', '/articles'],
        disallow: ['/dashboard', '/agents', '/projects', '/runs', '/saved', '/connections']
      }
    ]
  };
}

```

### frontend/app/runs/page.tsx

```ts
import { Nav } from '@/components/nav';
import { RunsList } from '@/components/runs-list';
import { getAppContextOrRedirect } from '@/lib/app-context';

export const dynamic = 'force-dynamic';

export default async function RunsPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();
  const { data, error } = await supabase
    .from('agent_runs')
    .select('id, status, model_name, user_input, created_at, error_message, completed_at, agent_type_id, agent_types(name, slug)')
    .eq('workspace_id', workspace.workspaceId)
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-3 text-xl font-semibold">Çalıştırmalar</h2>
        {error ? (
          <p className="text-sm text-red-300">Run verisi alınamadı: {error.message}</p>
        ) : data && data.length > 0 ? (
          <RunsList runs={data} />
        ) : (
          <p className="text-sm text-white/70">Henüz çalıştırma yok.</p>
        )}
      </section>
    </main>
  );
}

```

### frontend/app/saved/actions.ts

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { getAppContextOrRedirect } from '@/lib/app-context';

export async function deleteSavedOutputAction(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const { supabase, workspace } = await getAppContextOrRedirect();
  await supabase.from('saved_outputs').delete().eq('id', id).eq('workspace_id', workspace.workspaceId);
  revalidatePath('/saved');
}

```

### frontend/app/saved/page.tsx

```ts
import { Nav } from '@/components/nav';
import { SavedList } from '@/components/saved-list';
import { getAppContextOrRedirect } from '@/lib/app-context';
import { deleteSavedOutputAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const { data, error } = await supabase
    .from('saved_outputs')
    .select('id, title, content, created_at, agent_run_id, agent_runs(id, agent_type_id)')
    .eq('workspace_id', workspace.workspaceId)
    .order('created_at', { ascending: false })
    .limit(100);

  async function onDelete(id: string) {
    'use server';
    const formData = new FormData();
    formData.set('id', id);
    await deleteSavedOutputAction(formData);
  }

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-3 text-xl font-semibold">Kaydedilen Çıktılar</h2>
        {error ? (
          <p className="text-sm text-red-300">Kayıtlar alınamadı: {error.message}</p>
        ) : data && data.length > 0 ? (
          <SavedList items={data} onDelete={onDelete} />
        ) : (
          <p className="text-sm text-white/70">Henüz kaydedilen çıktı yok.</p>
        )}
      </section>
    </main>
  );
}

```

### frontend/app/settings/page.tsx

```ts
import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { supabase, workspace, userId } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: profile }, { data: subscription }, { count: usageCount }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', userId).maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan_name, run_limit, status')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.workspaceId)
      .gte('created_at', monthStart.toISOString())
  ]);

  async function signOutAction() {
    'use server';
    const { supabase: serverSupabase } = await getAppContextOrRedirect();
    await serverSupabase.auth.signOut();
    redirect('/signin');
  }

  return (
    <main>
      <Nav />
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h2 className="text-xl font-semibold">Profil</h2>
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <p><span className="text-white/60">Ad:</span> {profile?.full_name ?? 'Belirtilmedi'}</p>
            <p><span className="text-white/60">E-posta:</span> {profile?.email ?? 'Belirtilmedi'}</p>
            <p><span className="text-white/60">Workspace:</span> {workspace.workspaceName}</p>
          </div>
        </article>

        <article className="panel">
          <h2 className="text-xl font-semibold">Plan ve Kullanım</h2>
          <div className="mt-3 space-y-2 text-sm text-white/80">
            <p><span className="text-white/60">Plan:</span> {subscription?.plan_name ?? 'free'}</p>
            <p><span className="text-white/60">Durum:</span> {subscription?.status ?? 'active'}</p>
            <p><span className="text-white/60">Aylık limit:</span> {subscription?.run_limit ?? 30}</p>
            <p><span className="text-white/60">Bu ay kullanım:</span> {usageCount ?? 0}</p>
          </div>
        </article>
      </section>

      <section className="panel mt-4">
        <h2 className="text-xl font-semibold">Oturum</h2>
        <p className="mt-1 text-sm text-white/70">Güvenli çıkış için aşağıdaki işlemi kullanabilirsiniz.</p>
        <form action={signOutAction} className="mt-3">
          <button type="submit" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-neon">Çıkış yap</button>
        </form>
      </section>
    </main>
  );
}

```

### frontend/app/signin/page.tsx

```ts
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { createSupabaseBrowserClient, getMissingPublicSupabaseConfig } from '@/lib/supabase-browser';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        const { missingKeys } = getMissingPublicSupabaseConfig();
        const detail = missingKeys.length ? ` Eksik değişkenler: ${missingKeys.join(', ')}` : '';
        setErrorMessage(`Uygulama yapılandırması tamamlanmamış.${detail}`);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session?.access_token) {
        setErrorMessage('Giriş başarısız. E-posta veya şifreyi kontrol edin.');
        return;
      }

      const bootstrapResponse = await fetch('/api/bootstrap', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`
        }
      });

      if (!bootstrapResponse.ok) {
        setErrorMessage('Çalışma alanı hazırlanamadı. Lütfen tekrar deneyin.');
        return;
      }

      window.location.assign('/dashboard');
    } catch {
      setErrorMessage('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  const urlError = searchParams.get('error');

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Koschei AI Giriş</h1>
      <p className="mb-6 text-sm text-white/70">E-posta ve şifren ile hesabına güvenle giriş yap.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">
          E-posta
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="ornek@koschei.ai"
          />
        </label>

        <label className="block text-sm">
          Şifre
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="••••••••"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>

      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
      {urlError ? <p className="mt-2 text-sm text-red-300">Hata: {urlError}</p> : null}

      <div className="mt-6 space-y-2 text-sm text-white/80">
        <p>
          Hesabın yok mu?{' '}
          <Link href="/signup" className="text-lilac underline underline-offset-4 hover:text-neon">
            Kayıt ol
          </Link>
        </p>
        <p>
          <Link href="/reset-password" className="text-lilac underline underline-offset-4 hover:text-neon">
            Şifreni mi unuttun?
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl panel" />}>
      <SignInContent />
    </Suspense>
  );
}

```

### frontend/app/signup/page.tsx

```ts
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient, getMissingPublicSupabaseConfig } from '@/lib/supabase-browser';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        const { missingKeys } = getMissingPublicSupabaseConfig();
        const detail = missingKeys.length ? ` Eksik değişkenler: ${missingKeys.join(', ')}` : '';
        setErrorMessage(`Uygulama yapılandırması tamamlanmamış.${detail}`);
        return;
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMessage('Kayıt başarısız. Bilgileri kontrol edip tekrar deneyin.');
        return;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        router.push('/confirm-email');
        return;
      }

      const bootstrapResponse = await fetch('/api/bootstrap', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!bootstrapResponse.ok) {
        setErrorMessage('Hesap oluşturuldu ancak çalışma alanı hazırlanamadı. Lütfen giriş yapın.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setErrorMessage('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Koschei AI Kayıt</h1>
      <p className="mb-6 text-sm text-white/70">Yeni hesabını oluştur ve agentlarını hemen kullanmaya başla.</p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">
          E-posta
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="ornek@koschei.ai"
          />
        </label>

        <label className="block text-sm">
          Şifre
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            placeholder="En az 6 karakter"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Kayıt oluşturuluyor...' : 'Kayıt ol'}
        </button>
      </form>

      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}

      <p className="mt-6 text-sm text-white/80">
        Zaten hesabın var mı?{' '}
        <Link href="/signin" className="text-lilac underline underline-offset-4 hover:text-neon">
          Giriş yap
        </Link>
      </p>
    </main>
  );
}

```

### frontend/app/sitemap.ts

```ts
import type { MetadataRoute } from 'next';
import { publicArticles } from '@/lib/public-articles';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradepigloball.co';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['/', '/about', '/contact', '/privacy-policy', '/terms', '/cookies', '/articles'];
  const articleRoutes = publicArticles.map((article) => `/articles/${article.slug}`);

  return [...routes, ...articleRoutes].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date()
  }));
}

```

### frontend/app/terms/page.tsx

```ts
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Koschei AI',
  description: 'Koschei AI hizmet kullanım koşulları ve kullanıcı sorumlulukları.'
};

export default function TermsPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Kullanım Koşulları</h1>
      <p className="text-white/75">
        Koschei AI hizmetini kullanarak bu sayfadaki temel kullanım koşullarını kabul etmiş olursunuz. Hizmet, içerik
        operasyonunu desteklemek için sunulur ve kullanıcı denetimini ortadan kaldıran bir “tam otomasyon” vaadi içermez.
      </p>
      <p className="text-white/75">
        Hesap güvenliğinden kullanıcı sorumludur. Hesap paylaşımı, yetkisiz erişim veya hizmete zarar verecek kullanım
        tespit edildiğinde erişim kısıtlanabilir.
      </p>
      <p className="text-white/75">
        Platformda üretilen taslak içeriklerin doğruluğu ve yasal uygunluğu kullanıcı tarafından kontrol edilmelidir.
        Özellikle kamuya açık yayınlarda son sorumluluk içerik sahibine aittir.
      </p>
      <p className="text-white/75">
        Hizmet koşulları, güvenlik veya mevzuat gereksinimleri doğrultusunda güncellenebilir. Gizlilik ve çerez
        uygulamaları için{' '}
        <Link href="/privacy-policy" className="text-neon hover:underline">
          Gizlilik Politikası
        </Link>{' '}
        ve{' '}
        <Link href="/cookies" className="text-neon hover:underline">
          Çerez Politikası
        </Link>{' '}
        sayfalarını inceleyebilirsiniz.
      </p>
    </main>
  );
}

```

### frontend/app/update-password/page.tsx

```ts
'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== passwordRepeat) {
      setErrorMessage('Girilen şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setErrorMessage('Sistem ayarları eksik. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage('Şifre güncellenemedi. Lütfen tekrar deneyin.');
        return;
      }

      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl panel">
      <h1 className="mb-2 text-3xl font-semibold">Yeni şifre belirle</h1>
      <p className="mb-6 text-sm text-white/70">Güvenli bir şifre oluştur ve hesabına devam et.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          Yeni şifre
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
        </label>

        <label className="block text-sm">
          Yeni şifre (tekrar)
          <input
            required
            type="password"
            minLength={6}
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:opacity-50"
        >
          {loading ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
        </button>
      </form>

      {errorMessage ? <p className="mt-4 text-sm text-red-300">{errorMessage}</p> : null}
    </main>
  );
}

```

### frontend/app/upgrade/page.tsx

```ts
import Link from 'next/link';
import { Nav } from '@/components/nav';
import { getAppContextOrRedirect } from '@/lib/app-context';

export const dynamic = 'force-dynamic';

export default async function UpgradePage() {
  const { supabase, workspace } = await getAppContextOrRedirect();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [{ data: subscription }, { count: usageCount }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('id, plan_name, run_limit, status, current_period_end')
      .eq('workspace_id', workspace.workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('agent_runs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.workspaceId)
      .gte('created_at', monthStart.toISOString())
  ]);

  const runLimit = subscription?.run_limit ?? 30;
  const usedRuns = usageCount ?? 0;
  const usagePercent = Math.min(100, Math.round((usedRuns / Math.max(1, runLimit)) * 100));

  return (
    <main>
      <Nav />
      <section className="panel space-y-4">
        <h2 className="text-2xl font-semibold">Planı Yükselt</h2>
        <p className="text-sm text-white/70">Mevcut plan, kullanım ve limit durumunuzu buradan takip edebilirsiniz.</p>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/60">Mevcut plan</p>
            <p className="mt-1 text-lg font-semibold">{subscription?.plan_name ?? 'free'}</p>
            <p className="text-xs text-white/60">Durum: {subscription?.status ?? 'active'}</p>
          </article>
          <article className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/60">Bu ay kullanım</p>
            <p className="mt-1 text-lg font-semibold">{usedRuns} / {runLimit}</p>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-neon" style={{ width: `${usagePercent}%` }} />
            </div>
          </article>
          <article className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-white/60">Dönem sonu</p>
            <p className="mt-1 text-lg font-semibold">
              {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('tr-TR') : 'Belirtilmedi'}
            </p>
          </article>
        </div>

        <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Ödeme başlatma akışı bu ortamda henüz hazır değil. Entegrasyon etkinleştiğinde bu alandan güvenli ödeme adımına
          yönlendirileceksiniz.
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/pricing" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:border-neon">Planları karşılaştır</Link>
          <button type="button" disabled className="cursor-not-allowed rounded-lg border border-white/10 px-4 py-2 text-sm text-white/40">
            Ödeme başlat (yakında)
          </button>
        </div>
      </section>
    </main>
  );
}

```

### frontend/components/agent-editor/AgentEditorRenderer.tsx

```ts
'use client';

import type { AgentEditorConfig, EditorState } from '@/lib/agent-editor';

type AgentEditorRendererProps = {
  config: AgentEditorConfig;
  state: EditorState;
  onChange: (key: string, value: string | boolean) => void;
};

export function AgentEditorRenderer({ config, state, onChange }: AgentEditorRendererProps) {
  return (
    <div className="space-y-4">
      {config.sections.map((section) => (
        <div key={section.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="text-sm font-semibold text-white/90">{section.title}</h4>
          <p className="mt-1 text-xs text-white/55">Bu bölümdeki alanlar çalışma öncesi brifti güçlendirir.</p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {section.fields.map((field) => {
              const value = typeof state[field.key] === 'string' ? (state[field.key] as string) : '';

              if (field.type === 'select') {
                return (
                  <label key={field.key} className="flex min-w-0 flex-col gap-1 text-sm md:col-span-1">
                    <span className="text-white/70">{field.label}</span>
                    <select
                      value={value}
                      onChange={(event) => onChange(field.key, event.target.value)}
                      className="min-w-0 rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none transition focus:border-neon"
                    >
                      <option value="">Seçiniz</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <label key={field.key} className="flex min-w-0 flex-col gap-1 text-sm md:col-span-2">
                    <span className="text-white/70">{field.label}</span>
                    <textarea
                      value={value}
                      onChange={(event) => onChange(field.key, event.target.value)}
                      rows={4}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none transition focus:border-neon"
                    />
                  </label>
                );
              }

              return (
                <label key={field.key} className="flex min-w-0 flex-col gap-1 text-sm md:col-span-1">
                  <span className="text-white/70">{field.label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="min-w-0 rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none transition focus:border-neon"
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {config.toggles?.length ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="mb-3 text-sm font-semibold text-white/90">Opsiyonel Ayarlar</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {config.toggles.map((toggle) => (
              <label key={toggle.key} className="inline-flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={Boolean(state[toggle.key])}
                  onChange={(event) => onChange(toggle.key, event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                />
                {toggle.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

```

### frontend/components/agent-editor/AgentEditorShell.tsx

```ts
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  buildDerivedPrompt,
  buildPreviewBlocks,
  getAgentEditorConfig,
  getAgentStarterPacks,
  type EditorMetadata,
  type EditorState
} from '@/lib/agent-editor';
import { AgentEditorRenderer } from './AgentEditorRenderer';
import { LivePreviewPanel } from './LivePreviewPanel';

type AgentEditorShellProps = {
  agentSlug: string;
  projects: Array<{ id: string; name: string }>;
  runAction: (formData: FormData) => void;
  initialMetadata?: EditorMetadata;
};

export function AgentEditorShell({ agentSlug, projects, runAction, initialMetadata }: AgentEditorShellProps) {
  const config = useMemo(() => getAgentEditorConfig(agentSlug), [agentSlug]);
  const [editorState, setEditorState] = useState<EditorState>(initialMetadata?.editorState ?? {});
  const [freeNotes, setFreeNotes] = useState(initialMetadata?.freeNotes ?? '');
  const [isPending, startTransition] = useTransition();

  const storageKey = `agent-editor-v2:${agentSlug}`;
  const starterPacks = useMemo(() => getAgentStarterPacks(agentSlug), [agentSlug]);

  useEffect(() => {
    if (initialMetadata) return;

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { editorState?: EditorState; freeNotes?: string };
      if (parsed.editorState && typeof parsed.editorState === 'object') {
        setEditorState(parsed.editorState);
      }
      if (typeof parsed.freeNotes === 'string') {
        setFreeNotes(parsed.freeNotes);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [initialMetadata, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        editorState,
        freeNotes
      })
    );
  }, [editorState, freeNotes, storageKey]);

  const derivedPrompt = useMemo(() => buildDerivedPrompt(config, editorState, freeNotes), [config, editorState, freeNotes]);
  const previewBlocks = useMemo(() => buildPreviewBlocks(config, editorState, freeNotes), [config, editorState, freeNotes]);

  const handleFieldChange = (key: string, value: string | boolean) => {
    setEditorState((current) => ({ ...current, [key]: value }));
  };

  return (
    <form
      action={(formData) => {
        startTransition(() => runAction(formData));
      }}
      className="space-y-4"
    >
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-lg font-semibold">{config.title}</h3>
        <p className="mt-1 text-sm text-white/70">{config.shortHelp}</p>
        <p className="mt-1 text-xs text-white/55">Bu çalışma sonunda beklenen yapı: {config.summaryDescription}</p>

        {starterPacks.length ? (
          <div className="mt-4 space-y-2">
            <span className="text-xs text-white/50">Hızlı başlat</span>
            <div className="flex flex-wrap items-center gap-2">
              {starterPacks.map((pack) => (
                <button
                  key={pack.label}
                  type="button"
                  onClick={() => {
                    setEditorState((current) => ({ ...current, ...pack.state }));
                    if (pack.freeNotes) {
                      setFreeNotes(pack.freeNotes);
                    }
                  }}
                  className="rounded-md border border-white/20 px-2 py-1 text-xs text-white/80 hover:border-neon"
                  title={pack.description}
                >
                  {pack.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setEditorState({});
                  setFreeNotes('');
                  window.localStorage.removeItem(storageKey);
                }}
                className="rounded-md border border-white/20 px-2 py-1 text-xs text-white/70 hover:border-red-300/70"
              >
                Temizle
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <AgentEditorRenderer config={config} state={editorState} onChange={handleFieldChange} />

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/70">Ek notlar</span>
              <span className="text-xs text-white/50">Bu alan serbesttir. Ek bağlam, örnek ifade veya kaçınılması gereken noktaları yazabilirsiniz.</span>
              <textarea
                name="free_notes"
                rows={4}
                value={freeNotes}
                onChange={(event) => setFreeNotes(event.target.value)}
                placeholder={config.placeholder}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none transition focus:border-neon"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              name="project_id"
              defaultValue=""
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon md:min-w-64 md:flex-none"
            >
              <option value="">Proje seçimi (opsiyonel)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={isPending} className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-70">
              {isPending ? 'Çalıştırılıyor...' : 'Çalıştır'}
            </button>
          </div>
        </div>

        <LivePreviewPanel
          title="Canlı Önizleme"
          helpText="Bu panel, sadece mevcut form girdilerinden oluşturulan çalışma önizlemesini gösterir."
          blocks={previewBlocks}
          derivedPrompt={derivedPrompt}
        />
      </div>

      <input type="hidden" name="prompt" value={derivedPrompt} />
      <input type="hidden" name="derived_prompt" value={derivedPrompt} />
      <input type="hidden" name="editor_state" value={JSON.stringify(editorState)} />
    </form>
  );
}

```

### frontend/components/agent-editor/LivePreviewPanel.tsx

```ts
'use client';

type LivePreviewPanelProps = {
  title: string;
  helpText: string;
  blocks: Array<{ title: string; content: string }>;
  derivedPrompt: string;
};

export function LivePreviewPanel({ title, helpText, blocks, derivedPrompt }: LivePreviewPanelProps) {
  const filledBlockCount = blocks.filter((block) => !block.content.includes('Henüz belirtilmedi')).length;

  return (
    <aside className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4 lg:sticky lg:top-4 lg:h-fit">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-white/65">{helpText}</p>
        <p className="mt-2 text-xs text-white/50">
          Önizleme doluluk: {filledBlockCount}/{blocks.length}
        </p>
      </div>

      <div className="space-y-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs uppercase tracking-wide text-white/50">{block.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{block.content}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neon/30 bg-neon/10 p-3">
        <p className="text-xs uppercase tracking-wide text-neon">Çalıştırmaya Giden Yapılandırılmış İstek</p>
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-white/80">{derivedPrompt}</p>
      </div>
    </aside>
  );
}

```

### frontend/components/agent-editor/ResultPanel.tsx

```ts
'use client';

type ResultPanelProps = {
  text: string;
  status: 'completed' | 'failed' | 'pending' | 'processing' | 'idle';
};

function asLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, arr) => line || (index > 0 && arr[index - 1] !== ''));
}

function isNumberedItem(line: string): boolean {
  return /^\d+[.)]\s+/.test(line);
}

export function ResultPanel({ text, status }: ResultPanelProps) {
  const lines = asLines(text);
  const isEmpty = !text.trim();

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-white/50">Üretilen Çıktı</p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(text)}
          disabled={isEmpty}
          className="rounded border border-white/20 px-2 py-1 text-xs text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Kopyala
        </button>
      </div>

      {status === 'failed' ? (
        <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          Çalıştırma tamamlanamadı. Hata detayını kontrol edip aynı girdiyle yeniden deneyin.
        </p>
      ) : null}

      {(status === 'pending' || status === 'processing') && isEmpty ? (
        <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Çıktı hazırlanıyor. İşlem tamamlandığında bu alan otomatik güncellenecek.
        </p>
      ) : null}

      {status === 'completed' && isEmpty ? (
        <p className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white/70">Çıktı boş döndü.</p>
      ) : null}

      {!isEmpty ? (
        <div className="space-y-2 text-sm text-white/85">
          {lines.map((line, index) => {
            if ((line.startsWith('## ') || line.endsWith(':')) && line.length < 90) {
              const heading = line.replace(/^##\s*/, '');
              return (
                <p key={`${line}-${index}`} className="pt-2 text-sm font-semibold text-neon">
                  {heading}
                </p>
              );
            }

            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <p key={`${line}-${index}`} className="pl-3 leading-relaxed text-white/80">
                  • {line.slice(2)}
                </p>
              );
            }

            if (isNumberedItem(line)) {
              return (
                <p key={`${line}-${index}`} className="pl-3 leading-relaxed text-white/80">
                  {line}
                </p>
              );
            }

            return (
              <p key={`${line}-${index}`} className="whitespace-pre-wrap leading-relaxed text-white/80">
                {line}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

```

### frontend/components/agent-editor/RunStatusPoller.tsx

```ts
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type RunStatusPollerProps = {
  runId: string;
  status: string;
  intervalMs?: number;
  maxPollCount?: number;
};

export function RunStatusPoller({ runId, status, intervalMs = 2500, maxPollCount = 120 }: RunStatusPollerProps) {
  const router = useRouter();
  const pollCountRef = useRef(0);
  const isPollingStatus = status === 'pending' || status === 'processing';

  useEffect(() => {
    if (!isPollingStatus) {
      pollCountRef.current = 0;
      return;
    }

    router.refresh();
    const timer = window.setInterval(() => {
      pollCountRef.current += 1;
      router.refresh();

      if (pollCountRef.current >= maxPollCount) {
        window.clearInterval(timer);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [runId, isPollingStatus, intervalMs, maxPollCount, router]);

  return null;
}

```

### frontend/components/agent-editor/SocialOutputPanel.tsx

```ts
'use client';

type SocialOutputPanelProps = {
  youtubeTitle?: string | null;
  youtubeDescription?: string | null;
  instagramCaption?: string | null;
  tiktokCaption?: string | null;
};

function OutputCard({
  title,
  content,
  emptyText
}: {
  title: string;
  content: string | null | undefined;
  emptyText: string;
}) {
  const hasContent = Boolean(content && content.trim());

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-white/55">{title}</p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(content ?? '')}
          disabled={!hasContent}
          className="rounded border border-white/20 px-2 py-1 text-xs text-white/75 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Kopyala
        </button>
      </div>
      {hasContent ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85">{content}</p>
      ) : (
        <p className="rounded border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white/60">{emptyText}</p>
      )}
    </div>
  );
}

export function SocialOutputPanel({ youtubeTitle, youtubeDescription, instagramCaption, tiktokCaption }: SocialOutputPanelProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <OutputCard title="YouTube Başlık" content={youtubeTitle} emptyText="Bu çalıştırmada YouTube başlığı üretilemedi." />
        <OutputCard
          title="YouTube Açıklama"
          content={youtubeDescription}
          emptyText="Bu çalıştırmada YouTube açıklaması üretilemedi."
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <OutputCard
          title="Instagram Açıklama Metni"
          content={instagramCaption}
          emptyText="Bu çalıştırmada Instagram metni üretilemedi."
        />
        <OutputCard title="TikTok Açıklama Metni" content={tiktokCaption} emptyText="Bu çalıştırmada TikTok metni üretilemedi." />
      </div>
    </div>
  );
}

```

### frontend/components/nav.tsx

```ts
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agentlar' },
  { href: '/projects', label: 'Projeler' },
  { href: '/saved', label: 'Kaydedilenler' },
  { href: '/runs', label: 'Çalışmalar' },
  { href: '/settings', label: 'Ayarlar' }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export function Nav() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push('/signin');
    router.refresh();
  }

  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-lilac">Koschei</p>
        <h1 className="text-2xl font-semibold">Koschei AI</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-neon hover:text-neon"
          >
            {link.label}
          </Link>
        ))}
        <Link href="/upgrade" className="rounded-xl border border-neon/60 px-4 py-2 text-sm text-neon transition hover:bg-neon/10">
          Yükselt
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-neon hover:text-neon"
        >
          Çıkış
        </button>
      </div>
    </nav>
  );
}

```

### frontend/components/public-site-nav.tsx

```ts
import Link from 'next/link';

const links = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/about', label: 'Hakkımızda' },
  { href: '/contact', label: 'İletişim' },
  { href: '/articles', label: 'Yazılar' },
  { href: '/pricing', label: 'Fiyatlandırma' },
  { href: '/privacy-policy', label: 'Gizlilik' },
  { href: '/terms', label: 'Kullanım Koşulları' },
  { href: '/login', label: 'Giriş' }
] as const;

export function PublicSiteNav() {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-xl border border-white/10 px-3 py-2 transition hover:border-neon hover:text-neon"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

```

### frontend/components/runs-list.tsx

```ts
'use client';

import { useMemo, useState } from 'react';
import { sanitizeUserFacingEngineLabel } from '@/lib/publish-queue';

type AgentTypeRelation = { name?: string | null; slug?: string | null } | Array<{ name?: string | null; slug?: string | null }> | null;

type RunItem = {
  id: string;
  status: string;
  model_name: string | null;
  user_input: string | null;
  created_at: string;
  error_message?: string | null;
  completed_at?: string | null;
  agent_type_id?: string | null;
  agent_types?: AgentTypeRelation;
};

function getAgentLabel(agentTypes: AgentTypeRelation | undefined): string {
  if (!agentTypes) return 'Bilinmeyen agent';
  const row = Array.isArray(agentTypes) ? agentTypes[0] : agentTypes;
  return row?.name || row?.slug || 'Bilinmeyen agent';
}

export function RunsList({ runs }: { runs: RunItem[] }) {
  const [status, setStatus] = useState('all');
  const [agent, setAgent] = useState('all');
  const [limit, setLimit] = useState(20);
  const [active, setActive] = useState<RunItem | null>(null);

  const agents = useMemo(() => {
    return Array.from(new Set(runs.map((run) => getAgentLabel(run.agent_types)))).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [runs]);

  const filtered = useMemo(() => {
    return runs.filter((run) => {
      const statusOk = status === 'all' ? true : run.status === status;
      const agentOk = agent === 'all' ? true : getAgentLabel(run.agent_types) === agent;
      return statusOk && agentOk;
    });
  }, [runs, status, agent]);

  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
          <option value="all">Durum: Tümü</option>
          <option value="completed">Tamamlandı</option>
          <option value="processing">İşleniyor</option>
          <option value="pending">Bekliyor</option>
          <option value="failed">Hata</option>
        </select>

        <select value={agent} onChange={(e) => setAgent(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
          <option value="all">Agent: Tümü</option>
          {agents.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {visible.map((run) => (
        <div key={run.id} className="rounded-lg border border-white/10 p-3">
          <p>Durum: {run.status}</p>
          <p className="text-white/70">Agent: {getAgentLabel(run.agent_types)}</p>
          <p className="text-white/70">Çalışma motoru: {sanitizeUserFacingEngineLabel(run.model_name)}</p>
          <p className="text-white/70">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
          <button onClick={() => setActive(run)} className="mt-2 rounded border border-white/20 px-2 py-1">Detay</button>
        </div>
      ))}

      {visible.length < filtered.length ? (
        <button onClick={() => setLimit((current) => current + 20)} className="rounded border border-white/20 px-3 py-1.5 text-sm">
          Daha fazla yükle
        </button>
      ) : null}

      {active ? (
        <dialog open className="max-w-xl rounded-xl border border-white/20 bg-ink p-4 text-white">
          <h4 className="mb-2 text-lg">Run Detayı</h4>
          <p className="mb-2 text-xs text-white/60">ID: {active.id}</p>
          <p className="mb-2 text-xs text-white/60">Agent: {getAgentLabel(active.agent_types)}</p>
          <p className="mb-2 text-xs text-white/60">Oluşturulma: {new Date(active.created_at).toLocaleString('tr-TR')}</p>
          {active.completed_at ? <p className="mb-2 text-xs text-white/60">Tamamlanma: {new Date(active.completed_at).toLocaleString('tr-TR')}</p> : null}
          <p className="text-sm">Prompt:</p>
          <pre className="whitespace-pre-wrap text-sm text-white/80">{active.user_input ?? '-'}</pre>
          {active.error_message ? <p className="mt-2 text-xs text-red-200">Hata: {active.error_message}</p> : null}
          <button onClick={() => setActive(null)} className="mt-3 rounded border border-white/20 px-3 py-1">Kapat</button>
        </dialog>
      ) : null}
    </div>
  );
}

```

### frontend/components/saved-list.tsx

```ts
'use client';

import { useMemo, useState } from 'react';

type SavedItem = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  agent_run_id: string | null;
  agent_runs: Array<{ id: string; agent_type_id: string }> | null;
};

export function SavedList({ items, onDelete }: { items: SavedItem[]; onDelete: (id: string) => Promise<void> }) {
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState<SavedItem | null>(null);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => `${item.title ?? ''} ${item.content}`.toLowerCase().includes(q));
  }, [filter, items]);

  return (
    <div className="space-y-3">
      <input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filtrele..."
        className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
      />

      {filtered.map((item) => (
        <div key={item.id} className="rounded-lg border border-white/10 p-3 text-sm">
          <p className="font-medium">{item.title ?? 'Kaydedilen çıktı'}</p>
          <p className="line-clamp-2 text-white/70">{item.content}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(item.content)}
              className="rounded border border-white/20 px-2 py-1"
            >
              Kopyala
            </button>
            <button onClick={() => setActive(item)} className="rounded border border-white/20 px-2 py-1">
              Detay
            </button>
            {item.agent_runs?.[0]?.agent_type_id && item.agent_run_id ? (
              <a
                href={`/agents/${item.agent_runs[0].agent_type_id}?run_id=${item.agent_run_id}&edit_run_id=${item.agent_run_id}&source=saved`}
                className="rounded border border-white/20 px-2 py-1"
              >
                Düzenle / Yeniden çalıştır
              </a>
            ) : null}
            {item.agent_runs?.[0]?.agent_type_id && item.agent_run_id ? (
              <a
                href={`/agents/${item.agent_runs[0].agent_type_id}?run_id=${item.agent_run_id}`}
                className="rounded border border-neon/50 px-2 py-1 text-neon"
              >
                Sonuca git
              </a>
            ) : null}
            <button
              onClick={() => {
                void onDelete(item.id);
              }}
              className="rounded border border-red-300/40 px-2 py-1 text-red-200"
            >
              Sil
            </button>
          </div>
        </div>
      ))}

      {active ? (
        <dialog open className="max-w-xl rounded-xl border border-white/20 bg-ink p-4 text-white">
          <h4 className="mb-2 text-lg">{active.title ?? 'Detay'}</h4>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-sm text-white/80">{active.content}</pre>
          <button onClick={() => setActive(null)} className="mt-3 rounded border border-white/20 px-3 py-1">
            Kapat
          </button>
        </dialog>
      ) : null}
    </div>
  );
}

```

### frontend/lib/agent-editor.ts

```ts
export type AgentEditorSlug =
  | 'yazilim'
  | 'sosyal'
  | 'eposta'
  | 'icerik'
  | 'rapor'
  | 'arastirma'
  | 'emlak'
  | 'eticaret';

export type EditorFieldType = 'text' | 'textarea' | 'select';

export type EditorField = {
  key: string;
  label: string;
  type: EditorFieldType;
  placeholder?: string;
  options?: string[];
};

export type EditorSection = {
  title: string;
  fields: EditorField[];
};

export type EditorToggle = {
  key: string;
  label: string;
};

export type PreviewTemplate = {
  title: string;
  template: string;
  emptyFallback?: string;
};

export type AgentEditorConfig = {
  slug: AgentEditorSlug;
  title: string;
  shortHelp: string;
  summaryDescription: string;
  placeholder: string;
  outputMode: string;
  sections: EditorSection[];
  previewSections: PreviewTemplate[];
  starterPacks: EditorStarterPack[];
  toggles?: EditorToggle[];
};

export type EditorState = Record<string, string | boolean>;

export type EditorStarterPack = {
  label: string;
  description: string;
  state: EditorState;
  freeNotes: string;
};

const DEFAULT_AGENT_SLUG: AgentEditorSlug = 'icerik';

export const agentEditorConfigs: Record<AgentEditorSlug, AgentEditorConfig> = {
  yazilim: {
    slug: 'yazilim',
    title: 'Yazılım Görev Editörü',
    shortHelp: 'Kod görevinin tipini, kısıtlarını ve beklenen çıktıyı net tanımlayın.',
    summaryDescription: 'Teknik çözüm planı, kod önerisi ve uygulanabilir adımlar üretir.',
    placeholder: 'Örn: Mevcut API sözleşmesini bozmadan checkout validasyon hatasını çöz.',
    outputMode: 'Teknik çözüm planı + örnek kod + test önerileri',
    sections: [
      {
        title: 'Görev Tanımı',
        fields: [
          { key: 'gorev_tipi', label: 'Görev tipi', type: 'select', options: ['bug fix', 'feature', 'refactor', 'explain'] },
          { key: 'teknoloji_stack', label: 'Teknoloji stack', type: 'text', placeholder: 'Örn: Next.js, TypeScript, Supabase' },
          { key: 'problem_aciklamasi', label: 'Problem açıklaması', type: 'textarea', placeholder: 'Hata nerede oluşuyor, beklenen/gerçek davranış ne?' }
        ]
      },
      {
        title: 'Teslim ve Kısıtlar',
        fields: [
          { key: 'beklenen_cikti', label: 'Beklenen çıktı', type: 'textarea', placeholder: 'Örn: Patch + kısa teknik açıklama + test checklisti' },
          { key: 'kisitlar', label: 'Kısıtlar', type: 'textarea', placeholder: 'Örn: Auth akışı ve deploy ayarlarına dokunma' },
          { key: 'kod_not_alani', label: 'Kod/not alanı', type: 'textarea', placeholder: 'İlgili kod parçaları veya teknik notlar' }
        ]
      }
    ],
    previewSections: [
      { title: 'Görev özeti', template: '{{gorev_tipi}} | {{teknoloji_stack}}' },
      { title: 'Problem özeti', template: '{{problem_aciklamasi}}' },
      { title: 'Beklenen teknik çıktı', template: '{{beklenen_cikti}}' },
      { title: 'Kısıt ve risk notu', template: '{{kisitlar}}' }
    ],
    starterPacks: [
      {
        label: 'Bug Fix',
        description: 'Canlı hata analizi ve düzeltme planı için başlangıç şablonu.',
        state: {
          gorev_tipi: 'bug fix',
          teknoloji_stack: 'Next.js + TypeScript + Supabase',
          beklenen_cikti: 'Kök neden analizi, önerilen patch ve test adımları'
        },
        freeNotes: 'Mevcut API sözleşmesini koru ve değişiklikleri küçük adımlara böl.'
      },
      {
        label: 'Refactor',
        description: 'Kod okunabilirliği ve sürdürülebilirlik odaklı görev başlangıcı.',
        state: {
          gorev_tipi: 'refactor',
          teknoloji_stack: 'TypeScript',
          beklenen_cikti: 'Refactor planı, risk listesi ve geri dönüş stratejisi'
        },
        freeNotes: 'Davranışı değiştirmeden sadeleştirme öner.'
      }
    ],
    toggles: [
      { key: 'test_oner', label: 'Test önerileri üret' },
      { key: 'performans_odakli', label: 'Performans odaklı yaklaşım' }
    ]
  },
  sosyal: {
    slug: 'sosyal',
    title: 'Sosyal Medya Editörü',
    shortHelp: 'Platform, kitle, ton ve CTA bilgisiyle net bir içerik brifi oluşturun.',
    summaryDescription: 'Platforma uygun içerik akışı, başlık taslağı ve CTA önerileri hazırlar.',
    placeholder: 'Örn: Lansman haftası için 3 reels + 2 story akışı',
    outputMode: 'İçerik özeti + başlık taslağı + format bazlı akış + CTA',
    sections: [
      {
        title: 'İçerik Çerçevesi',
        fields: [
          { key: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'X'] },
          { key: 'hedef_kitle', label: 'Hedef kitle', type: 'text', placeholder: 'Örn: 24-35 yaş e-ticaret kurucuları' },
          { key: 'icerik_amaci', label: 'İçerik amacı', type: 'text', placeholder: 'Örn: Etkileşim artırma / topluluğu büyütme' },
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Samimi, motive edici, öğretici' }
        ]
      },
      {
        title: 'Mesaj',
        fields: [
          { key: 'konu', label: 'Konu', type: 'textarea', placeholder: 'Ana konu ve mesajı kısa bir paragrafla girin' },
          { key: 'cta', label: 'CTA', type: 'text', placeholder: 'Örn: Yoruma fikir bırak, kaydet, DM gönder' },
          { key: 'format', label: 'Format', type: 'select', options: ['post', 'reel', 'story', 'short', 'video thread'] }
        ]
      }
    ],
    previewSections: [
      { title: 'İçerik özeti', template: '{{platform}} | {{format}} | {{icerik_amaci}}' },
      { title: 'Başlık taslağı', template: '{{hedef_kitle}} için: {{konu}}' },
      { title: 'Ton ve mesaj', template: '{{ton}} tonunda kısa anlatım' },
      { title: 'CTA özeti', template: '{{cta}}' }
    ],
    starterPacks: [
      {
        label: 'Haftalık Plan',
        description: 'Haftalık sosyal medya içerik planı için hızlı başlangıç.',
        state: {
          platform: 'Instagram',
          format: 'reel',
          icerik_amaci: 'Etkileşim artırma',
          ton: 'Samimi ve enerjik'
        },
        freeNotes: 'Her içerik için bir hook ve alternatif CTA öner.'
      },
      {
        label: 'Lansman',
        description: 'Yeni ürün/hizmet duyurusu odaklı akış başlangıcı.',
        state: {
          platform: 'LinkedIn',
          format: 'post',
          icerik_amaci: 'Lansman duyurusu',
          ton: 'Güven veren ve profesyonel'
        },
        freeNotes: 'İlk cümle güçlü bir problemle başlasın.'
      }
    ]
  },
  eposta: {
    slug: 'eposta',
    title: 'E-posta Editörü',
    shortHelp: 'E-posta türünü, ana mesajı ve CTA’yı netleştirerek dönüşüm odaklı taslak alın.',
    summaryDescription: 'Konu satırı, gövde akışı ve kapanış CTA’sı olan e-posta çerçevesi üretir.',
    placeholder: 'Örn: Demo sonrası 2. takip e-postası, toplantı teyidi hedefli',
    outputMode: 'Konu satırı taslağı + giriş + gövde özeti + kapanış CTA',
    sections: [
      {
        title: 'E-posta Bilgileri',
        fields: [
          { key: 'eposta_turu', label: 'E-posta türü', type: 'select', options: ['Satış', 'Takip', 'Teklif', 'Onboarding', 'Bilgilendirme'] },
          { key: 'alici_tipi', label: 'Alıcı tipi', type: 'text', placeholder: 'Örn: Karar verici, mevcut müşteri, yeni lead' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Toplantı teyidi almak' },
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Net, profesyonel, sıcak' }
        ]
      },
      {
        title: 'Mesaj Çekirdeği',
        fields: [
          { key: 'ana_mesaj', label: 'Ana mesaj', type: 'textarea', placeholder: 'Alıcının neden ilgilenmesi gerektiğini net yazın' },
          { key: 'cta', label: 'CTA', type: 'text', placeholder: 'Örn: Salı 14:00 için kısa bir görüşme planlayalım' }
        ]
      }
    ],
    previewSections: [
      { title: 'Konu satırı taslağı', template: '{{eposta_turu}} | {{amac}}' },
      { title: 'Açılış cümlesi', template: '{{alici_tipi}} için {{ton}} bir başlangıç' },
      { title: 'Gövde özeti', template: '{{ana_mesaj}}' },
      { title: 'Kapanış CTA', template: '{{cta}}' }
    ],
    starterPacks: [
      {
        label: 'Takip Maili',
        description: 'Demo veya teklif sonrası dönüş alma odaklı.',
        state: {
          eposta_turu: 'Takip',
          amac: 'Toplantı teyidi almak',
          ton: 'Profesyonel ve sıcak'
        },
        freeNotes: 'Kısa ve net tut; gereksiz resmi ifadelerden kaçın.'
      },
      {
        label: 'Onboarding',
        description: 'Yeni kullanıcı aktivasyonunu hızlandıran başlangıç maili.',
        state: {
          eposta_turu: 'Onboarding',
          amac: 'İlk kullanım adımını tamamlatmak',
          ton: 'Yol gösterici ve güven veren'
        },
        freeNotes: 'Tek bir ana CTA olsun.'
      }
    ]
  },
  icerik: {
    slug: 'icerik',
    title: 'İçerik Üretim Editörü',
    shortHelp: 'İçerik türü, hedef kelime ve yazım tonunu belirleyerek güçlü bir brief oluşturun.',
    summaryDescription: 'Başlık taslağı, bölüm planı ve amaç odaklı içerik iskeleti üretir.',
    placeholder: 'Örn: B2B SaaS kullanıcı aktivasyonu için SEO blog briefi',
    outputMode: 'Başlık taslağı + bölüm yapısı + ana mesaj blokları',
    sections: [
      {
        title: 'İçerik Çekirdeği',
        fields: [
          { key: 'icerik_turu', label: 'İçerik türü', type: 'select', options: ['Blog', 'Landing', 'Rehber', 'Makale', 'Video metni'] },
          { key: 'ana_konu', label: 'Ana konu', type: 'text', placeholder: 'Örn: Aktivasyon oranını artıran onboarding adımları' },
          { key: 'hedef_kelimeler', label: 'Hedef kelimeler', type: 'textarea', placeholder: 'Virgülle ayırın: onboarding, aktivasyon, churn' }
        ]
      },
      {
        title: 'Yazım Hedefi',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Uzman ama anlaşılır' },
          { key: 'uzunluk', label: 'Uzunluk', type: 'select', options: ['Kısa', 'Orta', 'Uzun'] },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Organik trafik ve demo talebi üretmek' }
        ]
      }
    ],
    previewSections: [
      { title: 'Başlık taslağı', template: '{{ana_konu}} | {{icerik_turu}}' },
      { title: 'Bölüm yapısı', template: '1) Problem\n2) Yaklaşım\n3) Uygulama adımları\n4) Sonuç' },
      { title: 'Mesaj özeti', template: '{{amac}} | Ton: {{ton}}' },
      { title: 'Kelime odağı', template: '{{hedef_kelimeler}}' }
    ],
    starterPacks: [
      {
        label: 'SEO Blog',
        description: 'SEO odaklı blog briefi başlangıcı.',
        state: {
          icerik_turu: 'Blog',
          uzunluk: 'Orta',
          ton: 'Uzman ama sade',
          amac: 'Organik trafik artırma'
        },
        freeNotes: 'Örnekler gerçek senaryolardan gelsin.'
      },
      {
        label: 'Landing Metni',
        description: 'Dönüşüm odaklı landing içerik taslağı.',
        state: {
          icerik_turu: 'Landing',
          uzunluk: 'Kısa',
          ton: 'Net ve ikna edici',
          amac: 'Kayıt/dönüşüm artırma'
        },
        freeNotes: 'Hero, fayda blokları ve CTA ayrı başlıkta verilsin.'
      }
    ]
  },
  rapor: {
    slug: 'rapor',
    title: 'Rapor Editörü',
    shortHelp: 'Rapor türü, veri özeti ve hedef okuyucuya göre anlaşılır bir rapor planı hazırlayın.',
    summaryDescription: 'Yönetici özeti, bölüm akışı ve odak metrikleri ile raporu yapılandırır.',
    placeholder: 'Örn: Mart ayı performans özeti, yönetim sunumu formatında',
    outputMode: 'Yönetici özeti + bölüm yapısı + aksiyon odakları',
    sections: [
      {
        title: 'Rapor Girdileri',
        fields: [
          { key: 'rapor_turu', label: 'Rapor türü', type: 'select', options: ['Haftalık', 'Aylık', 'Çeyreklik', 'Kampanya', 'Stratejik'] },
          { key: 'veri_ozeti', label: 'Veri özeti', type: 'textarea', placeholder: 'Temel sayılar, trendler ve dikkat çeken değişimler' },
          { key: 'hedef_okuyucu', label: 'Hedef okuyucu', type: 'text', placeholder: 'Örn: C-level, ekip liderleri, müşteri ekibi' }
        ]
      },
      {
        title: 'Rapor Sunumu',
        fields: [
          { key: 'odak', label: 'Odak', type: 'text', placeholder: 'Örn: Büyüme, verimlilik, risk azaltma' },
          { key: 'format', label: 'Format', type: 'select', options: ['Madde madde', 'Anlatımsal', 'Tablo + özet'] }
        ]
      }
    ],
    previewSections: [
      { title: 'Yönetici özeti', template: '{{rapor_turu}} raporu | Odak: {{odak}}' },
      { title: 'Okuyucu uyumu', template: '{{hedef_okuyucu}} için {{format}} formatı' },
      { title: 'Bölüm yapısı', template: 'Özet\nVeri Analizi\nRiskler\nAksiyon Planı' },
      { title: 'Veri notları', template: '{{veri_ozeti}}' }
    ],
    starterPacks: [
      {
        label: 'Aylık Özet',
        description: 'Aylık performans ve aksiyon planı için rapor başlangıcı.',
        state: {
          rapor_turu: 'Aylık',
          format: 'Madde madde',
          odak: 'Büyüme ve verimlilik'
        },
        freeNotes: 'Her bölüm sonunda 1 aksiyon maddesi ekle.'
      },
      {
        label: 'Kampanya',
        description: 'Kampanya sonuçlarını özetleyen kısa rapor başlangıcı.',
        state: {
          rapor_turu: 'Kampanya',
          format: 'Tablo + özet',
          odak: 'ROI ve öğrenimler'
        },
        freeNotes: 'Metriklerin yanında kısa yorumlar da ver.'
      }
    ]
  },
  arastirma: {
    slug: 'arastirma',
    title: 'Araştırma Editörü',
    shortHelp: 'Konu, pazar ve rakip kapsamını belirleyerek derinlik seviyesine uygun araştırma brifi oluşturun.',
    summaryDescription: 'Araştırma kapsamı, karşılaştırma eksenleri ve bölüm planı üretir.',
    placeholder: 'Örn: Türkiye ödeme altyapılarında KOBİ odaklı rekabet analizi',
    outputMode: 'Araştırma özeti + karşılaştırma başlıkları + önerilen yapı',
    sections: [
      {
        title: 'Araştırma Parametreleri',
        fields: [
          { key: 'arastirma_konusu', label: 'Araştırma konusu', type: 'text', placeholder: 'Örn: AI destekli destek yazılımlarında fiyatlandırma eğilimleri' },
          { key: 'rakipler_markalar', label: 'Rakipler / markalar', type: 'textarea', placeholder: 'Karşılaştırılacak oyuncuları listeleyin' },
          { key: 'pazar_bolge', label: 'Pazar / bölge', type: 'text', placeholder: 'Örn: Türkiye, EMEA, Global' }
        ]
      },
      {
        title: 'Araştırma Hedefi',
        fields: [
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Konumlandırma stratejisi çıkarmak' },
          { key: 'derinlik', label: 'Derinlik', type: 'select', options: ['Yüzeysel', 'Orta', 'Derin'] }
        ]
      }
    ],
    previewSections: [
      { title: 'Araştırma özeti', template: '{{arastirma_konusu}} | {{pazar_bolge}}' },
      { title: 'Rakip kapsamı', template: '{{rakipler_markalar}}' },
      { title: 'Bölüm yapısı', template: 'Pazar görünümü\nRakip karşılaştırması\nFırsat alanları\nÖneriler' },
      { title: 'Derinlik ve amaç', template: '{{derinlik}} analiz | {{amac}}' }
    ],
    starterPacks: [
      {
        label: 'Rakip Analizi',
        description: 'Rakip odaklı araştırma için hızlı başlangıç.',
        state: {
          derinlik: 'Orta',
          pazar_bolge: 'Türkiye',
          amac: 'Pazar konumlandırma fırsatlarını görmek'
        },
        freeNotes: 'Tablo formatında kıyas maddeleri üret.'
      },
      {
        label: 'Pazar Taraması',
        description: 'Pazar dinamiklerini hızlıca toplamak için başlangıç.',
        state: {
          derinlik: 'Yüzeysel',
          pazar_bolge: 'EMEA',
          amac: 'Yeni pazara giriş fizibilitesi'
        },
        freeNotes: 'Bölümleri kısa ama aksiyon odaklı tut.'
      }
    ]
  },
  emlak: {
    slug: 'emlak',
    title: 'Emlak Editörü',
    shortHelp: 'İlan tipi, konum ve hedef müşteri bilgileriyle satış/kiralama odaklı metin planı oluşturun.',
    summaryDescription: 'İlan başlığı, açıklama omurgası ve CTA önerisi üretir.',
    placeholder: 'Örn: Kadıköy merkezde 2+1 kiralık daire, genç profesyoneller hedefli',
    outputMode: 'İlan başlığı + özellik özeti + hedef müşteri odaklı CTA',
    sections: [
      {
        title: 'İlan Bilgileri',
        fields: [
          { key: 'ilan_tipi', label: 'İlan tipi', type: 'select', options: ['Satılık', 'Kiralık', 'Ticari', 'Arsa'] },
          { key: 'konum', label: 'Konum', type: 'text', placeholder: 'Örn: İstanbul / Kadıköy' },
          { key: 'hedef_musteri', label: 'Hedef müşteri', type: 'text', placeholder: 'Örn: Yeni evli çiftler, yatırımcılar' },
          { key: 'one_cikan_ozellikler', label: 'Öne çıkan özellikler', type: 'textarea', placeholder: 'Örn: Metroya 5 dk, açık mutfak, otopark, balkon' }
        ]
      },
      {
        title: 'İletişim Dili',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Güven veren ve net' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Hızlı geri dönüş ve randevu almak' }
        ]
      }
    ],
    previewSections: [
      { title: 'İlan başlığı taslağı', template: '{{ilan_tipi}} | {{konum}}' },
      { title: 'Özellik özeti', template: '{{one_cikan_ozellikler}}' },
      { title: 'Hedef müşteri odağı', template: '{{hedef_musteri}} için {{ton}} anlatım' },
      { title: 'CTA özeti', template: '{{amac}}' }
    ],
    starterPacks: [
      {
        label: 'Kiralık Daire',
        description: 'Kiralık konut ilanı için başlangıç şablonu.',
        state: {
          ilan_tipi: 'Kiralık',
          ton: 'Samimi ve güven veren',
          amac: 'Hızlı randevu talebi almak'
        },
        freeNotes: 'İlk paragrafta lokasyon avantajını vurgula.'
      },
      {
        label: 'Satılık Konut',
        description: 'Satılık konut için ikna odaklı metin başlangıcı.',
        state: {
          ilan_tipi: 'Satılık',
          ton: 'Profesyonel ve net',
          amac: 'Nitelikli alıcı başvurusu toplamak'
        },
        freeNotes: 'Yatırım potansiyeline dair bir cümle öner.'
      }
    ]
  },
  eticaret: {
    slug: 'eticaret',
    title: 'E-ticaret Editörü',
    shortHelp: 'Ürün detaylarını ve hedef müşteri bilgisini girerek dönüşüm odaklı ürün metni brifi oluşturun.',
    summaryDescription: 'Ürün başlığı, fayda yapısı ve platforma uygun CTA üretir.',
    placeholder: 'Örn: Kablosuz blender için ürün sayfası metni, mobil kullanıcı odaklı',
    outputMode: 'Ürün özeti + fayda maddeleri + CTA taslağı',
    sections: [
      {
        title: 'Ürün Bilgileri',
        fields: [
          { key: 'urun_adi', label: 'Ürün adı', type: 'text', placeholder: 'Örn: SmartBlend Pro' },
          { key: 'kategori', label: 'Kategori', type: 'text', placeholder: 'Örn: Küçük ev aletleri' },
          { key: 'hedef_musteri', label: 'Hedef müşteri', type: 'text', placeholder: 'Örn: Yoğun çalışan ebeveynler' },
          { key: 'platform', label: 'Platform', type: 'select', options: ['Shopify', 'Trendyol', 'Amazon', 'Hepsiburada', 'Kendi sitesi'] }
        ]
      },
      {
        title: 'Pazarlama Hedefi',
        fields: [
          { key: 'ton', label: 'Ton', type: 'text', placeholder: 'Örn: Güvenilir ve çözüm odaklı' },
          { key: 'amac', label: 'Amaç', type: 'text', placeholder: 'Örn: Dönüşüm oranını artırmak' }
        ]
      }
    ],
    previewSections: [
      { title: 'Ürün özeti', template: '{{urun_adi}} | {{kategori}} | {{platform}}' },
      { title: 'Müşteri odağı', template: '{{hedef_musteri}} için {{ton}} mesaj' },
      { title: 'Fayda yapısı', template: 'Problem\nÇözüm\nÖne çıkan 3 fayda\nKarar CTA' },
      { title: 'CTA özeti', template: '{{amac}}' }
    ],
    starterPacks: [
      {
        label: 'Ürün Sayfası',
        description: 'E-ticaret ürün detay sayfası için hızlı başlangıç.',
        state: {
          platform: 'Shopify',
          ton: 'Güvenilir ve net',
          amac: 'Sepete ekleme oranını artırmak'
        },
        freeNotes: 'Mobil kullanıcılar için kısa paragraf ve madde yapısı öner.'
      },
      {
        label: 'Pazar Yeri',
        description: 'Pazaryeri listeleme metni için başlangıç.',
        state: {
          platform: 'Trendyol',
          ton: 'Bilgilendirici ve ikna edici',
          amac: 'Ürün detay sayfası dönüşümünü artırmak'
        },
        freeNotes: 'Başlıkta ana faydayı ilk 60 karakterde ver.'
      }
    ]
  }
};

function normalizeValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function interpolateTemplate(template: string, state: EditorState, fallback: string): string {
  const formatted = template.replace(/\{\{(.*?)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    const value = state[key];
    if (typeof value === 'string' && value.trim()) return normalizeValue(value);
    return fallback;
  });

  return formatted;
}

export function getAgentEditorConfig(slug?: string | null): AgentEditorConfig {
  if (!slug) return agentEditorConfigs[DEFAULT_AGENT_SLUG];
  return agentEditorConfigs[(slug as AgentEditorSlug)] ?? agentEditorConfigs[DEFAULT_AGENT_SLUG];
}

export function getAgentStarterPacks(slug?: string | null): EditorStarterPack[] {
  return getAgentEditorConfig(slug).starterPacks;
}

export function buildDerivedPrompt(config: AgentEditorConfig, state: EditorState, freeNotes: string): string {
  const lines = [`Agent: ${config.title}`, `Hedef çıktı modu: ${config.outputMode}`, ''];

  for (const section of config.sections) {
    lines.push(`${section.title}:`);
    for (const field of section.fields) {
      const raw = state[field.key];
      if (typeof raw === 'string' && raw.trim()) {
        lines.push(`- ${field.label}: ${raw.trim()}`);
      }
    }
    lines.push('');
  }

  if (config.toggles?.length) {
    const activeToggles = config.toggles.filter((toggle) => Boolean(state[toggle.key])).map((toggle) => toggle.label);
    if (activeToggles.length) {
      lines.push('Opsiyonel tercihler:');
      for (const toggle of activeToggles) {
        lines.push(`- ${toggle}`);
      }
      lines.push('');
    }
  }

  if (freeNotes.trim()) {
    lines.push('Ek notlar:');
    lines.push(freeNotes.trim());
    lines.push('');
  }

  lines.push('Lütfen çıktıyı düzenli başlıklarla, kısa özetle ve uygulanabilir adımlarla ver.');
  return lines.join('\n').trim();
}

export function buildFormSummary(config: AgentEditorConfig, state: EditorState): Array<{ label: string; value: string }> {
  const items: Array<{ label: string; value: string }> = [];

  for (const section of config.sections) {
    for (const field of section.fields) {
      const value = state[field.key];
      if (typeof value === 'string' && value.trim()) {
        items.push({ label: field.label, value: value.trim() });
      }
    }
  }

  return items;
}

export function buildPreviewBlocks(config: AgentEditorConfig, state: EditorState, freeNotes: string): Array<{ title: string; content: string }> {
  const fallback = 'Henüz belirtilmedi';

  const configuredBlocks = config.previewSections.map((section) => ({
    title: section.title,
    content: interpolateTemplate(section.template, state, section.emptyFallback ?? fallback)
  }));

  if (freeNotes.trim()) {
    configuredBlocks.push({
      title: 'Ek not vurgusu',
      content: normalizeValue(freeNotes)
    });
  }

  return configuredBlocks;
}

export type EditorMetadata = {
  editorState: EditorState;
  derivedPrompt: string;
  freeNotes: string;
};

export function parseEditorMetadata(metadata: unknown): EditorMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return { editorState: {}, derivedPrompt: '', freeNotes: '' };
  }

  const source = metadata as Record<string, unknown>;
  const editorState = source.editor_state;

  return {
    editorState: editorState && typeof editorState === 'object' ? (editorState as EditorState) : {},
    derivedPrompt: typeof source.derived_prompt === 'string' ? source.derived_prompt : '',
    freeNotes: typeof source.free_notes === 'string' ? source.free_notes : ''
  };
}

```

### frontend/lib/ai-engine.ts

```ts
import { GoogleGenAI } from '@google/genai';

export type KoscheiModelAlias = 'koschei-fast' | 'koschei-deep' | 'koschei-research';

export type AgentRunProfile = {
  alias: KoscheiModelAlias;
  displayLabel: string;
  enableResearchMode: boolean;
  maxOutputTokens: number;
};

type RunTextOptions = {
  apiKey: string;
  agentSlug: string;
  userInput: string;
  systemPrompt: string | null;
};

export type AiRunResult = {
  text: string;
  alias: KoscheiModelAlias;
  displayLabel: string;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
  };
};

const PROFILE_FAST: AgentRunProfile = {
  alias: 'koschei-fast',
  displayLabel: 'Hızlı mod',
  enableResearchMode: false,
  maxOutputTokens: 2_048
};

const PROFILE_DEEP: AgentRunProfile = {
  alias: 'koschei-deep',
  displayLabel: 'Derin analiz modu',
  enableResearchMode: false,
  maxOutputTokens: 4_096
};

const PROFILE_RESEARCH: AgentRunProfile = {
  alias: 'koschei-research',
  displayLabel: 'Araştırma destekli mod',
  enableResearchMode: true,
  maxOutputTokens: 4_096
};

function resolveModelAlias(agentSlug: string): AgentRunProfile {
  const normalized = agentSlug.trim().toLowerCase();

  if (normalized === 'arastirma') return PROFILE_RESEARCH;
  if (normalized === 'yazilim' || normalized === 'rapor') return PROFILE_DEEP;
  return PROFILE_FAST;
}

function resolveServerModel(alias: KoscheiModelAlias): string {
  if (alias === 'koschei-deep') return 'gemini-2.5-pro';
  if (alias === 'koschei-research') return 'gemini-2.5-pro';
  return 'gemini-2.5-flash';
}

function extractUsage(source: unknown): { inputTokens: number | null; outputTokens: number | null } {
  if (!source || typeof source !== 'object') {
    return { inputTokens: null, outputTokens: null };
  }

  const usage = source as Record<string, unknown>;
  return {
    inputTokens: typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : null,
    outputTokens: typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null
  };
}

function buildConfig(profile: AgentRunProfile, systemPrompt: string | null): Record<string, unknown> {
  const config: Record<string, unknown> = {
    maxOutputTokens: profile.maxOutputTokens
  };

  if (systemPrompt && systemPrompt.trim()) {
    config.systemInstruction = systemPrompt;
  }

  if (profile.alias === 'koschei-deep') {
    config.thinkingConfig = {
      thinkingBudget: 2048
    };
  }

  if (profile.enableResearchMode) {
    config.tools = [{ googleSearch: {} }];
    config.thinkingConfig = {
      thinkingBudget: 1536
    };
  }

  return config;
}

export async function runTextWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  const profile = resolveModelAlias(options.agentSlug);
  const model = resolveServerModel(profile.alias);

  const client = new GoogleGenAI({ apiKey: options.apiKey });
  const response = await client.models.generateContent({
    model,
    config: buildConfig(profile, options.systemPrompt),
    contents: options.userInput
  });

  const text = (response.text ?? '').trim();
  return {
    text,
    alias: profile.alias,
    displayLabel: profile.displayLabel,
    usage: extractUsage(response.usageMetadata)
  };
}

export async function runTextStreamWithAiEngine(options: RunTextOptions): Promise<AiRunResult> {
  const profile = resolveModelAlias(options.agentSlug);
  const model = resolveServerModel(profile.alias);

  const client = new GoogleGenAI({ apiKey: options.apiKey });
  const stream = await client.models.generateContentStream({
    model,
    config: buildConfig(profile, options.systemPrompt),
    contents: options.userInput
  });

  let text = '';
  let usage: { inputTokens: number | null; outputTokens: number | null } = { inputTokens: null, outputTokens: null };

  for await (const chunk of stream) {
    text += chunk.text ?? '';
    usage = extractUsage(chunk.usageMetadata);
  }

  return {
    text: text.trim(),
    alias: profile.alias,
    displayLabel: profile.displayLabel,
    usage
  };
}

```

### frontend/lib/app-context.ts

```ts
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull, type WorkspaceContext } from '@/lib/workspace';

export type AppContext = {
  userId: string;
  workspace: WorkspaceContext;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

export async function getAppContextOrRedirect(): Promise<AppContext> {
  if (!isSupabaseServerConfigured()) {
    redirect('/signin?error=supabase_not_configured');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const workspace = await getWorkspaceContextOrNull();

  if (!workspace) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  return { userId: user.id, workspace, supabase };
}

```

### frontend/lib/connectors/instagram.ts

```ts
import type { ConnectorAdapter } from '@/lib/connectors/types';

export const instagramConnector: ConnectorAdapter = {
  async getStatus() {
    return {
      platform: 'instagram',
      state: 'not_connected',
      label: 'Not connected',
      connectedAt: null
    };
  },
  async validateConfig() {
    return {
      valid: true,
      missingKeys: []
    };
  },
  async createDraft() {
    return {
      draftId: `ig-draft-${Date.now()}`,
      status: 'draft'
    };
  },
  async publish() {
    return {
      publishId: `ig-publish-${Date.now()}`,
      status: 'queued'
    };
  },
  async getAnalytics() {
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
};

```

### frontend/lib/connectors/tiktok.ts

```ts
import type { ConnectorAdapter } from '@/lib/connectors/types';

export const tiktokConnector: ConnectorAdapter = {
  async getStatus() {
    return {
      platform: 'tiktok',
      state: 'coming_soon',
      label: 'Coming soon',
      connectedAt: null
    };
  },
  async validateConfig() {
    return {
      valid: true,
      missingKeys: []
    };
  },
  async createDraft() {
    return {
      draftId: `tt-draft-${Date.now()}`,
      status: 'draft'
    };
  },
  async publish() {
    return {
      publishId: `tt-publish-${Date.now()}`,
      status: 'queued'
    };
  },
  async getAnalytics() {
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
};

```

### frontend/lib/connectors/types.ts

```ts
export type ConnectorPlatform = 'youtube' | 'instagram' | 'tiktok';

export type ConnectorStatus = {
  platform: ConnectorPlatform;
  state: 'not_connected' | 'coming_soon' | 'connected';
  label: string;
  connectedAt: string | null;
};

export type ConnectorValidation = {
  valid: boolean;
  missingKeys: string[];
};

export type ConnectorDraftInput = {
  workspaceId: string;
  projectId: string | null;
  content: string;
  title?: string;
};

export type ConnectorPublishInput = {
  draftId: string;
  scheduledAt: string | null;
};

export type ConnectorAnalytics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

export type ConnectorAdapter = {
  getStatus: () => Promise<ConnectorStatus>;
  validateConfig: () => Promise<ConnectorValidation>;
  createDraft: (input: ConnectorDraftInput) => Promise<{ draftId: string; status: 'draft' }>;
  publish: (input: ConnectorPublishInput) => Promise<{ publishId: string; status: 'queued' | 'published' }>;
  getAnalytics: (publishId: string) => Promise<ConnectorAnalytics>;
};

```

### frontend/lib/connectors/youtube.ts

```ts
import type { ConnectorAdapter } from '@/lib/connectors/types';

export const youtubeConnector: ConnectorAdapter = {
  async getStatus() {
    return {
      platform: 'youtube',
      state: 'coming_soon',
      label: 'Coming soon',
      connectedAt: null
    };
  },
  async validateConfig() {
    return {
      valid: true,
      missingKeys: []
    };
  },
  async createDraft() {
    return {
      draftId: `yt-draft-${Date.now()}`,
      status: 'draft'
    };
  },
  async publish() {
    return {
      publishId: `yt-publish-${Date.now()}`,
      status: 'queued'
    };
  },
  async getAnalytics() {
    return {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0
    };
  }
};

```

### frontend/lib/env.ts

```ts
const PUBLIC_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
const SERVER_ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'] as const;

type PublicEnvKey = (typeof PUBLIC_ENV_KEYS)[number];
type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readServerEnv(name: ServerEnvKey): string | null {
  const value = process.env[name];
  return hasValue(value) ? value : null;
}

export function getPublicEnv(): Record<PublicEnvKey, string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    NEXT_PUBLIC_SUPABASE_URL: hasValue(supabaseUrl) ? supabaseUrl : null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasValue(supabaseAnonKey) ? supabaseAnonKey : null
  };
}

export function getServerEnv(): Record<ServerEnvKey, string | null> {
  return {
    SUPABASE_URL: readServerEnv('SUPABASE_URL'),
    SUPABASE_ANON_KEY: readServerEnv('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: readServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    GEMINI_API_KEY: readServerEnv('GEMINI_API_KEY')
  };
}

export function getEnvDiagnostics() {
  const isServerRuntime = typeof window === 'undefined';
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  const missingPublicEnv = PUBLIC_ENV_KEYS.filter((key) => !publicEnv[key]);
  const missingServerEnv = isServerRuntime ? SERVER_ENV_KEYS.filter((key) => !serverEnv[key]) : [];

  return {
    publicEnv,
    serverEnv,
    missingPublicEnv,
    missingServerEnv,
    publicReady: missingPublicEnv.length === 0,
    serverReady: isServerRuntime ? missingServerEnv.length === 0 : true
  };
}

```

### frontend/lib/knowledge.ts

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function createKnowledgeSource(params: {
  supabase: SupabaseClient;
  workspaceId: string;
  userId: string;
  projectId?: string | null;
  sourceType: 'file' | 'text' | 'url' | 'brief';
  title: string;
  rawText?: string | null;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, workspaceId, userId, projectId = null, sourceType, title, rawText = null, sourceUrl = null, metadata = {} } = params;

  const content = [
    rawText?.trim() || null,
    sourceUrl?.trim() ? `URL: ${sourceUrl.trim()}` : null,
    `source_type: ${sourceType}`,
    Object.keys(metadata).length > 0 ? `metadata: ${JSON.stringify(metadata)}` : null
  ]
    .filter(Boolean)
    .join('\n');

  const { data: entry, error } = await supabase
    .from('project_knowledge_entries')
    .insert({
      workspace_id: workspaceId,
      project_id: projectId,
      source_id: null,
      entry_type: 'source',
      title,
      content,
      metadata,
      created_by: userId
    })
    .select('id')
    .single();

  if (error || !entry) {
    throw new Error(error?.message ?? 'Failed to create knowledge entry');
  }

  return { sourceId: entry.id, chunkCount: 0 };
}

```

### frontend/lib/public-articles.ts

```ts
export type PublicArticle = {
  slug: string;
  title: string;
  description: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

export const publicArticles: PublicArticle[] = [
  {
    slug: 'ai-agent-nedir',
    title: 'AI agent nedir ve ekiplerde neden önemlidir?',
    description:
      'AI agent kavramını sade bir dille anlatır; görev takibi, içerik planlama ve onay süreçlerinde nasıl kullanıldığını açıklar.',
    sections: [
      {
        heading: 'AI agent tanımı',
        paragraphs: [
          'AI agent, belirlenen hedefe ulaşmak için adım adım öneriler üreten ve kullanıcıdan geri bildirim alarak çalışan yazılım bileşenidir.',
          'Koschei içinde agentlar tek başına karar veren bir yapı değil, ekip üyelerinin kararlarını destekleyen yardımcı bir katman olarak konumlanır.'
        ]
      },
      {
        heading: 'Operasyonda ne sağlar?',
        paragraphs: [
          'Tekrarlayan içerik görevlerinde ilk taslakların hazırlanmasını hızlandırır ve ekiplerin boş ekran sorununu azaltır.',
          'Görev ve proje görünürlüğünü artırır; hangi işin taslak, onay veya yayın öncesi aşamada olduğunu daha net görmeyi sağlar.'
        ]
      },
      {
        heading: 'Sınırlar ve doğru beklenti',
        paragraphs: [
          'AI agent kullanımı insan denetimi gerektirir. Özellikle marka dili, hukuki risk ve doğruluk kontrolü gibi konular ekip onayıyla ilerlemelidir.',
          'En verimli kullanım, agent önerilerini süreç standardı ile birleştirmektir; böylece kalite korunurken üretim hızı artar.'
        ]
      }
    ]
  },
  {
    slug: 'sosyal-medyada-ai-kullanimi',
    title: 'Sosyal medya yönetiminde AI nasıl kullanılır?',
    description:
      'Sosyal medya ekiplerinin AI desteğini içerik üretimi, tekrar düzenleme ve yayın planı görünürlüğü için nasıl kullandığını ele alır.',
    sections: [
      {
        heading: 'İçerik hazırlık aşaması',
        paragraphs: [
          'Konu başlıklarını, hedef kitleye uygun tonları ve farklı platformlar için içerik varyantlarını başlangıç taslağı olarak çıkarabilirsiniz.',
          'Bu yaklaşım özellikle küçük ekiplerde zaman kazandırır; ekip üyeleri yaratıcı kararlarını taslaklar üzerinden daha hızlı verir.'
        ]
      },
      {
        heading: 'Yayın öncesi kontrol',
        paragraphs: [
          'AI önerileri yayınlama kararı yerine geçmez. Mesajın doğruluğu, marka uyumu ve yasal uygunluk manuel olarak kontrol edilmelidir.',
          'Gözden geçirme adımlarını kayıt altına almak, ekip içinde standart ve hesap verebilir bir iş akışı sağlar.'
        ]
      },
      {
        heading: 'Sürdürülebilir kullanım',
        paragraphs: [
          'Başarılı ekipler AI araçlarını “tam otomasyon” gibi değil, “iş akışını hızlandıran yardımcı sistem” olarak konumlandırır.',
          'Bu sayede kaliteyi düşürmeden daha düzenli içerik takvimi oluşturmak mümkün olur.'
        ]
      }
    ]
  },
  {
    slug: 'youtube-is-akisi-planlama',
    title: 'YouTube kanal iş akışları nasıl planlanır?',
    description:
      'YouTube içerik planında fikirden yayına uzanan adımları ve AI destekli görev yönetimi yaklaşımını anlatır.',
    sections: [
      {
        heading: 'Fikirden taslağa',
        paragraphs: [
          'Her video için amaç, hedef izleyici ve beklenen çıktı netleştirilmelidir. Bu çerçeve AI önerilerinin daha tutarlı olmasını sağlar.',
          'Senaryo iskeleti, bölüm akışı ve başlık alternatifleri ilk adımda hazırlanarak ekip içi değerlendirmeye sunulabilir.'
        ]
      },
      {
        heading: 'Üretim ve onay',
        paragraphs: [
          'Çekim, kurgu ve yayın metni gibi işler proje kartları halinde takip edildiğinde sorumluluk dağılımı daha şeffaf olur.',
          'AI ile oluşturulan metinler mutlaka editoryal kontrolden geçmelidir; özellikle iddia içeren cümlelerde kaynak doğrulaması yapılmalıdır.'
        ]
      },
      {
        heading: 'Rutin kurma',
        paragraphs: [
          'Haftalık veya iki haftalık üretim döngüsü oluşturmak, içerik baskısını azaltır ve son dakika kararlarını düşürür.',
          'Planlı döngü içinde AI desteği, ekiplerin tekrar eden işleri daha hızlı bitirmesine yardımcı olur.'
        ]
      }
    ]
  },
  {
    slug: 'kucuk-ekipler-icin-operasyon-otomasyonu',
    title: 'Küçük ekipler için operasyon otomasyonu yaklaşımı',
    description:
      'Sınırlı insan kaynağıyla çalışan ekiplerin süreçlerini sadeleştirerek nasıl daha düzenli hale getirebileceğini açıklar.',
    sections: [
      {
        heading: 'Neden sade süreç gerekir?',
        paragraphs: [
          'Küçük ekiplerde herkes birden fazla rol üstlenir. Net süreç tanımı yoksa işler kişilere bağımlı hale gelir ve aksama riski artar.',
          'Bu nedenle görev adımlarını standartlaştırmak ve görünür kılmak sürdürülebilirliğin temelidir.'
        ]
      },
      {
        heading: 'AI destekli pratik adımlar',
        paragraphs: [
          'Tekrar eden brief şablonları, içerik kontrol listeleri ve yayın öncesi kalite kontrolleri AI yardımıyla hızlandırılabilir.',
          'Ancak tüm adımların sonunda karar yetkisi ekipte kalmalıdır; otomasyon yalnızca yardımcı bir çerçeve sunar.'
        ]
      },
      {
        heading: 'Ölçülebilir iyileştirme',
        paragraphs: [
          'Süreç kalitesini artırmak için içerik teslim süresi, revizyon sayısı ve onay gecikmesi gibi ölçütler izlenebilir.',
          'Bu metrikler abartılı vaatler yerine somut iyileştirme alanlarını görmenize yardım eder.'
        ]
      }
    ]
  },
  {
    slug: 'icerik-uretiminde-ai-destekli-calisma',
    title: 'İçerik üretim sürecinde AI destekli çalışma',
    description:
      'İçerik ekiplerinin fikir geliştirme, taslak oluşturma ve düzenleme adımlarında AI ile nasıl iş birliği yapabileceğini anlatır.',
    sections: [
      {
        heading: 'İş birliği modeli',
        paragraphs: [
          'Ekip önce hedef mesajı ve tonu tanımlar, AI ise buna uygun alternatif metinler ve yapı önerileri üretir.',
          'Böylece yaratıcı kararlar ekipte kalırken hazırlık süresi kısalır.'
        ]
      },
      {
        heading: 'Kalite standardı',
        paragraphs: [
          'Her taslak için doğruluk, okunabilirlik ve marka uyumu kontrol listesi kullanmak kaliteyi dengede tutar.',
          'AI çıktısını doğrudan yayınlamak yerine düzenleme ve onay adımı eklemek uzun vadede daha güvenli sonuç verir.'
        ]
      },
      {
        heading: 'Ekip içi öğrenme',
        paragraphs: [
          'Hangi komutların daha iyi sonuç verdiğini belgelemek, zamanla ekip içinde ortak bir çalışma dili oluşturur.',
          'Bu yaklaşım hem yeni ekip üyelerinin adaptasyonunu hızlandırır hem de üretim sürecini daha tutarlı hale getirir.'
        ]
      }
    ]
  },
  {
    slug: 'proje-ve-gorev-akislarinda-agent-kullanimi',
    title: 'Proje ve görev akışlarında agent kullanımı',
    description:
      'Agent yaklaşımının proje görünürlüğü, görev devri ve içerik operasyonu içinde nasıl konumlandırılabileceğini örneklerle açıklar.',
    sections: [
      {
        heading: 'Proje görünürlüğü',
        paragraphs: [
          'Agent destekli özetler, ekip liderlerinin haftalık durumu hızlıca anlamasına yardımcı olur.',
          'Bu özetler tek başına karar vermek için değil, ekip toplantısında odak noktası belirlemek için kullanılmalıdır.'
        ]
      },
      {
        heading: 'Görev devri ve takip',
        paragraphs: [
          'Tekrarlayan görevlerde standart açıklamalar ve kabul kriterleri üretmek, görev devrinde bilgi kaybını azaltır.',
          'Sorumluluk ataması yine ekip tarafından yapılmalı; agent yalnızca hazırlık sürecini hızlandırmalıdır.'
        ]
      },
      {
        heading: 'Uygulama önerisi',
        paragraphs: [
          'Önce tek bir süreçte pilot uygulama yapıp sonuçları ölçmek, tüm operasyonu bir anda değiştirmekten daha güvenlidir.',
          'Pilot sonuçlarına göre çalışma biçimi güncellenirse hem benimseme artar hem de operasyonel risk düşer.'
        ]
      }
    ]
  }
];

export function getPublicArticleBySlug(slug: string) {
  return publicArticles.find((article) => article.slug === slug);
}

```

### frontend/lib/publish-queue.ts

```ts
export type QueueStatus = 'draft' | 'queued' | 'processing' | 'published' | 'failed' | string | null;

export function toQueueStatusLabel(status: QueueStatus): string {
  if (!status) return 'Durum bilinmiyor';
  if (status === 'draft') return 'Taslak';
  if (status === 'queued') return 'Sıraya alındı';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'published') return 'Yayın hazırlığında';
  if (status === 'failed') return 'Başarısız';
  return status;
}

export function toQueueStateHint(status: QueueStatus): string {
  if (status === 'draft') return 'Gönderime hazır';
  if (status === 'queued') return 'Yayın hazırlığında';
  if (status === 'processing') return 'İşlem sürüyor';
  if (status === 'published') return 'Yayın hazırlığında';
  if (status === 'failed') return 'Tekrar denenebilir';
  return 'Durum bilgisi sınırlı';
}

export function toPlatformLabel(platform: string | null): string {
  if (!platform) return 'Platform belirtilmedi';
  const normalized = platform.toLowerCase();
  if (normalized === 'youtube') return 'YouTube';
  if (normalized === 'instagram') return 'Instagram';
  if (normalized === 'tiktok') return 'TikTok';
  return platform;
}

function takeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function truncate(input: string, maxLength = 140): string {
  return input.length > maxLength ? `${input.slice(0, maxLength - 1)}…` : input;
}

export function deriveQueuePreview(input: {
  payload: unknown;
  targetPlatform: string | null;
  contentItem?: {
    brief: string | null;
    youtube_title: string | null;
    youtube_description: string | null;
    instagram_caption: string | null;
    tiktok_caption: string | null;
  } | null;
  savedOutput?: { title: string | null; content: string | null } | null;
}): { summary: string; detail?: string; payloadPartial: boolean } {
  const platform = input.targetPlatform?.toLowerCase() ?? null;
  const payload = input.payload && typeof input.payload === 'object' ? (input.payload as Record<string, unknown>) : null;

  const payloadBrief = takeString(payload?.brief);
  const payloadTitle = takeString(payload?.youtube_title) || takeString(payload?.title);
  const payloadDescription = takeString(payload?.youtube_description) || takeString(payload?.description);
  const payloadCaption = takeString(payload?.instagram_caption) || takeString(payload?.tiktok_caption) || takeString(payload?.caption);

  const fallbackBrief = takeString(input.contentItem?.brief);
  const fallbackTitle = takeString(input.contentItem?.youtube_title) || takeString(input.savedOutput?.title);
  const fallbackDescription = takeString(input.contentItem?.youtube_description);
  const fallbackCaption =
    (platform === 'instagram' ? takeString(input.contentItem?.instagram_caption) : null) ||
    (platform === 'tiktok' ? takeString(input.contentItem?.tiktok_caption) : null) ||
    takeString(input.savedOutput?.content);

  const summaryCandidate = payloadBrief || fallbackBrief || payloadTitle || fallbackTitle || payloadCaption || fallbackCaption;
  const detailCandidate =
    (platform === 'youtube' ? payloadTitle || fallbackTitle || payloadDescription || fallbackDescription : null) ||
    payloadCaption ||
    fallbackCaption ||
    payloadDescription ||
    fallbackDescription;

  return {
    summary: summaryCandidate ? truncate(summaryCandidate) : 'İçerik özeti bulunamadı',
    detail: detailCandidate ? truncate(detailCandidate, 180) : undefined,
    payloadPartial: !payload || (!payloadBrief && !payloadTitle && !payloadDescription && !payloadCaption)
  };
}

export function sanitizeUserFacingEngineLabel(_: unknown): string {
  return 'Varsayılan AI motoru';
}

export function neutralizeVendorTerms(text: string): string {
  return text.replace(/gemini/gi, 'AI motoru').replace(/google\s*genai/gi, 'AI motoru').replace(/google search/gi, 'araştırma modu');
}

```

### frontend/lib/social-content.ts

```ts
export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok';

export type SocialContentDraft = {
  brief: string;
  platforms: SocialPlatform[];
  youtubeTitle: string | null;
  youtubeDescription: string | null;
  instagramCaption: string | null;
  tiktokCaption: string | null;
};

const PLATFORM_SET = new Set<SocialPlatform>(['youtube', 'instagram', 'tiktok']);

function cleanLine(value: string): string {
  return value.replace(/^[\-*#\d.)\s]+/, '').trim();
}

function takeNonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePlatform(value: unknown): SocialPlatform | null {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();
  return PLATFORM_SET.has(lowered as SocialPlatform) ? (lowered as SocialPlatform) : null;
}

function parseJsonOutput(rawText: string): Partial<SocialContentDraft> | null {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith('{')) return null;

  try {
    const payload = JSON.parse(trimmed) as Record<string, unknown>;
    const platforms = Array.isArray(payload.platforms)
      ? payload.platforms
          .map((entry) => normalizePlatform(entry))
          .filter((entry): entry is SocialPlatform => Boolean(entry))
      : [];

    return {
      brief: takeNonEmpty(payload.brief) ?? '',
      platforms,
      youtubeTitle: takeNonEmpty(payload.youtube_title) ?? takeNonEmpty(payload.youtubeTitle),
      youtubeDescription: takeNonEmpty(payload.youtube_description) ?? takeNonEmpty(payload.youtubeDescription),
      instagramCaption: takeNonEmpty(payload.instagram_caption) ?? takeNonEmpty(payload.instagramCaption),
      tiktokCaption: takeNonEmpty(payload.tiktok_caption) ?? takeNonEmpty(payload.tiktokCaption)
    };
  } catch {
    return null;
  }
}

function parseLabeledOutput(rawText: string): Partial<SocialContentDraft> {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const result: Partial<SocialContentDraft> = {};

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!result.youtubeTitle && (lower.includes('youtube title:') || lower.includes('youtube başlık:'))) {
      result.youtubeTitle = cleanLine(line.split(':').slice(1).join(':'));
      continue;
    }

    if (!result.youtubeDescription && (lower.includes('youtube description:') || lower.includes('youtube açıklama:'))) {
      result.youtubeDescription = cleanLine(line.split(':').slice(1).join(':'));
      continue;
    }

    if (!result.instagramCaption && (lower.includes('instagram caption:') || lower.includes('instagram:'))) {
      result.instagramCaption = cleanLine(line.split(':').slice(1).join(':'));
      continue;
    }

    if (!result.tiktokCaption && (lower.includes('tiktok caption:') || lower.includes('tiktok:'))) {
      result.tiktokCaption = cleanLine(line.split(':').slice(1).join(':'));
    }
  }

  return result;
}

function fallbackBrief(sourceBrief: string, rawText: string): string {
  const normalizedBrief = sourceBrief.trim();
  if (normalizedBrief) return normalizedBrief;

  const firstNonEmpty = rawText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstNonEmpty ? firstNonEmpty.slice(0, 280) : 'Sosyal içerik taslağı';
}

function derivePlatforms(
  preferredPlatforms: SocialPlatform[],
  payload: Pick<SocialContentDraft, 'youtubeTitle' | 'youtubeDescription' | 'instagramCaption' | 'tiktokCaption'>
): SocialPlatform[] {
  const derived = new Set<SocialPlatform>(preferredPlatforms);

  if (payload.youtubeTitle || payload.youtubeDescription) derived.add('youtube');
  if (payload.instagramCaption) derived.add('instagram');
  if (payload.tiktokCaption) derived.add('tiktok');

  return derived.size > 0 ? Array.from(derived) : ['youtube', 'instagram', 'tiktok'];
}

export function normalizeSocialContentDraft(input: {
  sourceBrief: string;
  sourcePlatforms?: SocialPlatform[];
  rawText: string;
}): SocialContentDraft {
  const fromJson = parseJsonOutput(input.rawText);
  const fromLabels = parseLabeledOutput(input.rawText);

  const youtubeTitle = takeNonEmpty(fromJson?.youtubeTitle) ?? takeNonEmpty(fromLabels.youtubeTitle) ?? takeNonEmpty(input.rawText.slice(0, 90));
  const youtubeDescription = takeNonEmpty(fromJson?.youtubeDescription) ?? takeNonEmpty(fromLabels.youtubeDescription) ?? takeNonEmpty(input.rawText);
  const instagramCaption = takeNonEmpty(fromJson?.instagramCaption) ?? takeNonEmpty(fromLabels.instagramCaption) ?? takeNonEmpty(input.rawText.slice(0, 2200));
  const tiktokCaption = takeNonEmpty(fromJson?.tiktokCaption) ?? takeNonEmpty(fromLabels.tiktokCaption) ?? takeNonEmpty(input.rawText.slice(0, 300));

  const basePlatforms = fromJson?.platforms?.length ? fromJson.platforms : input.sourcePlatforms ?? [];
  const platforms = derivePlatforms(basePlatforms, {
    youtubeTitle,
    youtubeDescription,
    instagramCaption,
    tiktokCaption
  });

  return {
    brief: fallbackBrief(fromJson?.brief || input.sourceBrief, input.rawText),
    platforms,
    youtubeTitle,
    youtubeDescription,
    instagramCaption,
    tiktokCaption
  };
}

export function createSocialPublishPayload(
  draft: SocialContentDraft,
  platform: SocialPlatform
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    brief: draft.brief,
    platform
  };

  if (platform === 'youtube') {
    payload.youtube_title = draft.youtubeTitle;
    payload.youtube_description = draft.youtubeDescription;
  }

  if (platform === 'instagram') {
    payload.instagram_caption = draft.instagramCaption;
  }

  if (platform === 'tiktok') {
    payload.tiktok_caption = draft.tiktokCaption;
  }

  return payload;
}

```

### frontend/lib/supabase-browser.ts

```ts
'use client';

import { createBrowserClient } from '@supabase/ssr';

type MissingPublicSupabaseConfig = {
  missingKeys: string[];
};

function readPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;

  return { url, key };
}

export function getMissingPublicSupabaseConfig(): MissingPublicSupabaseConfig {
  const { url, key } = readPublicSupabaseEnv();
  const missingKeys = [
    !url ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !key ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null
  ].filter((value): value is string => value !== null);

  return { missingKeys };
}

export function createSupabaseBrowserClient() {
  const { url, key } = readPublicSupabaseEnv();

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

```

### frontend/lib/supabase-server.ts

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServerEnv } from '@/lib/env';

function getSupabaseServerConfig() {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anonKey } = getServerEnv();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseServerConfigured() {
  return getSupabaseServerConfig() !== null;
}

export async function createSupabaseServerClient() {
  const config = getSupabaseServerConfig();
  if (!config) {
    throw new Error('Supabase server client could not be initialized: missing SUPABASE_URL or SUPABASE_ANON_KEY.');
  }

  const cookieStore = await cookies();
  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof cookieStore.set>[2];
  };

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
}

```

### frontend/lib/workspace.ts

```ts
import { createSupabaseServerClient } from '@/lib/supabase-server';

export type WorkspaceContext = {
  userId: string;
  workspaceId: string;
  workspaceName: string;
};

type WorkspaceMembershipRow = {
  workspace_id: string;
  workspaces: { name: string } | { name: string }[] | null;
};

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  const { data: membership, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !membership?.workspace_id) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  const typedMembership = membership as WorkspaceMembershipRow;
  const workspaceRelation = typedMembership.workspaces;
  const workspaceName = Array.isArray(workspaceRelation) ? workspaceRelation[0]?.name : workspaceRelation?.name;

  if (!workspaceName) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  return {
    userId: user.id,
    workspaceId: typedMembership.workspace_id,
    workspaceName
  };
}

export async function getWorkspaceContextOrNull(): Promise<WorkspaceContext | null> {
  try {
    return await getWorkspaceContext();
  } catch {
    return null;
  }
}

```

### frontend/middleware.ts

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicEnv } from '@/lib/env';

const PROTECTED_ROUTES = ['/dashboard', '/agents', '/projects', '/composer', '/runs', '/saved', '/connections'];
const AUTH_ROUTES = ['/signin', '/signup', '/login'];
const SIGN_IN_ROUTE = '/signin';

export async function middleware(request: NextRequest) {
  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<NextResponse['cookies']['set']>[2];
  };

  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } = getPublicEnv();

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route));
  const isLoginRoute = request.nextUrl.pathname === '/login';

  if (isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = SIGN_IN_ROUTE;
    return NextResponse.redirect(url);
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = SIGN_IN_ROUTE;
      return NextResponse.redirect(url);
    }

    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    });

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone();
      url.pathname = SIGN_IN_ROUTE;
      return NextResponse.redirect(url);
    }

    if (isAuthRoute && user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('[middleware] auth guard failed', {
      pathname: request.nextUrl.pathname,
      error
    });

    if (isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = SIGN_IN_ROUTE;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/agents/:path*', '/projects/:path*', '/composer/:path*', '/runs/:path*', '/saved/:path*', '/connections/:path*', '/login', '/signin', '/signup']
};

```

### frontend/next-env.d.ts

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.

```

### frontend/next.config.ts

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;

```

### frontend/package.json

```json
{
  "name": "koschei-ai-command-center",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "start:validated": "node scripts/validate-runtime-env.mjs && next start"
  },
  "dependencies": {
    "@google/genai": "^0.14.0",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.49.4",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.25.0",
    "eslint-config-next": "^16.0.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3"
  }
}

```

### frontend/postcss.config.mjs

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

```

### frontend/public/ads.txt

```txt
google.com, pub-6001394144742471, DIRECT, f08c47fec0942fa0

```

### frontend/scripts/validate-runtime-env.mjs

```js
const requiredPublicEnv = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const requiredServerEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY'];

function isPresent(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function missingKeys(keys) {
  return keys.filter((key) => !isPresent(process.env[key]));
}

const missingPublic = missingKeys(requiredPublicEnv);
const missingServer = missingKeys(requiredServerEnv);

if (missingPublic.length || missingServer.length) {
  const details = [
    missingPublic.length ? `public missing: ${missingPublic.join(', ')}` : null,
    missingServer.length ? `server missing: ${missingServer.join(', ')}` : null
  ]
    .filter(Boolean)
    .join(' | ');

  console.error(`[startup-env] App configuration is incomplete. ${details}`);
  process.exit(1);
}

console.info('[startup-env] Required environment variables are present.');

```

### frontend/tailwind.config.ts

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#04050f',
        neon: '#66e3ff',
        lilac: '#b692ff'
      }
    }
  },
  plugins: []
};

export default config;

```

### frontend/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": [
        "./*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}

```

