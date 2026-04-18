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
