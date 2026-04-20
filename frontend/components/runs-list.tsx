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

function statusLabel(status: string): string {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'pending') return 'Sırada';
  if (status === 'failed') return 'Başarısız';
  return status;
}

export function RunsList({ runs }: { runs: RunItem[] }) {
  const [status, setStatus] = useState('all');
  const [agent, setAgent] = useState('all');
  const [limit, setLimit] = useState(20);
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week'>('all');
  const [active, setActive] = useState<RunItem | null>(null);

  const agents = useMemo(() => Array.from(new Set(runs.map((run) => getAgentLabel(run.agent_types)))).sort((a, b) => a.localeCompare(b, 'tr')), [runs]);

  const filtered = useMemo(
    () =>
      runs.filter((run) => {
        const byStatus = status === 'all' || run.status === status;
        const byAgent = agent === 'all' || getAgentLabel(run.agent_types) === agent;
        const createdTime = new Date(run.created_at).getTime();
        const now = Date.now();
        const byDate =
          dateRange === 'all' ||
          (dateRange === 'today' && now - createdTime <= 24 * 60 * 60 * 1000) ||
          (dateRange === 'week' && now - createdTime <= 7 * 24 * 60 * 60 * 1000);
        return byStatus && byAgent && byDate;
      }),
    [runs, status, agent, dateRange]
  );

  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
          <option value="all">Durum: Tümü</option>
          <option value="completed">Tamamlandı</option>
          <option value="processing">İşleniyor</option>
          <option value="pending">Bekliyor</option>
          <option value="failed">Başarısız</option>
        </select>

        <select value={agent} onChange={(e) => setAgent(e.target.value)} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
          <option value="all">Agent: Tümü</option>
          {agents.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value as 'all' | 'today' | 'week')} className="rounded-lg border border-white/20 bg-black/30 px-3 py-2">
          <option value="all">Tarih: Tümü</option>
          <option value="today">Son 24 saat</option>
          <option value="week">Son 7 gün</option>
        </select>
      </div>

      {visible.map((run) => (
        <div key={run.id} className="rounded-lg border border-white/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{getAgentLabel(run.agent_types)}</p>
            <span className="rounded border border-white/20 px-2 py-0.5 text-xs">{statusLabel(run.status)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-white/70">{(run.user_input ?? 'İstem kaydı yok.').slice(0, 260)}</p>
          <p className="mt-1 text-xs text-white/60">{new Date(run.created_at).toLocaleString('tr-TR')} • {sanitizeUserFacingEngineLabel(run.model_name)}</p>
          <button onClick={() => setActive(run)} className="mt-2 rounded border border-white/20 px-2 py-1 hover:border-neon">Detay</button>
        </div>
      ))}

      {visible.length < filtered.length ? (
        <button onClick={() => setLimit((current) => current + 20)} className="rounded border border-white/20 px-3 py-1.5 text-sm hover:border-neon">
          Daha fazla yükle
        </button>
      ) : null}

      {active ? (
        <dialog open className="max-w-xl rounded-xl border border-white/20 bg-ink p-4 text-white">
          <h4 className="mb-2 text-lg">Run Detayı</h4>
          <p className="mb-2 text-xs text-white/60">ID: {active.id}</p>
          <p className="mb-2 text-xs text-white/60">Durum: {statusLabel(active.status)}</p>
          <p className="mb-2 text-xs text-white/60">Agent: {getAgentLabel(active.agent_types)}</p>
          <p className="mb-2 text-xs text-white/60">Motor: {sanitizeUserFacingEngineLabel(active.model_name)}</p>
          <p className="text-sm">İstem:</p>
          <pre className="whitespace-pre-wrap text-sm text-white/80">{active.user_input ?? '-'}</pre>
          {active.error_message ? <p className="mt-2 text-xs text-red-200">Hata: {active.error_message}</p> : null}
          <button onClick={() => setActive(null)} className="mt-3 rounded border border-white/20 px-3 py-1">Kapat</button>
        </dialog>
      ) : null}
    </div>
  );
}
