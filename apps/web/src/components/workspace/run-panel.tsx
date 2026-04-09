"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ResponseState = { runId: string; text: string } | { error: string } | null;

export const RunPanel = () => {
  const [workspaceId, setWorkspaceId] = useState("");
  const [userId, setUserId] = useState("");
  const [agentSlug, setAgentSlug] = useState("campaign-strategist");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ResponseState>(null);

  const runAgent = async () => {
    setLoading(true);
    setResponse(null);

    const result = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, userId, userInput: prompt, agentSlug })
    });

    const payload = (await result.json()) as { runId?: string; text?: string; error?: string };

    setLoading(false);

    if (!result.ok || payload.error) {
      setResponse({ error: payload.error ?? "İstek başarısız." });
      return;
    }

    setResponse({ runId: payload.runId ?? "", text: payload.text ?? "" });
  };

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="text-lg font-semibold">Ajan Çalıştır</h2>
      <p className="mt-1 text-sm text-slate-300">Çıktılar doğrudan çalışma alanınıza kaydedilir.</p>

      <div className="mt-4 grid gap-3">
        <input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} placeholder="Workspace UUID" className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm" />
        <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="User UUID" className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm" />
        <input value={agentSlug} onChange={(event) => setAgentSlug(event.target.value)} placeholder="Ajan slug" className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm" />
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Görevinizi yazın" className="h-32 rounded-xl border border-white/15 bg-black/25 p-3 text-sm" />
        <Button onClick={runAgent} disabled={loading || !workspaceId || !userId || !prompt}>
          {loading ? "Çalışıyor..." : "Çalıştır"}
        </Button>
      </div>

      {response && "error" in response ? <p className="mt-4 text-sm text-rose-300">{response.error}</p> : null}
      {response && "runId" in response ? (
        <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm">
          <p className="mb-2 text-cyan-200">Run ID: {response.runId}</p>
          <pre className="whitespace-pre-wrap text-slate-100">{response.text}</pre>
        </div>
      ) : null}
    </section>
  );
};
