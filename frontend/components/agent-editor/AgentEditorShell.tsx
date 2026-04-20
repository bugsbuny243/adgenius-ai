'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Bold,
  Clapperboard,
  Code2,
  Image as ImageIcon,
  Italic,
  Music2,
  Play,
  Radio,
  Save,
  Share2,
  WandSparkles
} from 'lucide-react';
import {
  buildDerivedPrompt,
  buildPreviewBlocks,
  getAgentEditorConfig,
  getAgentStarterPacks,
  type EditorMetadata,
  type EditorState
} from '@/lib/agent-editor';
import { AgentEditorRenderer } from './AgentEditorRenderer';

type AgentEditorShellProps = {
  agentSlug: string;
  projects: Array<{ id: string; name: string }>;
  runAction: (formData: FormData) => void;
  initialMetadata?: EditorMetadata;
};

type EditorMode = {
  id: string;
  label: string;
  icon: typeof Code2;
  active?: boolean;
};

const KOSCHEI_MODES: EditorMode[] = [
  { id: 'code-content', label: 'Kod & İçerik Ajanı', icon: Code2, active: true },
  { id: 'visual', label: 'Görsel & Grafik', icon: ImageIcon },
  { id: 'video', label: 'Video Prodüksiyon', icon: Clapperboard },
  { id: 'music', label: 'Müzik & Ses', icon: Music2 },
  { id: 'live', label: 'Canlı Etkileşim', icon: Radio }
];

const TOOLBAR_ACTIONS = [
  { id: 'bold', label: 'Kalın', icon: Bold },
  { id: 'italic', label: 'İtalik', icon: Italic },
  { id: 'rewrite', label: 'Yeniden Yaz', icon: WandSparkles }
];

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
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#080d17] shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
    >
      <div className="grid min-h-[78vh] gap-0 lg:grid-cols-[minmax(280px,30%)_minmax(0,70%)]">
        <aside className="flex h-full flex-col border-b border-white/10 bg-ink px-5 py-6 lg:border-b-0 lg:border-r lg:border-white/10 lg:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-neon/75">Live Editor</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">KOSCHEI AI</h2>
            <p className="mt-2 text-sm text-white/60">{config.shortHelp}</p>
          </div>

          <nav className="mt-6 space-y-2">
            {KOSCHEI_MODES.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    mode.active
                      ? 'border-neon/60 bg-neon/15 text-white shadow-[0_0_0_1px_rgba(94,234,212,0.16)]'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </nav>

          {starterPacks.length ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs uppercase tracking-wide text-white/45">Hızlı başlat</p>
              <div className="mt-2 flex flex-wrap gap-2">
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
                    className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/75 hover:border-neon/60 hover:text-white"
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
                  className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/65 hover:border-red-300/70"
                >
                  Temizle
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-auto space-y-3 pt-6">
            <label className="block text-xs font-medium uppercase tracking-wide text-white/55">Komut / Prompt</label>
            <textarea
              name="free_notes"
              rows={6}
              value={freeNotes}
              onChange={(event) => setFreeNotes(event.target.value)}
              placeholder={config.placeholder}
              className="w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-neon/60"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neon px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Play className="h-4 w-4" />
              {isPending ? 'Çalıştırılıyor...' : 'Çalıştır'}
            </button>
          </div>
        </aside>

        <section className="flex h-full flex-col bg-slate-100 text-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300/70 bg-white/90 px-4 py-3 lg:px-6">
            <div className="flex flex-wrap items-center gap-2">
              {TOOLBAR_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {action.label}
                  </button>
                );
              })}
            </div>
            <select
              name="project_id"
              defaultValue=""
              className="min-w-52 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-neon"
            >
              <option value="">Proje seçimi (opsiyonel)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] lg:p-6">
            <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">Canlı Editör</h3>
                <p className="mt-1 text-xs text-slate-500">Koschei çıktısı burada akacak. Şimdilik önizleme alanı placeholder içerir.</p>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm leading-6 text-slate-700">
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-slate-500">
                  Koschei, seçtiğiniz moda göre metin, öneri ve içerik bloklarını bu alana gerçek zamanlı işler.
                </p>
                {previewBlocks.map((block) => (
                  <article key={block.title} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{block.title}</h4>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{block.content}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="flex h-full min-h-[420px] flex-col gap-4">
              <div className="overflow-y-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-800">Ajan Ayarları</h4>
                <p className="mt-1 text-xs text-slate-500">Mevcut yapı korunur: alanları düzenleyerek promptu detaylandırabilirsiniz.</p>
                <div className="mt-4">
                  <AgentEditorRenderer config={config} state={editorState} onChange={handleFieldChange} />
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <Save className="h-4 w-4" />
                  Taslağı Kaydet
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,70,229,0.28)] transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Share2 className="h-4 w-4" />
                  Doğrudan Paylaş / Uygula
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <input type="hidden" name="prompt" value={derivedPrompt} />
      <input type="hidden" name="derived_prompt" value={derivedPrompt} />
      <input type="hidden" name="editor_state" value={JSON.stringify(editorState)} />
    </form>
  );
}
