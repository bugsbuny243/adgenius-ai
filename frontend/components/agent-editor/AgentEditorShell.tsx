'use client';

import { useMemo, useState } from 'react';
import {
  buildDerivedPrompt,
  buildPreviewBlocks,
  getAgentEditorConfig,
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

  const derivedPrompt = useMemo(() => buildDerivedPrompt(config, editorState, freeNotes), [config, editorState, freeNotes]);
  const previewBlocks = useMemo(() => buildPreviewBlocks(config, editorState, freeNotes), [config, editorState, freeNotes]);

  const handleFieldChange = (key: string, value: string | boolean) => {
    setEditorState((current) => ({ ...current, [key]: value }));
  };

  return (
    <form action={runAction} className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-lg font-semibold">{config.title}</h3>
        <p className="mt-1 text-sm text-white/70">{config.shortHelp}</p>
        <p className="mt-1 text-xs text-white/55">Bu agent ne üretir: {config.summaryDescription}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <AgentEditorRenderer config={config} state={editorState} onChange={handleFieldChange} />

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-white/70">Ek notlar</span>
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
              className="min-w-64 rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            >
              <option value="">Proje seçimi (opsiyonel)</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
              Çalıştır
            </button>
          </div>
        </div>

        <LivePreviewPanel title="Canlı Önizleme" helpText="Alanları doldurdukça çalıştırma özeti burada güncellenir." blocks={previewBlocks} derivedPrompt={derivedPrompt} />
      </div>

      <input type="hidden" name="prompt" value={derivedPrompt} />
      <input type="hidden" name="derived_prompt" value={derivedPrompt} />
      <input type="hidden" name="editor_state" value={JSON.stringify(editorState)} />
    </form>
  );
}
