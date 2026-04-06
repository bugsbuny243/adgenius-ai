'use client';

import { useMemo, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';

type WorkspaceOption = {
  workspace_id: string;
  workspaces: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
};

type Props = {
  templateSlug: string;
  initialLikeCount: number;
};

function pickWorkspace(
  relation: WorkspaceOption['workspaces'],
): { id: string; name: string; slug: string } | null {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export function TemplateActions({ templateSlug, initialLikeCount }: Props) {
  const [cloneMessage, setCloneMessage] = useState('');
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('');

  const workspaceOptions = useMemo(
    () => workspaces.map((workspace) => ({ value: workspace.id, label: workspace.name })),
    [workspaces],
  );

  async function ensureWorkspaceList() {
    if (workspaces.length > 0) {
      return workspaces;
    }

    const supabase = createBrowserSupabase();
    const { data, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name, slug)')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as WorkspaceOption[];
    const mapped = rows
      .map((row) => pickWorkspace(row.workspaces))
      .filter((item): item is { id: string; name: string; slug: string } => Boolean(item));

    setWorkspaces(mapped);
    if (!selectedWorkspace && mapped[0]) {
      setSelectedWorkspace(mapped[0].id);
    }

    return mapped;
  }

  async function handleClone() {
    setBusy(true);
    setCloneMessage('');

    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCloneMessage('Template klonlamak için giriş yapmalısınız.');
        return;
      }

      const loadedWorkspaces = await ensureWorkspaceList();

      const workspaceId = selectedWorkspace || loadedWorkspaces?.[0]?.id || workspaces[0]?.id;
      if (!workspaceId) {
        setCloneMessage('Önce bir workspace oluşturun, sonra tekrar deneyin.');
        return;
      }

      const response = await fetch(`/api/templates/${templateSlug}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspaceId }),
      });

      const payload = (await response.json()) as { error?: string; clonedTemplateId?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? 'Template klonlanamadı.');
      }

      setCloneMessage('Template workspace alanına eklendi. Dashboard üzerinde görebilirsiniz.');
    } catch (error) {
      setCloneMessage(error instanceof Error ? error.message : 'Template klonlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLike() {
    setBusy(true);
    setCloneMessage('');

    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCloneMessage('Template beğenmek için giriş yapmalısınız.');
        return;
      }

      const response = await fetch(`/api/templates/${templateSlug}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json()) as { likeCount?: number; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Beğeni işlemi tamamlanamadı.');
      }

      setLikeCount(payload.likeCount ?? likeCount);
    } catch (error) {
      setCloneMessage(error instanceof Error ? error.message : 'Beğeni işlemi tamamlanamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleClone()}
          disabled={busy}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Workspace&apos;e Klonla
        </button>
        <button
          type="button"
          onClick={() => void handleLike()}
          disabled={busy}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Beğen ({likeCount})
        </button>
      </div>

      <div className="space-y-1">
        <label htmlFor="workspace-picker" className="text-xs text-zinc-400">
          Hedef Workspace
        </label>
        <select
          id="workspace-picker"
          value={selectedWorkspace}
          onChange={(event) => setSelectedWorkspace(event.target.value)}
          onFocus={() => void ensureWorkspaceList()}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
        >
          {workspaceOptions.length === 0 ? <option value="">Workspace seçin</option> : null}
          {workspaceOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {cloneMessage ? <p className="text-sm text-zinc-300">{cloneMessage}</p> : null}
    </div>
  );
}
