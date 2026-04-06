'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type ScheduleRow = {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly' | 'manual';
  next_run_at: string | null;
  is_active: boolean;
  templates: { title: string } | null;
  workflows: { title: string } | null;
};

type TargetOption = { id: string; title: string };

export default function SchedulesPage() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [templates, setTemplates] = useState<TargetOption[]>([]);
  const [workflows, setWorkflows] = useState<TargetOption[]>([]);
  const [title, setTitle] = useState('');
  const [targetType, setTargetType] = useState<'template' | 'workflow'>('template');
  const [targetId, setTargetId] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'manual'>('daily');
  const [nextRunAt, setNextRunAt] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  async function loadData() {
    setError('');

    try {
      const supabase = createBrowserSupabase();
      const { workspace, user } = await resolveWorkspaceContext(supabase);
      setWorkspaceId(workspace.id);

      const [scheduleRes, templateRes, workflowRes] = await Promise.all([
        supabase
          .from('schedules')
          .select('id, title, frequency, next_run_at, is_active, templates(title), workflows(title)')
          .eq('workspace_id', workspace.id)
          .order('next_run_at', { ascending: true, nullsFirst: false }),
        supabase.from('templates').select('id, title').eq('workspace_id', workspace.id).order('title', { ascending: true }),
        supabase.from('workflows').select('id, title').eq('workspace_id', workspace.id).order('title', { ascending: true }),
      ]);

      if (scheduleRes.error || templateRes.error || workflowRes.error) {
        setError(scheduleRes.error?.message ?? templateRes.error?.message ?? workflowRes.error?.message ?? 'Veriler yüklenemedi.');
        return;
      }

      setSchedules((scheduleRes.data ?? []) as unknown as ScheduleRow[]);
      setTemplates((templateRes.data ?? []) as TargetOption[]);
      setWorkflows((workflowRes.data ?? []) as TargetOption[]);

      const firstTemplateId = (templateRes.data ?? [])[0]?.id;
      const firstWorkflowId = (workflowRes.data ?? [])[0]?.id;

      if (!targetId) {
        setTargetId(firstTemplateId ?? firstWorkflowId ?? '');
      }

      if (!user) {
        setError('Oturum bulunamadı.');
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Schedule verileri alınamadı.');
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const list = targetType === 'template' ? templates : workflows;
    if (!list.some((item) => item.id === targetId)) {
      setTargetId(list[0]?.id ?? '');
    }
  }, [targetType, templates, workflows, targetId]);

  async function createSchedule() {
    if (!workspaceId || !title.trim() || !targetId) {
      setError('Başlık ve hedef seçimleri zorunludur.');
      return;
    }

    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('Oturum doğrulanamadı.');
      return;
    }

    const { error: insertError } = await supabase.from('schedules').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      title: title.trim(),
      frequency,
      next_run_at: nextRunAt ? new Date(nextRunAt).toISOString() : null,
      template_id: targetType === 'template' ? targetId : null,
      workflow_id: targetType === 'workflow' ? targetId : null,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle('');
    setNextRunAt('');
    setStatus('Schedule kaydedildi. Cron entegrasyonu henüz yok; tetikleme foundation hazır.');
    setError('');
    await loadData();
  }

  async function toggleActive(scheduleId: string, isActive: boolean) {
    const supabase = createBrowserSupabase();
    const { error: updateError } = await supabase.from('schedules').update({ is_active: !isActive }).eq('id', scheduleId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setStatus(!isActive ? 'Schedule aktif edildi.' : 'Schedule pasife alındı.');
    await loadData();
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Scheduled Runs</h1>
        <p className="text-sm text-zinc-300">Günlük, haftalık veya manuel tetiklenen tekrar eden işler için schedule foundation.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      {status ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{status}</p> : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Yeni schedule</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Schedule adı"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <select
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as 'daily' | 'weekly' | 'manual')}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="daily">Her gün</option>
            <option value="weekly">Haftalık</option>
            <option value="manual">Manuel tetikleme</option>
          </select>
          <select
            value={targetType}
            onChange={(event) => setTargetType(event.target.value as 'template' | 'workflow')}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="template">Template hedefi</option>
            <option value="workflow">Workflow hedefi</option>
          </select>
          <select
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {(targetType === 'template' ? templates : workflows).map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={nextRunAt}
            onChange={(event) => setNextRunAt(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            void createSchedule();
          }}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Schedule Kaydet
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Yaklaşan scheduled run&apos;lar</h2>
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <article key={schedule.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-zinc-100">{schedule.title}</p>
                  <p className="text-xs text-zinc-400">
                    {schedule.frequency} • {schedule.templates?.title ?? schedule.workflows?.title ?? 'Hedef yok'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void toggleActive(schedule.id, schedule.is_active);
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
                >
                  {schedule.is_active ? 'Pasife al' : 'Aktifleştir'}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Sonraki çalışma: {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString('tr-TR') : 'Planlanmadı'}</p>
            </article>
          ))}
          {schedules.length === 0 ? <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-300">Henüz schedule yok.</p> : null}
        </div>
      </section>
    </section>
  );
}
