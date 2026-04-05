'use client';

import { useState } from 'react';

import { getAgentByType } from '@/lib/agents';

type AgentRunResponse = {
  result: string;
  error?: string;
};

export default function AgentRunPage({ params }: { params: { type: string } }) {
  const agent = getAgentByType(params.type);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  if (!agent) {
    return <p>Agent bulunamadı.</p>;
  }

  async function onRun() {
    if (!agent) {
      return;
    }

    setError('');
    setRunning(true);

    const response = await fetch('/api/agents/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt: agent.systemPrompt,
        userInput: input,
      }),
    });

    const data = (await response.json()) as AgentRunResponse;

    if (!response.ok || data.error) {
      setError(data.error ?? 'Çalıştırma sırasında bir hata oluştu.');
      setRunning(false);
      return;
    }

    setResult(data.result);
    setRunning(false);
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {agent.icon} {agent.name}
        </h1>
        <p className="text-zinc-300">{agent.description}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-zinc-300" htmlFor="agent-input">
          Görev
        </label>
        <textarea
          id="agent-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={agent.placeholder}
          rows={7}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring"
        />
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={running || input.trim().length === 0}
        className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {running ? 'Çalıştırılıyor...' : 'Agentı Çalıştır'}
      </button>

      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</p> : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-400">Sonuç</h2>
        <p className="whitespace-pre-wrap text-sm text-zinc-200">
          {result || 'Henüz bir sonuç yok. Görevinizi girip agentı çalıştırın.'}
        </p>
      </div>
    </section>
  );
}
