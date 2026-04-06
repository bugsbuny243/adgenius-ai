'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { ApiRequestError, postJsonWithSession } from '@/lib/api-client';
import { createBrowserSupabase } from '@/lib/supabase/client';

type AgentTypeRow = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  placeholder: string | null;
  is_active: boolean;
};

type AgentRunResponse = {
  result?: string;
  runId?: string;
  error?: string;
};

const SAMPLE_PROMPTS = [
  'Bu hafta LinkedIn için 5 içerik fikri üret.',
  'Aynı metni daha kısa ve daha ikna edici yaz.',
  'Bu çıktıyı 3 farklı hedef kitleye göre yeniden düzenle.',
];

const DRAFT_PREFIX = 'koschei:agent-draft:';

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderInlineMarkdown(text: string) {
  let output = text;
  output = output.replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 rounded text-xs">$1</code>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return output;
}

function renderMarkdown(text: string): string {
  const lines = escapeHtml(text).split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc pl-5 space-y-1">');
        inList = true;
      }
      htmlParts.push(`<li>${renderInlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }

    if (line.trim().length === 0) {
      htmlParts.push('<br/>');
      continue;
    }

    htmlParts.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  if (inList) {
    htmlParts.push('</ul>');
  }

  return htmlParts.join('');
}

export default function AgentRunPage({ params }: { params: { type: string } }) {
  const searchParams = useSearchParams();
  const [agent, setAgent] = useState<AgentTypeRow | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [projectName, setProjectName] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [copied, setCopied] = useState(false);
  const draftKey = `${DRAFT_PREFIX}${params.type}`;

  useEffect(() => {
    async function loadAgent() {
      setError('');
      setLoadingAgent(true);
      try {
        const supabase = createBrowserSupabase();
        const { data, error: loadError } = await supabase
          .from('agent_types')
          .select('id, slug, name, icon, description, placeholder, is_active')
          .eq('slug', params.type)
          .eq('is_active', true)
          .maybeSingle();

        if (loadError) {
          setError(`Agent bilgisi alınamadı: ${loadError.message}`);
          return;
        }

        if (!data) {
          setError('Agent türü bulunamadı veya aktif değil.');
          return;
        }

        setAgent(data);
      } catch (loadErr) {
        setError(loadErr instanceof Error ? loadErr.message : 'Agent bilgisi yüklenemedi.');
      } finally {
        setLoadingAgent(false);
      }
    }

    void loadAgent();
  }, [params.type]);

  useEffect(() => {
    const promptFromQuery = searchParams.get('prompt')?.trim();
    if (promptFromQuery) {
      setInput(promptFromQuery);
      return;
    }

    const draft = window.localStorage.getItem(draftKey);
    if (draft?.trim()) {
      setInput(draft);
    }
  }, [searchParams, draftKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, input);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [input, draftKey]);

  async function onRun() {
    setError('');
    setSaveStatus('');
    setResult('');
    setRunId(null);
    setCopied(false);
    setRunning(true);

    try {
      const data = await postJsonWithSession<AgentRunResponse, { type: string; userInput: string }>('/api/agents/run', {
        type: params.type,
        userInput: input,
      });

      setResult(data.result ?? 'AI engine boş yanıt döndürdü.');
      setRunId(data.runId ?? null);
      setSaveTitle('');
    } catch (runError) {
      if (runError instanceof ApiRequestError) {
        setError(runError.message);
        return;
      }

      setError(runError instanceof Error ? runError.message : 'Çalıştırma sırasında hata oluştu.');
    } finally {
      setRunning(false);
    }
  }

  async function onSave() {
    if (!runId || !result.trim()) {
      setSaveStatus('Kaydedilecek bir çıktı bulunamadı.');
      return;
    }

    setSaving(true);
    setSaveStatus('');

    try {
      await postJsonWithSession<{ saved: { id: string } }, { runId: string; title: string; content: string; projectName?: string }>('/api/outputs/save', {
        runId,
        title: saveTitle,
        content: result,
        projectName: projectName.trim() || undefined,
      });

      setSaveStatus('Çıktı kaydedildi.');
    } catch (saveError) {
      if (saveError instanceof ApiRequestError) {
        setSaveStatus(saveError.message);
        return;
      }

      setSaveStatus(saveError instanceof Error ? saveError.message : 'Kaydetme sırasında hata oluştu.');
    } finally {
      setSaving(false);
    }
  }

  async function onCopy() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  const hint = useMemo(() => {
    const source = searchParams.get('source');
    if (source === 'rerun' || source === 'saved-rerun') {
      return 'Önceki çalışmadan gelen prompt yüklendi.';
    }
    return '';
  }, [searchParams]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {agent?.icon ?? '🤖'} {agent?.name ?? 'Agent'}
        </h1>
        <p className="text-zinc-300">{agent?.description ?? (loadingAgent ? 'Agent yükleniyor...' : 'Agent bilgisi bulunamadı.')}</p>
        {hint ? <p className="mt-2 text-xs text-emerald-300">{hint}</p> : null}
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm text-zinc-300" htmlFor="agent-input">
            Görevini yaz
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setInput('')} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
              Temizle
            </button>
            <button
              type="button"
              onClick={() => {
                const draft = window.localStorage.getItem(draftKey) ?? '';
                setInput(draft);
              }}
              className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300"
            >
              Son draftı yükle
            </button>
          </div>
        </div>
        <textarea
          id="agent-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !running) {
              void onRun();
            }
          }}
          placeholder={agent?.placeholder ?? 'Görevini yaz...'}
          rows={7}
          maxLength={2000}
          className={`w-full rounded-xl border bg-zinc-950 px-4 py-3 text-sm outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring ${input.length >= 2000 ? 'border-rose-500' : 'border-zinc-700'}`}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-right text-xs ${input.length >= 2000 ? 'text-rose-400' : 'text-zinc-400'}`}>{input.length} / 2000</p>
          <button
            type="button"
            onClick={onRun}
            disabled={running || input.trim().length === 0 || !agent}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {running ? 'Çalıştırılıyor...' : 'Çalıştır'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button key={prompt} type="button" onClick={() => setInput(prompt)} className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="max-h-96 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-400">Sonuç</h2>
        {result ? <div className="text-sm text-zinc-200" dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }} /> : <p className="text-sm text-zinc-200">Henüz bir sonuç yok.</p>}
      </div>

      {result ? (
        <div className="rounded-xl border border-emerald-700/30 bg-zinc-950/70 p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-200">Run tamamlandı</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={saveTitle}
              onChange={(event) => setSaveTitle(event.target.value)}
              placeholder="Kaydetme başlığı (opsiyonel)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Proje adı (opsiyonel)"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onSave} disabled={saving || !runId} className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400 disabled:opacity-60">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button type="button" onClick={() => {
              void onCopy();
            }} className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400">
              {copied ? 'Kopyalandı ✓' : 'Kopyala'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!projectName.trim()) {
                  setSaveStatus('Projeye eklemek için önce proje adı girin.');
                  return;
                }
                void onSave();
              }}
              className="rounded-lg border border-indigo-500/50 px-4 py-2 text-sm text-indigo-200 hover:border-indigo-400"
            >
              Projeye Ekle
            </button>
          </div>
          {saveStatus ? <p className="mt-2 text-sm text-zinc-300">{saveStatus}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
