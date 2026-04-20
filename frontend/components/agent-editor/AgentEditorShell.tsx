'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Play } from 'lucide-react';
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

function getModeBadge(agentSlug: string): string {
  if (agentSlug === 'arastirma') return 'Araştırma destekli mod';
  if (agentSlug === 'yazilim' || agentSlug === 'rapor') return 'Derin analiz modu';
  return 'Hızlı mod';
}

export function AgentEditorShell({ agentSlug, projects, runAction, initialMetadata }: AgentEditorShellProps) {
  const config = useMemo(() => getAgentEditorConfig(agentSlug), [agentSlug]);
  const [editorState, setEditorState] = useState<EditorState>(initialMetadata?.editorState ?? {});
  const [freeNotes, setFreeNotes] = useState(initialMetadata?.freeNotes ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isPending, startTransition] = useTransition();

  const storageKey = `agent-editor-v5:${agentSlug}`;
  const starterPacks = useMemo(() => getAgentStarterPacks(agentSlug), [agentSlug]);
  const [selectedPackIndex, setSelectedPackIndex] = useState(0);

  useEffect(() => {
    if (initialMetadata) return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { editorState?: EditorState; freeNotes?: string; selectedPackIndex?: number; selectedProjectId?: string };
      if (parsed.editorState && typeof parsed.editorState === 'object') setEditorState(parsed.editorState);
      if (typeof parsed.freeNotes === 'string') setFreeNotes(parsed.freeNotes);
      if (typeof parsed.selectedProjectId === 'string') setSelectedProjectId(parsed.selectedProjectId);
      if (typeof parsed.selectedPackIndex === 'number') setSelectedPackIndex(parsed.selectedPackIndex);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [initialMetadata, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ editorState, freeNotes, selectedPackIndex, selectedProjectId }));
  }, [editorState, freeNotes, selectedPackIndex, selectedProjectId, storageKey]);

  const derivedPrompt = useMemo(() => buildDerivedPrompt(config, editorState, freeNotes), [config, editorState, freeNotes]);
  const previewBlocks = useMemo(() => buildPreviewBlocks(config, editorState, freeNotes), [config, editorState, freeNotes]);

  const handleFieldChange = (key: string, value: string | boolean) => {
    setEditorState((current) => ({ ...current, [key]: value }));
  };

  const handleReset = () => {
    setEditorState({});
    setFreeNotes('');
    setSelectedProjectId('');
    setSelectedPackIndex(0);
    window.localStorage.removeItem(storageKey);
  };

  const restoreLastSession = () => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { editorState?: EditorState; freeNotes?: string };
      setEditorState(parsed.editorState ?? {});
      setFreeNotes(parsed.freeNotes ?? '');
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  };

  return (
    <form
      action={(formData) => {
        startTransition(() => runAction(formData));
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="prompt" value={derivedPrompt} readOnly />
      <input type="hidden" name="derived_prompt" value={derivedPrompt} readOnly />
      <input type="hidden" name="editor_state" value={JSON.stringify(editorState)} readOnly />
      <input type="hidden" name="project_id" value={selectedProjectId} readOnly />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-lg font-semibold text-white">{config.title}</h3>
            <p className="mt-1 text-sm text-white/70">{config.shortHelp}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-md border border-neon/40 bg-neon/10 px-2 py-1 text-neon">{getModeBadge(agentSlug)}</span>
              <span className="rounded-md border border-white/20 px-2 py-1">Adım 1: Şablon</span>
              <span className="rounded-md border border-white/20 px-2 py-1">Adım 2: Form</span>
              <span className="rounded-md border border-white/20 px-2 py-1">Adım 3: Önizleme</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Hazır şablonlar</p>
              <div className="flex gap-2">
                <button type="button" onClick={restoreLastSession} className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/75 hover:border-neon">Son kullanılanı yükle</button>
                <button type="button" onClick={handleReset} className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/75 hover:border-neon">Boş başla</button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <select value={selectedPackIndex} onChange={(event) => setSelectedPackIndex(Number(event.target.value))} className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm">
                {starterPacks.map((pack, index) => (
                  <option key={pack.label} value={index}>{pack.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const pack = starterPacks[selectedPackIndex];
                  if (!pack) return;
                  setEditorState((current) => ({ ...current, ...pack.state }));
                  setFreeNotes(pack.freeNotes ?? '');
                }}
                className="rounded-lg border border-neon/40 px-3 py-2 text-xs text-neon hover:bg-neon/10"
              >
                Şablondan başla
              </button>
            </div>
            <p className="mt-2 text-xs text-white/65">{starterPacks[selectedPackIndex]?.description ?? 'Şablon seçerek formu tek tıkla doldurabilirsiniz.'}</p>
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
            <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white/70">
              Akış önerisi: 1) Şablon seç 2) Alanları netleştir 3) Ek not ekle 4) Önizlemeyi kontrol et 5) Çalıştır.
            </div>
          </div>

          <AgentEditorRenderer config={config} state={editorState} onChange={handleFieldChange} />

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <label className="mb-1 block text-sm font-medium text-white/80">Ek notlar</label>
            <textarea
              name="free_notes"
              rows={6}
              value={freeNotes}
              onChange={(event) => setFreeNotes(event.target.value)}
              placeholder={config.placeholder}
              className="w-full resize-none rounded-lg border border-white/20 bg-black/40 px-3 py-2"
            />
          </div>
        </div>

        <LivePreviewPanel
          title="Canlı önizleme"
          helpText="Bu panel final cevabı simüle etmez; yalnızca yapılandırılmış özet ve çalıştırma isteğini gösterir."
          blocks={previewBlocks}
          derivedPrompt={derivedPrompt}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={restoreLastSession} className="rounded-xl border border-white/20 px-5 py-2.5 text-sm">Kaldığım yerden devam et</button>
        <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60">
          <Play className="h-4 w-4" />
          {isPending ? 'Çalıştırılıyor...' : 'Çalıştır'}
        </button>
      </div>
    </form>
  );
}
