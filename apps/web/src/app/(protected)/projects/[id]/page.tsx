'use client';

import { useEffect, useMemo, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

type ProjectItem = {
  id: string;
  project_id: string;
  title: string;
  content: string;
  position: number;
  created_at: string;
  created_by: string;
};

type Comment = {
  id: string;
  project_item_id: string;
  body: string;
  author_id: string;
  created_at: string;
};

type Activity = {
  id: string;
  event_type: string;
  metadata: Record<string, string> | null;
  created_at: string;
};

const activityMap: Record<string, string> = {
  run_created: 'Run oluşturuldu',
  output_saved: 'Çıktı kaydedildi',
  output_deleted: 'Çıktı silindi',
  project_created: 'Proje oluşturuldu',
  project_item_added: 'Proje öğesi eklendi',
  subscription_changed: 'Abonelik değişti',
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [status, setStatus] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [itemContent, setItemContent] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function loadAll() {
    const supabase = createBrowserSupabase();
    const { user, workspace, memberRole } = await resolveWorkspaceContext(supabase);

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, workspace_id, name, description, created_by, created_at')
      .eq('id', params.id)
      .eq('workspace_id', workspace.id)
      .maybeSingle();

    if (projectError || !projectData) {
      setStatus(projectError?.message ?? 'Proje bulunamadı.');
      return;
    }

    const { data: itemsData, error: itemError } = await supabase
      .from('project_items')
      .select('id, project_id, title, content, position, created_at, created_by')
      .eq('project_id', projectData.id)
      .eq('workspace_id', workspace.id)
      .order('position', { ascending: true });

    if (itemError) {
      setStatus(`Proje öğeleri okunamadı: ${itemError.message}`);
      return;
    }

    const { data: activityData } = await supabase
      .from('activity_logs')
      .select('id, event_type, metadata, created_at')
      .eq('workspace_id', workspace.id)
      .eq('project_id', projectData.id)
      .order('created_at', { ascending: false })
      .limit(30);

    const itemIds = (itemsData ?? []).map((item) => item.id);
    if (itemIds.length > 0) {
      const { data: commentRows } = await supabase
        .from('project_item_comments')
        .select('id, project_item_id, body, author_id, created_at')
        .in('project_item_id', itemIds)
        .order('created_at', { ascending: true });
      setComments((commentRows ?? []) as Comment[]);
    } else {
      setComments([]);
    }

    setProject(projectData as Project);
    setItems((itemsData ?? []) as ProjectItem[]);
    setActivities((activityData ?? []) as unknown as Activity[]);
    setCanEdit(memberRole === 'owner' || memberRole === 'admin' || projectData.created_by === user.id);
  }

  useEffect(() => {
    void loadAll();
  }, [params.id]);

  async function onAddItem() {
    if (!project) {
      return;
    }

    const title = itemTitle.trim();
    const content = itemContent.trim();

    if (!title || !content) {
      setStatus('Öğe başlığı ve içeriği zorunludur.');
      return;
    }

    const supabase = createBrowserSupabase();
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { error } = await supabase.from('project_items').insert({
      workspace_id: workspace.id,
      project_id: project.id,
      created_by: user.id,
      title,
      content,
      position: items.length,
    });

    if (error) {
      setStatus(`Öğe eklenemedi: ${error.message}`);
      return;
    }

    setItemTitle('');
    setItemContent('');
    setStatus('Öğe eklendi.');
    await loadAll();
  }

  async function onAddComment(itemId: string) {
    if (!project) {
      return;
    }

    const body = (commentDrafts[itemId] ?? '').trim();
    if (!body) {
      return;
    }

    const supabase = createBrowserSupabase();
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { error } = await supabase.from('project_item_comments').insert({
      workspace_id: workspace.id,
      project_id: project.id,
      project_item_id: itemId,
      author_id: user.id,
      body,
    });

    if (error) {
      setStatus(`Yorum kaydedilemedi: ${error.message}`);
      return;
    }

    setCommentDrafts((prev) => ({ ...prev, [itemId]: '' }));
    await loadAll();
  }

  async function onCreateShareLink() {
    if (!project) {
      return;
    }

    const supabase = createBrowserSupabase();
    const { user, workspace } = await resolveWorkspaceContext(supabase);

    const { data: tokenRow, error } = await supabase
      .from('share_tokens')
      .insert({
        workspace_id: workspace.id,
        resource_type: 'project',
        resource_id: project.id,
        created_by: user.id,
      })
      .select('token')
      .single();

    if (error || !tokenRow) {
      setStatus(`Paylaşım linki oluşturulamadı: ${error?.message ?? 'Bilinmeyen hata'}`);
      return;
    }

    const url = `${window.location.origin}/share/${tokenRow.token}`;
    setShareUrl(url);
    setStatus('Read-only paylaşım linki oluşturuldu.');
  }

  const commentsByItem = useMemo(() => {
    return comments.reduce<Record<string, Comment[]>>((acc, comment) => {
      acc[comment.project_item_id] = [...(acc[comment.project_item_id] ?? []), comment];
      return acc;
    }, {});
  }, [comments]);

  if (!project) {
    return <p className="text-sm text-zinc-300">{status || 'Yükleniyor...'}</p>;
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-sm text-zinc-300">Oluşturan: {project.created_by} · {new Date(project.created_at).toLocaleString('tr-TR')}</p>
        {project.description ? <p className="mt-1 text-sm text-zinc-400">{project.description}</p> : null}
      </header>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Paylaşım</h2>
          <button
            type="button"
            onClick={() => void onCreateShareLink()}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
          >
            Read-only link üret
          </button>
        </div>
        {shareUrl ? <p className="break-all text-xs text-indigo-300">{shareUrl}</p> : <p className="text-xs text-zinc-400">Henüz paylaşım linki yok.</p>}
      </div>

      {canEdit ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="mb-3 text-lg font-medium">Yeni proje öğesi</h2>
          <div className="grid gap-2">
            <input
              value={itemTitle}
              onChange={(event) => setItemTitle(event.target.value)}
              placeholder="Öğe başlığı"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            />
            <textarea
              value={itemContent}
              onChange={(event) => setItemContent(event.target.value)}
              placeholder="Öğe içeriği"
              className="min-h-28 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => void onAddItem()} className="w-fit rounded-lg bg-indigo-500 px-3 py-1.5 text-sm hover:bg-indigo-400">
              Öğe ekle
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Proje öğeleri</h2>
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
            <h3 className="text-sm font-medium">{item.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{item.content}</p>
            <p className="mt-2 text-xs text-zinc-500">{new Date(item.created_at).toLocaleString('tr-TR')}</p>

            <div className="mt-3 space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <p className="text-xs font-medium text-zinc-300">Yorumlar</p>
              {(commentsByItem[item.id] ?? []).map((comment) => (
                <div key={comment.id} className="rounded-md border border-zinc-800 bg-zinc-950/70 p-2 text-xs text-zinc-300">
                  <p>{comment.body}</p>
                  <p className="mt-1 text-zinc-500">{comment.author_id} · {new Date(comment.created_at).toLocaleString('tr-TR')}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={commentDrafts[item.id] ?? ''}
                  onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                  placeholder="Yorum yaz"
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                />
                <button type="button" onClick={() => void onAddComment(item.id)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs">
                  Gönder
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Activity timeline</h2>
        {(activities ?? []).map((activity) => (
          <div key={activity.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
            <p>{activityMap[activity.event_type] ?? activity.event_type}</p>
            <p className="text-xs text-zinc-500">{new Date(activity.created_at).toLocaleString('tr-TR')}</p>
          </div>
        ))}
      </div>

      {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}
