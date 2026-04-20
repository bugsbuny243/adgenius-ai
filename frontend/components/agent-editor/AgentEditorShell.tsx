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

export function AgentEditorShell({ agentSlug, projects, runAction, initialMetadata }: AgentEditorShellProps) {
  const config = useMemo(() => getAgentEditorConfig(agentSlug), [agentSlug]);
  const [editorState, setEditorState] = useState<EditorState>(initialMetadata?.editorState ?? {});
  const [freeNotes, setFreeNotes] = useState(initialMetadata?.freeNotes ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isPending, startTransition] = useTransition();

  const storageKey = `agent-editor-v2:${agentSlug}`;
  const starterPacks = useMemo(() => getAgentStarterPacks(agentSlug), [agentSlug]);
  const [selectedPackIndex, setSelectedPackIndex] = useState(0);

  const suggestedPackIndex = useMemo(() => {
    const index = starterPacks.findIndex((pack) => pack.label.toLowerCase().includes('boş başla'));
    return index >= 0 ? index : 0;
  }, [starterPacks]);

  const helperTips = useMemo(() => {
    const tips: Record<string, string[]> = {
      yazilim: ['Problemi ve beklenen davranışı ayrı yazın.', 'Kısıtlarda dokunulmaması gereken alanları net belirtin.'],
      sosyal: ['Platform ve format seçimi çıktıyı doğrudan etkiler.', 'CTA cümlesini tek ve ölçülebilir hedefle yazın.'],
      eposta: ['Alıcı tipi + amaç birlikte net olursa metin daha güçlü olur.', 'Tek e-postada tek ana CTA kullanın.'],
      icerik: ['Ana konu ve hedef kelimeleri birlikte girin.', 'Amaç alanına beklenen iş sonucunu yazın.'],
      rapor: ['Veri özetini kısa ama sayısal yazın.', 'Hedef okuyucu seviyesine uygun format seçin.'],
      arastirma: ['Rakip listesini mümkünse gerçek marka adlarıyla girin.', 'Derinlik seviyesi süre ve kapsamı belirler.'],
      emlak: ['Hedef müşteri ve konum bilgisini birlikte netleştirin.', 'Öne çıkan özellikler kısa madde yapısında daha iyi çalışır.'],
      eticaret: ['Ürün faydalarını müşteri problemleriyle eşleyin.', 'Platform seçimi metin uzunluğu ve tonunu değiştirir.']
    };
    return tips[agentSlug] ?? ['Brief ne kadar netse çıktı o kadar tutarlı olur.'];
  }, [agentSlug]);

  useEffect(() => {
    if (initialMetadata) return;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { editorState?: EditorState; freeNotes?: string };
      if (parsed.editorState && typeof parsed.editorState === 'object') setEditorState(parsed.editorState);
      if (typeof parsed.freeNotes === 'string') setFreeNotes(parsed.freeNotes);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [initialMetadata, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ editorState, freeNotes }));
  }, [editorState, freeNotes, storageKey]);

  const derivedPrompt = useMemo(() => buildDerivedPrompt(config, editorState, freeNotes), [config, editorState, freeNotes]);
  const previewBlocks = useMemo(() => buildPreviewBlocks(config, editorState, freeNotes), [config, editorState, freeNotes]);

  const handleFieldChange = (key: string, value: string | boolean) => {
    setEditorState((current) => ({ ...current, [key]: value }));
  };

  const handleReset = () => {
    setEditorState({});
    setFreeNotes('');
    window.localStorage.removeItem(storageKey);
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
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Hızlı başlat presetleri</p>
              <button
                type="button"
                onClick={() => setSelectedPackIndex(suggestedPackIndex)}
                className="rounded-lg border border-white/20 px-2.5 py-1 text-xs text-white/75 hover:border-neon"
              >
                Akıllı başlangıç
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <select
                value={selectedPackIndex}
                onChange={(event) => setSelectedPackIndex(Number(event.target.value))}
                className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
              >
                {starterPacks.map((pack, index) => (
                  <option key={pack.label} value={index}>
                    {pack.label}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
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
                  Şablondan doldur
                </button>
                <button type="button" onClick={handleReset} className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:border-neon">
                  Formu temizle
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/65">{starterPacks[selectedPackIndex]?.description ?? 'Şablon seçerek formu tek tıkla doldurabilirsiniz.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starterPacks.map((pack, index) => (
                <button
                  key={pack.label}
                  type="button"
                  onClick={() => setSelectedPackIndex(index)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs ${index === selectedPackIndex ? 'border-neon text-neon' : 'border-white/20 text-white/80'}`}
                >
                  {pack.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 grid gap-3 lg:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-white/70">Proje bağlantısı (opsiyonel)</span>
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2"
                >
                  <option value="">Proje seçimi yok</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-neon/30 bg-neon/10 px-3 py-2 text-xs text-white/75">
                Koschei AI motoru; agent tipine göre Hızlı mod, Derin analiz modu veya Araştırma destekli mod ile çalışır.
              </div>
            </div>

            <AgentEditorRenderer config={config} state={editorState} onChange={handleFieldChange} />
            <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
              <p className="text-xs uppercase tracking-wide text-white/50">Mini yardımcı ipuçları</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/75">
                {helperTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>

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

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-neon px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          {isPending ? 'Çalıştırılıyor...' : 'Çalıştır'}
        </button>
      </div>
    </form>
  );
}
