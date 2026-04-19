'use client';

import { useMemo, useState } from 'react';
import { sanitizeUserFacingEngineLabel } from '@/lib/publish-queue';

type AgentTypeRelation = { name?: string | null; slug?: string | null } | Array<{ name?: string | null; slug?: string | null }> | null;

type RunItem = {
  id: string;
  status: string;
  model_name: string | null;
  user_input: string | null;
  created_at: string;
  error_message?: string | null;
  completed_at?: string | null;
  agent_type_id?: string | null;
  agent_types?: AgentTypeRelation;
};

function getAgentLabel(agentTypes: AgentTypeRelation | undefined): string {
  if (!agentTypes) return 'Bilinmeyen agent';
  const row = Array.isArray(agentTypes) ? agentTypes[0] : agentTypes;
  return row?.name || row?.slug || 'Bilinmeyen agent';
}

export function RunsList({ runs }: { runs: RunItem[] }) {
  const [status, setStatus] = useState('all');
  const [agent, setAgent] = useState('all');
  const [limit, setLimit] = useState(20);
  const [active, setActive] = useState<RunItem | null>(null);

  const agents = useMemo(() => {
    return Array.from(new Set(runs.map((run) => getAgentLabel(run.agent_types)))).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [runs]);

  const filtered = useMemo(() => {
    return runs.filter((run) => {
      const statusOk = status === 'all' ? true : run.status === status;
      const agentOk = agent === 'all' ? true : getAgentLabel(run.agent_types) === agent;
      return statusOk && agentOk;
    });
  }, [runs, status, agent]);

  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
          <option value="all">Durum: Tümü</option>
          <option value="completed">Tamamlandı</option>
          <option value="processing">İşleniyor</option>
          <option value="pending">Bekliyor</option>
          <option value="failed">Hata</option>
        </select>

        <select value={agent} onChange={(e) => setAgent(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
          <option value="all">Agent: Tümü</option>
          {agents.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {visible.map((run) => (
        <div key={run.id} className="rounded-lg border border-white/10 p-3">
          <p>Durum: {run.status}</p>
          <p className="text-white/70">Agent: {getAgentLabel(run.agent_types)}</p>
          <p className="text-white/70">Çalışma motoru: {sanitizeUserFacingEngineLabel(run.model_name)}</p>
          <p className="text-white/70">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
          <button onClick={() => setActive(run)} className="mt-2 rounded border border-white/20 px-2 py-1">Detay</button>
        </div>
      ))}

      {visible.length < filtered.length ? (
        <button onClick={() => setLimit((current) => current + 20)} className="rounded border border-white/20 px-3 py-1.5 text-sm">
          Daha fazla yükle
        </button>
      ) : null}

      {active ? (
        <dialog open className="max-w-xl rounded-xl border border-white/20 bg-ink p-4 text-white">
          <h4 className="mb-2 text-lg">Run Detayı</h4>
          <p className="mb-2 text-xs text-white/60">ID: {active.id}</p>
          <p className="mb-2 text-xs text-white/60">Agent: {getAgentLabel(active.agent_types)}</p>
          <p className="mb-2 text-xs text-white/60">Oluşturulma: {new Date(active.created_at).toLocaleString('tr-TR')}</p>
          {active.completed_at ? <p className="mb-2 text-xs text-white/60">Tamamlanma: {new Date(active.completed_at).toLocaleString('tr-TR')}</p> : null}
          <p className="text-sm">Prompt:</p>
          <pre className="whitespace-pre-wrap text-sm text-white/80">{active.user_input ?? '-'}</pre>
          {active.error_message ? <p className="mt-2 text-xs text-red-200">Hata: {active.error_message}</p> : null}
          <button onClick={() => setActive(null)} className="mt-3 rounded border border-white/20 px-3 py-1">Kapat</button>
        </dialog>
      ) : null}
    </div>
  );
}
