'use client';

import { useEffect, useMemo, useState } from 'react';

import { ChatThread, type ChatMessage } from '@/components/workspace/chat-thread';
import { OutputEditor } from '@/components/workspace/output-editor';
import { RunHistory, type WorkspaceRunItem } from '@/components/workspace/run-history';
import { TaskComposer } from '@/components/workspace/task-composer';
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

type MobileTab = 'gorev' | 'sonuc' | 'gecmis';

function toChatMessages(run: WorkspaceRunItem): ChatMessage[] {
  const baseTime = run.created_at;
  const messages: ChatMessage[] = [
    {
      id: `${run.id}-user`,
      role: 'user',
      content: run.user_input,
      createdAt: baseTime,
    },
  ];

  if (run.result_text) {
    messages.push({
      id: `${run.id}-assistant`,
      role: 'assistant',
      content: run.result_text,
      createdAt: baseTime,
    });
  }

  return messages;
}

export default function WorkspacePage({ params }: { params: { type: string } }) {
  const [agent, setAgent] = useState<AgentTypeRow | null>(null);
  const [history, setHistory] = useState<WorkspaceRunItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('gorev');

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError('');

      try {
        const supabase = createBrowserSupabase();

        const [{ data: agentData, error: agentError }, { data: historyData, error: historyError }] = await Promise.all([
          supabase
            .from('agent_types')
            .select('id, slug, name, icon, description, placeholder, is_active')
            .eq('slug', params.type)
            .eq('is_active', true)
            .maybeSingle(),
          supabase
            .from('agent_runs')
            .select('id, created_at, status, user_input, result_text')
            .eq('agent_type', params.type)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        if (agentError || historyError) {
          setError(agentError?.message ?? historyError?.message ?? 'Workspace yüklenemedi.');
          return;
        }

        if (!agentData) {
          setError('Agent bulunamadı veya aktif değil.');
          return;
        }

        const mappedHistory = (historyData ?? []) as WorkspaceRunItem[];

        setAgent(agentData as AgentTypeRow);
        setHistory(mappedHistory);

        if (mappedHistory.length > 0) {
          const latest = mappedHistory[0];
          setMessages(toChatMessages(latest));
          setTaskInput(latest.user_input);
          setLastPrompt(latest.user_input);
          setEditorContent(latest.result_text ?? '');
          setActiveRunId(latest.id);
          if (latest.result_text) {
            setSaveTitle(`${(agentData as AgentTypeRow).name} - ${new Date().toLocaleString('tr-TR')}`);
          }
        }

        window.localStorage.setItem('koschei:last-agent-type', params.type);
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : 'Workspace açılamadı.');
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [params.type]);

  async function executeRun(prompt: string) {
    setRunning(true);
    setError('');
    setSaveStatus('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const data = await postJsonWithSession<AgentRunResponse, { type: string; userInput: string }>('/api/agents/run', {
        type: params.type,
        userInput: prompt,
      });

      const resultText = data.result ?? 'Boş sonuç döndü.';

      const assistantMessage: ChatMessage = {
        id: `assistant-${data.runId ?? Date.now()}`,
        role: 'assistant',
        content: resultText,
        createdAt: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);
      setEditorContent(resultText);
      setLastPrompt(prompt);
      setTaskInput(prompt);
      setActiveRunId(data.runId ?? null);

      if (agent) {
        setSaveTitle(`${agent.name} - ${new Date().toLocaleString('tr-TR')}`);
      }

      const supabase = createBrowserSupabase();
      const { data: refreshedRuns, error: refreshError } = await supabase
        .from('agent_runs')
        .select('id, created_at, status, user_input, result_text')
        .eq('agent_type', params.type)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!refreshError) {
        setHistory((refreshedRuns ?? []) as WorkspaceRunItem[]);
      }
    } catch (runError) {
      if (runError instanceof ApiRequestError) {
        setError(runError.message);
      } else {
        setError(runError instanceof Error ? runError.message : 'Çalıştırma sırasında hata oluştu.');
      }
    } finally {
      setRunning(false);
    }
  }

  async function handleSave(content: string) {
    if (!activeRunId || content.trim().length === 0) {
      setSaveStatus('Kaydetmek için önce bir sonuç üretin.');
      return;
    }

    setSaving(true);
    setSaveStatus('');

    try {
      await postJsonWithSession<{ saved: { id: string } }, { runId: string; title: string; content: string }>('/api/outputs/save', {
        runId: activeRunId,
        title: saveTitle,
        content,
      });

      setSaveStatus('Çıktı kaydedildi.');
    } catch (saveError) {
      if (saveError instanceof ApiRequestError) {
        setSaveStatus(saveError.message);
      } else {
        setSaveStatus(saveError instanceof Error ? saveError.message : 'Kaydetme sırasında hata oluştu.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(content: string) {
    if (content.trim().length === 0) {
      setSaveStatus('Kopyalanacak içerik yok.');
      return;
    }

    await navigator.clipboard.writeText(content);
    setSaveStatus('İçerik panoya kopyalandı.');
  }

  const tabs = useMemo(
    () => [
      { id: 'gorev' as const, label: 'Görev' },
      { id: 'sonuc' as const, label: 'Sonuç' },
      { id: 'gecmis' as const, label: 'Geçmiş' },
    ],
    [],
  );

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-xs uppercase tracking-wide text-indigo-300">Çalışma Alanı</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">
          {agent?.icon ?? '🤖'} {agent?.name ?? 'Agent Workspace'}
        </h1>
        <p className="mt-2 text-sm text-zinc-300">
          {agent?.description ?? 'Görevi yazın, sonucu konuşma akışında takip edin ve sağ panelde düzenleyip kaydedin.'}
        </p>
      </header>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="mb-1 flex gap-2 md:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveMobileTab(tab.id)}
            className={`rounded-lg px-3 py-2 text-sm ${activeMobileTab === tab.id ? 'bg-indigo-500 text-white' : 'border border-zinc-700 text-zinc-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        <aside className={`space-y-4 md:col-span-3 ${activeMobileTab !== 'gecmis' ? 'hidden md:block' : ''}`}>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
            <h2 className="text-sm font-medium text-zinc-200">Agent Özeti</h2>
            <p className="mt-2 text-sm text-zinc-300">Tip: {agent?.slug ?? '-'}</p>
            <p className="mt-1 text-sm text-zinc-400">Toplam son çalışma: {history.length}</p>
          </section>
          <RunHistory
            runs={history}
            activeRunId={activeRunId}
            onSelect={(run) => {
              setTaskInput(run.user_input);
              setLastPrompt(run.user_input);
              setEditorContent(run.result_text ?? '');
              setMessages(toChatMessages(run));
              setActiveRunId(run.id);
              setActiveMobileTab('gorev');
            }}
            onRerun={(run) => {
              setTaskInput(run.user_input);
              setLastPrompt(run.user_input);
              void executeRun(run.user_input);
            }}
          />
        </aside>

        <main className={`space-y-4 md:col-span-4 ${activeMobileTab === 'sonuc' || activeMobileTab === 'gecmis' ? 'hidden md:block' : ''}`}>
          <ChatThread messages={messages} loading={loading} />
          <TaskComposer
            value={taskInput}
            onChange={setTaskInput}
            onSubmit={() => {
              if (!running && taskInput.trim().length > 0) {
                void executeRun(taskInput.trim());
              }
            }}
            isRunning={running}
            placeholder={agent?.placeholder ?? undefined}
            lastPrompt={lastPrompt}
            onUseLastPrompt={() => setTaskInput(lastPrompt)}
          />
        </main>

        <aside className={`md:col-span-5 ${activeMobileTab === 'gorev' || activeMobileTab === 'gecmis' ? 'hidden md:block' : ''}`}>
          <OutputEditor
            initialContent={editorContent}
            saveTitle={saveTitle}
            onTitleChange={setSaveTitle}
            onSave={(content) => {
              void handleSave(content);
            }}
            onContentAutosave={setEditorContent}
            onCopy={handleCopy}
            onClear={() => {
              setEditorContent('');
              setSaveStatus('Editör içeriği temizlendi.');
            }}
            saving={saving}
            saveStatus={saveStatus}
          />
        </aside>
      </div>
    </section>
  );
}
