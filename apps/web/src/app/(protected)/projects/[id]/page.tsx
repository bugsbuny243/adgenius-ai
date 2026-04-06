'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  profiles: { email: string | null; full_name: string | null } | null;
};

type ProjectItem = {
  id: string;
  item_type: 'run' | 'saved_output' | 'note';
  title: string | null;
  content: string | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  project_item_id: string;
  content: string;
  created_at: string;
  profiles: { email: string | null; full_name: string | null } | null;
};

type ActivityRow = {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [error, setError] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [note, setNote] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const canEdit = useMemo(() => role === 'owner' || role === 'admin' || project?.created_by === userId, [project?.created_by, role, userId]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabase();
        const { workspace, user, role: currentRole } = await resolveWorkspaceContext(supabase);
        setWorkspaceId(workspace.id);
        setUserId(user.id);
        setRole(currentRole);

        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('id, name, description, created_at, created_by, profiles(full_name, email)')
          .eq('id', params.id)
          .eq('workspace_id', workspace.id)
          .single();

        if (projectError) {
          setError(projectError.message);
          return;
        }

        setProject(projectData as unknown as ProjectDetail);

        const [{ data: itemRows }, { data: commentRows }, { data: activityRows }] = await Promise.all([
          supabase
            .from('project_items')
            .select('id, item_type, title, content, created_at')
            .eq('project_id', params.id)
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('project_item_comments')
            .select('id, project_item_id, content, created_at, profiles(full_name, email)')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('activity_logs')
            .select('id, event_type, created_at, metadata')
            .eq('workspace_id', workspace.id)
            .eq('project_id', params.id)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);

        setItems((itemRows ?? []) as ProjectItem[]);
        setComments((commentRows ?? []) as unknown as CommentRow[]);
        setActivities((activityRows ?? []) as ActivityRow[]);
      } catch (loadErr) {
        setError(loadErr instanceof Error ? loadErr.message : 'Proje detayı yüklenemedi.');
      }
    }

    void load();
  }, [params.id]);

  async function addNoteItem() {
    if (!project || !workspaceId || !note.trim()) {
      return;
    }

    const supabase = createBrowserSupabase();
    const { data: item, error: insertError } = await supabase
      .from('project_items')
      .insert({
        project_id: project.id,
        workspace_id: workspaceId,
        created_by: userId,
        item_type: 'note',
        title: 'Not',
        content: note.trim(),
      })
      .select('id, item_type, title, content, created_at')
      .single();

    if (insertError || !item) {
      setError(insertError?.message ?? 'Not eklenemedi.');
      return;
    }

    await supabase.from('activity_logs').insert({
      workspace_id: workspaceId,
      project_id: project.id,
      actor_user_id: userId,
      event_type: 'project_item_added',
      metadata: { item_id: item.id, item_type: item.item_type },
    });

    setItems((current) => [item as ProjectItem, ...current]);
    setNote('');
  }

  async function addComment(itemId: string) {
    if (!workspaceId || !commentDrafts[itemId]?.trim()) {
      return;
    }

    const supabase = createBrowserSupabase();
    const { data: inserted, error: commentError } = await supabase
      .from('project_item_comments')
      .insert({
        project_item_id: itemId,
        workspace_id: workspaceId,
        author_id: userId,
        content: commentDrafts[itemId].trim(),
      })
      .select('id, project_item_id, content, created_at, profiles(full_name, email)')
      .single();

    if (commentError || !inserted || !project) {
      setError(commentError?.message ?? 'Yorum eklenemedi.');
      return;
    }

    await supabase.from('activity_logs').insert({
      workspace_id: workspaceId,
      project_id: project.id,
      actor_user_id: userId,
      event_type: 'comment_added',
      metadata: { project_item_id: itemId },
    });

    setComments((current) => [...current, inserted as unknown as CommentRow]);
    setCommentDrafts((current) => ({ ...current, [itemId]: '' }));
  }

  async function createShareLink(type: 'project' | 'saved_output', resourceId: string) {
    if (!workspaceId) {
      return;
    }

    const supabase = createBrowserSupabase();
    const token = crypto.randomUUID().replaceAll('-', '');

    const { error: shareError } = await supabase.from('share_links').insert({
      workspace_id: workspaceId,
      resource_type: type,
      resource_id: resourceId,
      token,
      created_by: userId,
    });

    if (shareError) {
      setError(`Paylaşım linki oluşturulamadı: ${shareError.message}`);
      return;
    }

    if (project) {
      await supabase.from('activity_logs').insert({
        workspace_id: workspaceId,
        project_id: project.id,
        actor_user_id: userId,
        event_type: 'share_link_created',
        metadata: { resource_type: type, resource_id: resourceId },
      });
    }

    await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
  }

  return (
    <section className="space-y-5">
      {project ? (
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-zinc-400">{project.description || 'Açıklama girilmedi.'}</p>
          <p className="text-xs text-zinc-500">
            Oluşturan: {project.profiles?.full_name || project.profiles?.email || project.created_by} • {new Date(project.created_at).toLocaleString('tr-TR')}
          </p>
        </header>
      ) : null}

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p> : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Proje İçeriği</h2>
        {canEdit ? (
          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Projeye kısa not ekle" className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
            <button onClick={() => void addNoteItem()} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm hover:bg-indigo-400">
              Not ekle
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">Bu projeyi düzenleme yetkin yok.</p>
        )}

        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{item.title || item.item_type}</p>
                  <p className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString('tr-TR')}</p>
                </div>
                <button onClick={() => void createShareLink('project', project?.id ?? '')} className="rounded border border-zinc-700 px-2 py-1 text-xs hover:border-indigo-400">
                  Read-only link kopyala
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{item.content || '-'}</p>

              <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
                {comments
                  .filter((comment) => comment.project_item_id === item.id)
                  .map((comment) => (
                    <p key={comment.id} className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-xs text-zinc-300">
                      <strong>{comment.profiles?.full_name || comment.profiles?.email || 'Üye'}:</strong> {comment.content}
                    </p>
                  ))}
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <input
                    value={commentDrafts[item.id] ?? ''}
                    onChange={(event) => setCommentDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Yorum yaz"
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs"
                  />
                  <button onClick={() => void addComment(item.id)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs hover:border-indigo-400">
                    Yorum ekle
                  </button>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 ? <p className="text-sm text-zinc-400">Henüz içerik eklenmedi.</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Aktivite Zaman Tüneli</h2>
        <div className="mt-3 space-y-2">
          {activities.map((activity) => (
            <p key={activity.id} className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-300">
              <strong>{activity.event_type}</strong> • {new Date(activity.created_at).toLocaleString('tr-TR')}
            </p>
          ))}
          {activities.length === 0 ? <p className="text-xs text-zinc-500">Henüz aktivite yok.</p> : null}
        </div>
      </section>
    </section>
  );
}
