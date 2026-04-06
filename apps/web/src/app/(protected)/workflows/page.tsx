'use client';

import { useEffect, useMemo, useState } from 'react';

import { ApiRequestError, postJsonWithSession } from '@/lib/api-client';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type AgentTypeOption = { id: string; name: string };
type WorkflowRow = { id: string; title: string; description: string | null; created_at: string };
type WorkflowStepRow = {
  id: string;
  workflow_id: string;
  step_order: number;
  title: string;
  prompt_template: string;
  requires_approval: boolean;
};
type PendingApprovalRow = {
  id: string;
  status: string;
  step_order: number;
  workflow_runs: { id: string; workflows: { title: string } | null } | null;
};

export default function WorkflowsPage() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [steps, setSteps] = useState<WorkflowStepRow[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalRow[]>([]);
  const [agentTypes, setAgentTypes] = useState<AgentTypeOption[]>([]);
  const [workflowTitle, setWorkflowTitle] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [stepTitle, setStepTitle] = useState('Araştırma');
  const [stepPrompt, setStepPrompt] = useState('Konu hakkında kısa araştırma özeti üret.');
  const [stepAgentTypeId, setStepAgentTypeId] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function loadData() {
    setError('');
    try {
      const supabase = createBrowserSupabase();
      const { workspace, user } = await resolveWorkspaceContext(supabase);
      setWorkspaceId(workspace.id);

      const [workflowRes, stepRes, approvalRes, agentRes] = await Promise.all([
        supabase.from('workflows').select('id, title, description, created_at').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
        supabase
          .from('workflow_steps')
          .select('id, workflow_id, step_order, title, prompt_template, requires_approval')
          .in(
            'workflow_id',
            (
              await supabase
                .from('workflows')
                .select('id')
                .eq('workspace_id', workspace.id)
                .then((x) => (x.data ?? []).map((row) => row.id))
            ) || [],
          )
          .order('step_order', { ascending: true }),
        supabase
          .from('workflow_run_steps')
          .select('id, status, step_order, workflow_runs!inner(id, workflows!inner(title))')
          .eq('status', 'pending_approval')
          .order('created_at', { ascending: false })
          .limit(15),
        supabase.from('agent_types').select('id, name').eq('is_active', true).order('name', { ascending: true }),
      ]);

      if (workflowRes.error || stepRes.error || approvalRes.error || agentRes.error) {
        setError(workflowRes.error?.message ?? stepRes.error?.message ?? approvalRes.error?.message ?? agentRes.error?.message ?? 'Yükleme hatası.');
        return;
      }

      setWorkflows((workflowRes.data ?? []) as WorkflowRow[]);
      setSteps((stepRes.data ?? []) as WorkflowStepRow[]);
      setPendingApprovals((approvalRes.data ?? []) as unknown as PendingApprovalRow[]);
      setAgentTypes((agentRes.data ?? []) as AgentTypeOption[]);
      if (!stepAgentTypeId && (agentRes.data ?? [])[0]?.id) {
        setStepAgentTypeId((agentRes.data ?? [])[0].id);
      }

      if (!user) {
        setError('Oturum bulunamadı.');
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Workflow verileri alınamadı.');
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createWorkflow() {
    if (!workspaceId || !workflowTitle.trim() || !stepTitle.trim() || !stepPrompt.trim() || !stepAgentTypeId) {
      setError('Workflow ve ilk adım bilgileri zorunludur.');
      return;
    }

    setError('');
    setStatus('');

    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Oturum doğrulanamadı.');
      return;
    }

    const { data: workflowRow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        title: workflowTitle.trim(),
        description: workflowDescription.trim() || null,
      })
      .select('id')
      .single();

    if (workflowError || !workflowRow) {
      setError(workflowError?.message ?? 'Workflow oluşturulamadı.');
      return;
    }

    const { error: stepError } = await supabase.from('workflow_steps').insert({
      workflow_id: workflowRow.id,
      step_order: 1,
      title: stepTitle.trim(),
      prompt_template: stepPrompt.trim(),
      agent_type_id: stepAgentTypeId,
      requires_approval: requiresApproval,
    });

    if (stepError) {
      setError(stepError.message);
      return;
    }

    setWorkflowTitle('');
    setWorkflowDescription('');
    setStatus('Workflow foundation oluşturuldu. İstersen ek adımları SQL veya yönetim ekranıyla ekleyebilirsin.');
    await loadData();
  }

  async function startWorkflowRun(workflowId: string) {
    setError('');
    setStatus('');

    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!workspaceId || !user) {
      setError('Oturum veya workspace doğrulanamadı.');
      return;
    }

    const workflowSteps = steps.filter((step) => step.workflow_id === workflowId).sort((a, b) => a.step_order - b.step_order);
    if (workflowSteps.length === 0) {
      setError('Workflow step bulunamadı.');
      return;
    }

    const { data: runRow, error: runError } = await supabase
      .from('workflow_runs')
      .insert({
        workflow_id: workflowId,
        workspace_id: workspaceId,
        user_id: user.id,
        trigger_mode: 'manual',
        status: workflowSteps.some((step) => step.requires_approval) ? 'pending_approval' : 'completed',
        metadata: { started_from: 'ui_manual' },
      })
      .select('id')
      .single();

    if (runError || !runRow) {
      setError(runError?.message ?? 'Workflow run oluşturulamadı.');
      return;
    }

    let previousOutput = '';
    const rows = workflowSteps.map((step) => {
      const chainedInput = previousOutput ? `${step.prompt_template}\n\nÖnceki adım çıktısı:\n${previousOutput}` : step.prompt_template;
      const output = step.requires_approval ? null : `Manual foundation output: ${step.title}`;
      if (output) {
        previousOutput = output;
      }

      return {
        workflow_run_id: runRow.id,
        workflow_step_id: step.id,
        step_order: step.step_order,
        status: step.requires_approval ? 'pending_approval' : 'completed',
        input_payload: { chained_prompt: chainedInput },
        output_text: output,
      };
    });

    const { error: insertStepError } = await supabase.from('workflow_run_steps').insert(rows);

    if (insertStepError) {
      setError(insertStepError.message);
      return;
    }

    setStatus('Workflow run başlatıldı. Approval gereken adımları aşağıdan onaylayabilirsin.');
    await loadData();
  }

  async function handleApproval(stepId: string, action: 'approve' | 'reject') {
    const note = action === 'reject' ? window.prompt('Reject notu (opsiyonel):') ?? '' : '';

    try {
      await postJsonWithSession<{ ok: boolean }, { action: 'approve' | 'reject'; note?: string }>(
        `/api/workflows/steps/${stepId}/approval`,
        {
          action,
          note,
        },
      );

      setStatus(action === 'approve' ? 'Adım onaylandı.' : 'Adım reddedildi.');
      setError('');
      await loadData();
    } catch (approvalError) {
      if (approvalError instanceof ApiRequestError) {
        setError(approvalError.message);
      } else {
        setError(approvalError instanceof Error ? approvalError.message : 'Onay işlemi başarısız.');
      }
    }
  }

  const stepsByWorkflow = useMemo(() => {
    const map = new Map<string, WorkflowStepRow[]>();
    for (const step of steps) {
      const current = map.get(step.workflow_id) ?? [];
      current.push(step);
      map.set(step.workflow_id, current.sort((a, b) => a.step_order - b.step_order));
    }
    return map;
  }, [steps]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Workflows</h1>
        <p className="text-sm text-zinc-300">Çok adımlı otomasyon foundation: adımlar, chained outputs ve approval checkpoint.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      {status ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{status}</p> : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Yeni workflow oluştur</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={workflowTitle}
            onChange={(event) => setWorkflowTitle(event.target.value)}
            placeholder="Workflow başlığı"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            value={workflowDescription}
            onChange={(event) => setWorkflowDescription(event.target.value)}
            placeholder="Açıklama"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <input
            value={stepTitle}
            onChange={(event) => setStepTitle(event.target.value)}
            placeholder="İlk adım başlığı"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <select
            value={stepAgentTypeId}
            onChange={(event) => setStepAgentTypeId(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {agentTypes.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <textarea
            value={stepPrompt}
            onChange={(event) => setStepPrompt(event.target.value)}
            rows={4}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
            <input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} />
            Bu adım için approval checkpoint gerekli
          </label>
        </div>
        <button
          type="button"
          onClick={() => {
            void createWorkflow();
          }}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Workflow oluştur
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Workflow listesi</h2>
        {workflows.map((workflow) => (
          <article key={workflow.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{workflow.title}</p>
                <p className="text-xs text-zinc-400">{workflow.description ?? 'Açıklama yok'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void startWorkflowRun(workflow.id);
                }}
                className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-400"
              >
                Manuel run başlat
              </button>
            </div>
            <ol className="mt-3 space-y-1 text-xs text-zinc-300">
              {(stepsByWorkflow.get(workflow.id) ?? []).map((step) => (
                <li key={step.id}>
                  {step.step_order}. {step.title} {step.requires_approval ? '(pending_approval checkpoint)' : ''}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Approval checkpoint kuyruğu</h2>
        <div className="space-y-2">
          {pendingApprovals.map((step) => (
            <article key={step.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-sm text-zinc-100">
                {(Array.isArray(step.workflow_runs) ? step.workflow_runs[0] : step.workflow_runs)?.workflows?.title ?? 'Workflow'} • Adım {step.step_order}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleApproval(step.id, 'approve');
                  }}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-500"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleApproval(step.id, 'reject');
                  }}
                  className="rounded-md bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-500"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
          {pendingApprovals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-300">Bekleyen approval adımı yok.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
