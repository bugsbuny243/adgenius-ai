'use client';

import { useEffect, useMemo, useState } from 'react';

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

type RouteParams = { type: string } | Promise<{ type: string }>;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function writeMarkdownAsHTML(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (const rawLine of lines) {
    const line = escapeHtml(rawLine);

    if (line.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`;
      continue;
    }

    if (inList) {
      html += '</ul>';
      inList = false;
    }

    if (line.startsWith('## ')) {
      html += `<h2>${line.slice(3).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</h2>`;
      continue;
    }

    html += `${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}<br/>`;
  }

  if (inList) {
    html += '</ul>';
  }

  return html;
}

async function resolveRouteType(params: RouteParams): Promise<string> {
  const resolved = await Promise.resolve(params);
  return resolved.type;
}

export default function AgentRunPage({ params }: { params: RouteParams }) {
  const [type, setType] = useState('');
  const [agent, setAgent] = useState<AgentTypeRow | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saveTitle, setSaveTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const resolvedType = await resolveRouteType(params);
      setType(resolvedType);
    })();
  }, [params]);

  useEffect(() => {
    if (!type) {
      return;
    }

    async function loadAgent(): Promise<void> {
      setError('');
      setLoadingAgent(true);
      try {
        const supabase = createBrowserSupabase();
        const { data, error: loadError } = await supabase
          .from('agent_types')
          .select('id, slug, name, icon, description, placeholder, is_active')
          .eq('slug', type)
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
  }, [type]);

  async function onRun(): Promise<void> {
    setError('');
    setSaveStatus('');
    setResult('');
    setRunId(null);
    setRunning(true);

    try {
      const data = await postJsonWithSession<AgentRunResponse, { type: string; userInput: string }>('/api/agents/run', {
        type,
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

  async function onSave(): Promise<void> {
    if (!runId || !result.trim()) {
      setSaveStatus('Kaydedilecek bir çıktı bulunamadı.');
      return;
    }

    setSaving(true);
    setSaveStatus('');

    try {
      await postJsonWithSession<{ saved: { id: string } }, { runId: string; title: string; content: string }>('/api/outputs/save', {
        runId,
        title: saveTitle,
        content: result,
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

  async function onCopy(): Promise<void> {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const remainingCount = 2000 - input.length;
  const renderedResult = useMemo(() => writeMarkdownAsHTML(result), [result]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {agent?.icon ?? '🤖'} {agent?.name ?? 'Agent'}
        </h1>
        <p className="text-zinc-300">{agent?.description ?? (loadingAgent ? 'Agent yükleniyor...' : 'Agent bilgisi bulunamadı.')}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-zinc-300" htmlFor="agent-input">
          Görevini yaz
        </label>
        <textarea
          id="agent-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              if (!running && input.trim().length > 0 && agent && input.length <= 2000) {
                void onRun();
              }
            }
          }}
          placeholder={agent?.placeholder ?? 'Görevini yaz...'}
          rows={7}
          className={`w-full rounded-xl border bg-zinc-950 px-4 py-3 text-sm outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring ${
            input.length > 2000 ? 'border-rose-500' : 'border-zinc-700'
          }`}
        />
        <p className={`text-xs ${remainingCount < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>{input.length} / 2000 karakter</p>
      </div>

      <button
        type="button"
        onClick={() => void onRun()}
        disabled={running || input.trim().length === 0 || !agent || input.length > 2000}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {running ? 'Çalıştırılıyor...' : 'Çalıştır'}
      </button>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">Sonuç</h2>
          {result ? (
            <button
              type="button"
              onClick={() => void onCopy()}
              className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-zinc-500"
            >
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          ) : null}
        </div>
        <div className="max-h-[500px] overflow-y-auto text-sm text-zinc-200">
          {result ? (
            <div
              className="space-y-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: renderedResult }}
            />
          ) : (
            <p>Henüz bir sonuç yok.</p>
          )}
        </div>
      </div>

      {result ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-200">Kaydet</h3>
          <input
            type="text"
            value={saveTitle}
            onChange={(event) => setSaveTitle(event.target.value)}
            placeholder="Başlık (opsiyonel)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
          />
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || !runId}
            className="mt-3 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          {saveStatus ? <p className="mt-2 text-sm text-zinc-300">{saveStatus}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
