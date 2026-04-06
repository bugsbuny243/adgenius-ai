'use client';

import { useEffect, useMemo, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';

type GoalRow = {
  id: string;
  title: string;
  brief: string;
  status: string;
  created_at: string;
};

type MemoryItem = {
  id: string;
  title: string;
  content: string;
  memory_type: string;
  tags: string[];
  created_at: string;
};

type AttachmentItem = {
  id: string;
  title: string;
  attachment_type: string;
  source_url: string | null;
  file_name: string | null;
  created_at: string;
};

type OrchestrationRun = {
  id: string;
  status: string;
  current_step_order: number | null;
  created_at: string;
  orchestration_run_steps: Array<{
    id: string;
    step_order: number;
    status: string;
    output_payload: { summary?: string } | null;
    orchestration_steps: { name: string } | { name: string }[] | null;
  }>;
};

async function authHeaders() {
  const supabase = createBrowserSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    'content-type': 'application/json',
    ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}),
  };
}

function getStepName(step: OrchestrationRun['orchestration_run_steps'][number]) {
  if (!step.orchestration_steps) {
    return `Adım ${step.step_order}`;
  }

  return Array.isArray(step.orchestration_steps) ? step.orchestration_steps[0]?.name ?? `Adım ${step.step_order}` : step.orchestration_steps.name;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [runs, setRuns] = useState<OrchestrationRun[]>([]);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [approvalMode, setApprovalMode] = useState<'auto' | 'manual' | 'stop_on_review'>('manual');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    try {
      setError('');
      const headers = await authHeaders();
      const [goalRes, memoryRes, attachmentRes] = await Promise.all([
        fetch('/api/goals', { headers }),
        fetch('/api/project-memory', { headers }),
        fetch('/api/attachments', { headers }),
      ]);

      const [goalJson, memoryJson, attachmentJson] = await Promise.all([goalRes.json(), memoryRes.json(), attachmentRes.json()]);

      if (!goalRes.ok || !memoryRes.ok || !attachmentRes.ok) {
        setError(goalJson.error ?? memoryJson.error ?? attachmentJson.error ?? 'Veriler yüklenemedi.');
        return;
      }

      setGoals((goalJson.goals ?? []) as GoalRow[]);
      setMemoryItems((memoryJson.items ?? []) as MemoryItem[]);
      setAttachments((attachmentJson.attachments ?? []) as AttachmentItem[]);

      const supabase = createBrowserSupabase();
      const { data: runData, error: runError } = await supabase
        .from('orchestration_runs')
        .select('id, status, current_step_order, created_at, orchestration_run_steps(id, step_order, status, output_payload, orchestration_steps(name))')
        .order('created_at', { ascending: false })
        .limit(8);

      if (runError) {
        setError(runError.message);
        return;
      }

      setRuns((runData ?? []) as unknown as OrchestrationRun[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Veriler alınamadı.');
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createGoal() {
    try {
      setLoading(true);
      setError('');

      const headers = await authHeaders();
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, brief, approvalMode }),
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? 'Goal oluşturulamadı.');
        return;
      }

      setTitle('');
      setBrief('');
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Goal oluşturma hatası.');
    } finally {
      setLoading(false);
    }
  }

  async function approveStep(runId: string, stepId: string) {
    try {
      setError('');
      const headers = await authHeaders();
      const response = await fetch(`/api/orchestrations/runs/${runId}/steps/${stepId}/approve`, {
        method: 'POST',
        headers,
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(json.error ?? 'Adım onayı başarısız.');
        return;
      }

      await loadData();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : 'Adım onayı sırasında hata oluştu.');
    }
  }

  async function finalizeDelivery(runId: string) {
    try {
      setError('');
      const headers = await authHeaders();
      const response = await fetch(`/api/orchestrations/runs/${runId}/finalize`, {
        method: 'POST',
        headers,
      });
      const json = (await response.json()) as { error?: string; deliverable?: { content_markdown: string } };

      if (!response.ok) {
        setError(json.error ?? 'Final teslim oluşturulamadı.');
        return;
      }

      if (json.deliverable?.content_markdown) {
        await navigator.clipboard.writeText(json.deliverable.content_markdown);
      }

      await loadData();
    } catch (finalizeError) {
      setError(finalizeError instanceof Error ? finalizeError.message : 'Final teslim hatası.');
    }
  }

  const goalCountLabel = useMemo(() => `${goals.length} hedef`, [goals.length]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Goals & Orchestration</h1>
        <p className="text-sm text-zinc-300">AI-native üretim akışı: goal-based, multi-agent, memory, attachment, approval gate ve auditable delivery.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p> : null}

      <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <h2 className="text-lg font-medium">Yeni Goal</h2>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Örn: Bu ürün için landing page paketi hazırla"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        />
        <textarea
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          rows={4}
          placeholder="Detayları, hedef kitleyi, ton kurallarını ve sınırları yazın"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={approvalMode}
            onChange={(event) => setApprovalMode(event.target.value as 'auto' | 'manual' | 'stop_on_review')}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="manual">manual approval</option>
            <option value="stop_on_review">stop on review</option>
            <option value="auto">auto</option>
          </select>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void createGoal();
            }}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            {loading ? 'Oluşturuluyor...' : 'Goal başlat'}
          </button>
          <span className="text-xs text-zinc-400">{goalCountLabel}</span>
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
          <h2 className="text-lg font-medium">Project Memory</h2>
          {(memoryItems.length === 0) ? <p className="text-sm text-zinc-400">Henüz memory item yok.</p> : null}
          {memoryItems.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-sm text-zinc-100">{item.title}</p>
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{item.content}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">{item.memory_type}</p>
            </div>
          ))}
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
          <h2 className="text-lg font-medium">Knowledge Attachments</h2>
          {(attachments.length === 0) ? <p className="text-sm text-zinc-400">Henüz attachment yok.</p> : null}
          {attachments.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-sm text-zinc-100">{item.title}</p>
              <p className="mt-1 text-xs text-zinc-400">{item.source_url ?? item.file_name ?? 'text note'}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">{item.attachment_type}</p>
            </div>
          ))}
        </article>
      </div>

      <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <h2 className="text-lg font-medium">Orchestration Runs (Audit + Delivery)</h2>
        {runs.length === 0 ? <p className="text-sm text-zinc-400">Henüz orchestration run yok.</p> : null}

        {runs.map((run) => (
          <div key={run.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-100">Run #{run.id.slice(0, 8)}</p>
              <p className="text-xs text-zinc-400">{run.status} · Step {run.current_step_order ?? '-'}</p>
            </div>

            <div className="space-y-2">
              {run.orchestration_run_steps.map((step) => (
                <div key={step.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2">
                  <div>
                    <p className="text-sm text-zinc-200">{step.step_order}. {getStepName(step)}</p>
                    <p className="text-xs text-zinc-400">{step.output_payload?.summary ?? 'Çıktı henüz yok.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase text-zinc-400">{step.status}</span>
                    {step.status === 'waiting_approval' ? (
                      <button
                        type="button"
                        onClick={() => {
                          void approveStep(run.id, step.id);
                        }}
                        className="rounded-md border border-emerald-700 bg-emerald-900/30 px-2 py-1 text-xs text-emerald-200"
                      >
                        Onayla
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                void finalizeDelivery(run.id);
              }}
              className="rounded-md border border-indigo-700 bg-indigo-900/20 px-3 py-1.5 text-xs text-indigo-200"
            >
              Final Delivery oluştur + markdown kopyala
            </button>
          </div>
        ))}
      </article>
    </section>
  );
}
