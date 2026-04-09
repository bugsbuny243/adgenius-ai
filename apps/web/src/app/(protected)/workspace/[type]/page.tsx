'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { resolveWorkspaceContext } from '@/lib/workspace';

type StreamLog = {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'error';
  message: string;
  createdAt: string;
};

type WsIncomingMessage =
  | { type: 'ack'; status: string }
  | { type: 'stream'; chunk: string }
  | { type: 'done'; status: string; output_preview?: string }
  | { type: 'error'; message?: string; details?: unknown };

type SessionContext = {
  userId: string;
  workspaceId: string;
};

const DEFAULT_WS_URL = 'ws://localhost:8000/ws/agent';
const DEFAULT_PREVIEW_DOC = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Koschei Live Preview</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        padding: 24px;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        background: #09090b;
        color: #f4f4f5;
      }
      .placeholder {
        border: 1px dashed #3f3f46;
        border-radius: 16px;
        padding: 20px;
        background: #18181b;
      }
    </style>
  </head>
  <body>
    <div class="placeholder">
      <h2>Live Preview hazır</h2>
      <p>Soldan prompt gönderdiğinde stream edilen HTML/CSS/JS burada canlı render edilir.</p>
    </div>
  </body>
</html>`;

function getWsEndpoint(): string {
  const value = process.env.NEXT_PUBLIC_AGENT_WS_URL?.trim();
  return value && value.length > 0 ? value : DEFAULT_WS_URL;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Beklenmeyen bir hata oluştu.';
}

function isWsIncomingMessage(value: unknown): value is WsIncomingMessage {
  return typeof value === 'object' && value !== null && 'type' in value;
}

export default function WorkspaceDualPanePage({ params }: { params: { type: string } }) {
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const [prompt, setPrompt] = useState('');
  const [streamedCode, setStreamedCode] = useState('');
  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const websocketRef = useRef<WebSocket | null>(null);
  const runIndexRef = useRef(0);

  const wsEndpoint = useMemo(() => getWsEndpoint(), []);
  const previewDoc = streamedCode.trim().length > 0 ? streamedCode : DEFAULT_PREVIEW_DOC;

  const appendLog = useCallback((role: StreamLog['role'], message: string) => {
    const createdAt = new Date().toISOString();

    setLogs((current) => [
      ...current,
      {
        id: `${createdAt}-${current.length + 1}`,
        role,
        message,
        createdAt,
      },
    ]);
  }, []);

  useEffect(() => {
    async function loadContext() {
      setIsLoadingContext(true);

      try {
        const supabase = createBrowserSupabase();
        const context = await resolveWorkspaceContext(supabase);

        setSessionContext({
          userId: context.user.id,
          workspaceId: context.workspace.id,
        });

        appendLog('system', `Workspace hazır • agent tipi: ${params.type}`);
      } catch (error) {
        appendLog('error', `Context yüklenemedi: ${toErrorMessage(error)}`);
      } finally {
        setIsLoadingContext(false);
      }
    }

    void loadContext();
  }, [appendLog, params.type]);

  useEffect(() => {
    return () => {
      websocketRef.current?.close();
      websocketRef.current = null;
    };
  }, []);

  async function runWorkspacePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionContext || isRunning || prompt.trim().length === 0) {
      return;
    }

    runIndexRef.current += 1;
    const currentRun = runIndexRef.current;

    setIsRunning(true);
    setStreamedCode('');

    appendLog('user', prompt.trim());
    appendLog('system', `WebSocket bağlanıyor: ${wsEndpoint}`);

    websocketRef.current?.close();

    const ws = new WebSocket(wsEndpoint);
    websocketRef.current = ws;

    ws.onopen = () => {
      const payload = {
        prompt: prompt.trim(),
        workspace_id: sessionContext.workspaceId,
        user_id: sessionContext.userId,
      };

      ws.send(JSON.stringify(payload));
      appendLog('system', 'Prompt gönderildi. Stream bekleniyor...');
    };

    ws.onmessage = (messageEvent) => {
      try {
        const parsed: unknown = JSON.parse(String(messageEvent.data));

        if (!isWsIncomingMessage(parsed)) {
          appendLog('error', 'Bilinmeyen WebSocket mesajı alındı.');
          return;
        }

        if (parsed.type === 'ack') {
          appendLog('system', `ACK alındı: ${parsed.status}`);
          return;
        }

        if (parsed.type === 'stream') {
          setStreamedCode((current) => `${current}${parsed.chunk}`);
          appendLog('assistant', parsed.chunk);
          return;
        }

        if (parsed.type === 'done') {
          appendLog('system', `Çalıştırma tamamlandı: ${parsed.status}`);
          if (runIndexRef.current === currentRun) {
            setIsRunning(false);
          }
          ws.close();
          return;
        }

        if (parsed.type === 'error') {
          appendLog('error', parsed.message ?? 'WebSocket hata mesajı alındı.');
          if (runIndexRef.current === currentRun) {
            setIsRunning(false);
          }
          ws.close();
        }
      } catch {
        appendLog('error', 'WebSocket mesajı parse edilemedi.');
      }
    };

    ws.onerror = () => {
      appendLog('error', 'WebSocket bağlantısında hata oluştu.');
      if (runIndexRef.current === currentRun) {
        setIsRunning(false);
      }
    };

    ws.onclose = () => {
      if (runIndexRef.current === currentRun) {
        setIsRunning(false);
      }
      if (websocketRef.current === ws) {
        websocketRef.current = null;
      }
    };
  }

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-xs uppercase tracking-wide text-indigo-300">Generative Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">{params.type} • Split-Screen</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Sol panelde prompt + stream log, sağ panelde canlı iframe önizleme.
        </p>
      </header>

      <div className="grid min-h-[calc(100vh-220px)] grid-cols-1 gap-4 xl:grid-cols-2">
        <aside className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-200">The Brain • Task Composer & Logs</h2>

          <form onSubmit={runWorkspacePrompt} className="space-y-3">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              placeholder="UI üretimi için prompt gir. Örn: Hero + pricing + CTA içeren modern bir landing sayfası üret."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring"
              disabled={isLoadingContext || isRunning}
            />
            <button
              type="submit"
              disabled={isLoadingContext || isRunning || prompt.trim().length === 0}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isRunning ? 'Streaming...' : 'Çalıştır'}
            </button>
          </form>

          <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Visual Log (Thought Process + Raw Stream)</p>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-700 p-3 text-sm text-zinc-400">
                  Henüz log yok. Prompt gönderince stream adımları burada görünür.
                </p>
              ) : (
                logs.map((log) => (
                  <article
                    key={log.id}
                    className={`rounded-lg border p-2 text-sm ${
                      log.role === 'user'
                        ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-100'
                        : log.role === 'assistant'
                          ? 'border-zinc-700 bg-zinc-900/70 text-zinc-100'
                          : log.role === 'error'
                            ? 'border-rose-700/60 bg-rose-950/30 text-rose-200'
                            : 'border-zinc-700/60 bg-zinc-900/60 text-zinc-300'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{log.message}</p>
                    <p className="mt-1 text-[11px] opacity-70">{new Date(log.createdAt).toLocaleTimeString('tr-TR')}</p>
                  </article>
                ))
              )}
            </div>

            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Aggregated Code</p>
              <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">{streamedCode || '// Stream edilen kod burada birikir.'}</pre>
            </div>
          </div>
        </aside>

        <section className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-200">The Canvas • Live Preview</h2>
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
            <iframe
              title="live-preview"
              sandbox="allow-scripts"
              srcDoc={previewDoc}
              className="h-full min-h-[480px] w-full bg-white"
            />
          </div>
        </section>
      </div>
    </section>
  );
}
