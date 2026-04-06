'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ApiRequestError, postJsonWithSession } from '@/lib/api-client';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type TemplateRow = {
  id: string;
  title: string;
  description: string | null;
  default_prompt: string;
  tags: string[] | null;
  is_public: boolean;
  created_at: string;
  agent_types: { slug: string; name: string } | null;
};

type AgentTypeOption = {
  id: string;
  slug: string;
  name: string;
};

export default function TemplatesPage() {
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [agentTypes, setAgentTypes] = useState<AgentTypeOption[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [agentTypeId, setAgentTypeId] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserSupabase();
      const { workspace } = await resolveWorkspaceContext(supabase);
      setWorkspaceId(workspace.id);

      const [{ data: templateData, error: templateError }, { data: agentData, error: agentError }] = await Promise.all([
        supabase
          .from('templates')
          .select('id, title, description, default_prompt, tags, is_public, created_at, agent_types(slug, name)')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false }),
        supabase.from('agent_types').select('id, slug, name').eq('is_active', true).order('name', { ascending: true }),
      ]);

      if (templateError || agentError) {
        setError(templateError?.message ?? agentError?.message ?? 'Veriler yüklenemedi.');
        return;
      }

      setTemplates((templateData ?? []) as unknown as TemplateRow[]);
      const options = (agentData ?? []) as AgentTypeOption[];
      setAgentTypes(options);

      if (!agentTypeId && options[0]?.id) {
        setAgentTypeId(options[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Template verileri alınamadı.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateTemplate() {
    if (!workspaceId || !title.trim() || !defaultPrompt.trim() || !agentTypeId) {
      setError('Başlık, agent ve prompt zorunludur.');
      return;
    }

    setError('');
    setStatus('');

    try {
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Oturum doğrulanamadı.');
        return;
      }

      const tags = tagsText
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const { error: insertError } = await supabase.from('templates').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        agent_type_id: agentTypeId,
        default_prompt: defaultPrompt.trim(),
        tags,
        is_public: isPublic,
        is_private: !isPublic,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setTitle('');
      setDescription('');
      setDefaultPrompt('');
      setTagsText('');
      setIsPublic(false);
      setStatus('Template kaydedildi.');
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Template kaydedilemedi.');
    }
  }

  async function handleClone(templateId: string) {
    setError('');
    setStatus('');

    try {
      await postJsonWithSession<{ template: { id: string } }, { templateId: string }>('/api/templates/clone', { templateId });
      setStatus('Template kopyalandı.');
      await loadData();
    } catch (cloneError) {
      if (cloneError instanceof ApiRequestError) {
        setError(cloneError.message);
      } else {
        setError(cloneError instanceof Error ? cloneError.message : 'Kopyalama başarısız.');
      }
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Template Gallery</h1>
        <p className="text-sm text-zinc-300">Workspace içinde tekrar kullanılabilir prompt + agent kombinasyonlarını yönetin.</p>
      </header>

      {error ? <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      {status ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">{status}</p> : null}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Yeni template oluştur</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Template başlığı"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <select
            value={agentTypeId}
            onChange={(event) => setAgentTypeId(event.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            {agentTypes.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Kısa açıklama"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <textarea
            value={defaultPrompt}
            onChange={(event) => setDefaultPrompt(event.target.value)}
            rows={5}
            placeholder="Varsayılan prompt"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            placeholder="Etiketler (virgülle)"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            Workspace ile paylaş (public)
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            void handleCreateTemplate();
          }}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Template Kaydet
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Workspace template listesi</h2>
        {loading ? <p className="text-sm text-zinc-400">Yükleniyor...</p> : null}
        <div className="space-y-3">
          {templates.map((template) => (
            <article key={template.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-100">{template.title}</p>
                  <p className="text-xs text-zinc-400">{template.agent_types?.name ?? 'Agent'} • {template.is_public ? 'Workspace public' : 'Private'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/workspace/${template.agent_types?.slug ?? ''}?prefill=${encodeURIComponent(template.default_prompt)}&template=${encodeURIComponent(template.title)}`}
                    className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-400"
                  >
                    Run from template
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void handleClone(template.id);
                    }}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
                  >
                    Clone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleClone(template.id);
                    }}
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500"
                  >
                    Duplicate
                  </button>
                </div>
              </div>
              {template.description ? <p className="mt-2 text-sm text-zinc-300">{template.description}</p> : null}
              <p className="mt-2 line-clamp-3 text-xs text-zinc-400">{template.default_prompt}</p>
              {(template.tags ?? []).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(template.tags ?? []).map((tag) => (
                    <span key={`${template.id}-${tag}`} className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {!loading && templates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-300">Henüz template yok.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
