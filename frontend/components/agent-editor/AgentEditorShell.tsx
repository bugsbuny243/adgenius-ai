'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Play } from 'lucide-react';
import {
  buildDerivedPrompt,
  getAgentEditorConfig,
  type EditorMetadata,
  type EditorState
} from '@/lib/agent-editor';
import { AgentEditorRenderer } from './AgentEditorRenderer';

type AgentEditorShellProps = {
  agentSlug: string;
  projects: Array<{ id: string; name: string }>;
  knowledgeSources?: Array<{ id: string; title: string }>;
  runAction: (formData: FormData) => void;
  initialMetadata?: EditorMetadata;
};

export function AgentEditorShell({ agentSlug, projects, knowledgeSources = [], runAction, initialMetadata }: AgentEditorShellProps) {
  const config = useMemo(() => getAgentEditorConfig(agentSlug), [agentSlug]);
  const [editorState, setEditorState] = useState<EditorState>(initialMetadata?.editorState ?? {});
  const [freeNotes, setFreeNotes] = useState(initialMetadata?.freeNotes ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const storageKey = `agent-editor-v5:${agentSlug}`;

  useEffect(() => {
    if (initialMetadata) return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { editorState?: EditorState; freeNotes?: string; selectedProjectId?: string };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (parsed.editorState && typeof parsed.editorState === 'object') setEditorState(parsed.editorState);
      if (typeof parsed.freeNotes === 'string') setFreeNotes(parsed.freeNotes);
      if (typeof parsed.selectedProjectId === 'string') setSelectedProjectId(parsed.selectedProjectId);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [initialMetadata, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ editorState, freeNotes, selectedProjectId }));
  }, [editorState, freeNotes, selectedProjectId, storageKey]);

  const derivedPrompt = useMemo(() => {
    const basePrompt = buildDerivedPrompt(config, editorState, freeNotes);
    const knowledgeLines = selectedKnowledgeIds
      .map((id) => knowledgeSources.find((item) => item.id === id))
      .filter((item): item is { id: string; title: string } => Boolean(item))
      .map((item) => `- [${item.id}] ${item.title}`);

    return knowledgeLines.length > 0 ? `${basePrompt}\n\nBilgi kaynakları:\n${knowledgeLines.join('\n')}` : basePrompt;
  }, [config, editorState, freeNotes, selectedKnowledgeIds, knowledgeSources]);

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
      <input type="hidden" name="prompt" value={derivedPrompt} readOnly />
      <input type="hidden" name="derived_prompt" value={derivedPrompt} readOnly />
      <input type="hidden" name="editor_state" value={JSON.stringify(editorState)} readOnly />
      <input type="hidden" name="project_id" value={selectedProjectId} readOnly />
      <input type="hidden" name="knowledge_source_ids" value={selectedKnowledgeIds.join(',')} readOnly />

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-lg font-semibold text-white">{config.title}</h3>
        <p className="mt-1 text-sm text-white/70">{config.shortHelp}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <label className="text-sm">
          <span className="mb-1 block text-white/70">Projeye bağla (opsiyonel)</span>
          <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2">
            <option value="">Proje seçimi yok</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
      </div>

      <AgentEditorRenderer config={config} state={editorState} onChange={handleFieldChange} />
      {knowledgeSources.length > 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="mb-2 text-sm font-medium text-white/80">Bilgi kaynakları</p>
          <div className="grid gap-2 text-sm">
            {knowledgeSources.map((source) => (
              <label key={source.id} className="flex items-start gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={selectedKnowledgeIds.includes(source.id)}
                  onChange={(event) =>
                    setSelectedKnowledgeIds((current) =>
                      event.target.checked ? Array.from(new Set([...current, source.id])) : current.filter((id) => id !== source.id)
                    )
                  }
                />
                <span>{source.title}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <label className="mb-1 block text-sm font-medium text-white/80">Ek notlar</label>
        <textarea
          name="free_notes"
          rows={5}
          value={freeNotes}
          onChange={(event) => setFreeNotes(event.target.value)}
          placeholder={config.placeholder}
          className="w-full resize-none rounded-lg border border-white/20 bg-black/40 px-3 py-2"
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">
          <Play className="h-4 w-4" />
          {isPending ? 'Çalıştırılıyor...' : 'Çalıştır'}
        </button>
      </div>
    </form>
  );
}
