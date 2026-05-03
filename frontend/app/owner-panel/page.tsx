'use client';

import { AlertTriangle, CheckCircle2, Cpu, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';

type SummaryResponse = {
  users: Array<{ id: string; email: string | null; full_name: string | null; created_at: string }>;
  purchases: Array<{ id: string; user_id: string; package_name: string; amount: number | null; status: string; created_at: string; approved_at: string | null }>;
  pendingApprovals: Array<{ id: string; user_id: string; package_name: string; amount: number | null; created_at: string }>;
  metrics: { totalUsers: number; purchasedUsers: number; pendingCount: number; approvedCount: number };
  system: {
    recentErrors: Array<{ id: string; level: string; message: string; created_at: string }>;
    recentBuilds: Array<{ id: string; service: string; status: string; created_at: string }>;
  };
};

type GaugeProps = { label: string; value: number; hue: 'cyan' | 'pink' | 'green' };

export default function OwnerPanelPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  type GitCommit = { sha: string; commit?: { message?: string } };
  const [commits, setCommits] = useState<GitCommit[]>([]);

  async function refresh() {
    const [summaryRes, githubRes] = await Promise.all([
      fetch('/api/owner-panel/summary', { cache: 'no-store' }),
      fetch('/api/owner-panel/github', { cache: 'no-store' })
    ]);

    if (summaryRes.ok) setSummary(await summaryRes.json());
    if (githubRes.ok) {
      const payload = await githubRes.json();
      setCommits(payload.commits ?? []);
    }
  }

  async function approve(purchaseId: string) {
    await fetch('/api/owner-panel/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId })
    });

    await refresh();
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="relative mx-auto max-w-7xl space-y-5 overflow-hidden rounded-sm border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(0,242,255,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,75,209,0.12),transparent_30%),linear-gradient(160deg,#04050f_0%,#06091c_65%,#05070e_100%)] p-5">
      <h1 className="text-3xl font-bold tracking-wide text-zinc-100">Owner Command Center</h1>

      <section className="grid gap-3 md:grid-cols-8">
        <MetricCard className="md:col-span-2" delay={0} label="Toplam Üye" value={summary?.metrics.totalUsers ?? 0} />
        <MetricCard className="md:col-span-2" delay={1} label="Paket Alan" value={summary?.metrics.purchasedUsers ?? 0} />
        <MetricCard className="md:col-span-2" delay={2} label="Bekleyen" value={summary?.metrics.pendingCount ?? 0} />
        <MetricCard className="md:col-span-2" delay={3} label="Onaylı" value={summary?.metrics.approvedCount ?? 0} />
      </section>

      <section className="grid gap-3 md:grid-cols-8">
        <div className="module-card md:col-span-5" style={{ animationDelay: '160ms' }}>
          <h2 className="mb-2 text-sm uppercase tracking-[0.2em] text-neon/80">Manual Approval Queue</h2>
          <div className="overflow-auto rounded-sm border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-zinc-300">
                <tr><th className="p-2">User</th><th className="p-2">Paket</th><th className="p-2">Tutar</th><th className="p-2">Aksiyon</th></tr>
              </thead>
              <tbody>
                {summary?.pendingApprovals.map((purchase) => (
                  <tr key={purchase.id} className="border-t border-white/10">
                    <td className="p-2">{purchase.user_id}</td>
                    <td className="p-2">{purchase.package_name}</td>
                    <td className="p-2">{purchase.amount ?? '-'}</td>
                    <td className="p-2"><button className="rounded-sm border border-toxic/40 bg-toxic/10 px-3 py-1 text-toxic hover:shadow-[0_0_20px_-8px_rgba(132,255,61,0.9)]" onClick={() => approve(purchase.id)}>Onayla</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="module-card md:col-span-3" style={{ animationDelay: '240ms' }}>
          <h2 className="mb-3 text-sm uppercase tracking-[0.2em] text-cyberPink/80">Unity Build Gauges</h2>
          <div className="grid grid-cols-2 gap-3">
            <Gauge label="Stable" value={summary?.metrics.approvedCount ?? 0} hue="cyan" />
            <Gauge label="Queued" value={summary?.metrics.pendingCount ?? 0} hue="pink" />
            <Gauge label="Healthy" value={Math.max(0, (summary?.metrics.purchasedUsers ?? 0) - (summary?.metrics.pendingCount ?? 0))} hue="green" />
            <Gauge label="Load" value={summary?.metrics.totalUsers ?? 0} hue="cyan" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-8">
        <div className="module-card md:col-span-3" style={{ animationDelay: '320ms' }}>
          <h2 className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-300">Package Matrix</h2>
          <ul className="space-y-2 text-sm">
            {summary?.users.map((user) => {
              const pack = summary.purchases.find((purchase) => purchase.user_id === user.id);
              return (
                <li key={user.id} className="rounded-sm border border-white/10 bg-white/[0.03] p-2">
                  <div className="truncate font-medium text-zinc-100">{user.email ?? user.id}</div>
                  <div className="text-xs text-zinc-400">Paket: {pack?.package_name ?? 'Yok'} | Durum: {pack?.status ?? '-'}</div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="module-card relative md:col-span-5" style={{ animationDelay: '380ms' }}>
          <h2 className="mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-neon/80"><Radio className="h-4 w-4" />System Logs</h2>
          <div className="scanline-overlay pointer-events-none absolute inset-0 opacity-60" />
          <ul className="relative space-y-1 font-mono text-xs text-zinc-300">
            {summary?.system.recentErrors.map((row, idx) => (
              <li key={row.id} className="terminal-line flex items-start gap-2" style={{ animationDelay: `${idx * 80}ms` }}>
                <AlertTriangle className="mt-0.5 h-3 w-3 text-cyberPink" />[{row.level}] {row.message}
              </li>
            ))}
            {commits.slice(0, 5).map((commit, idx) => (
              <li key={commit.sha} className="terminal-line flex items-start gap-2" style={{ animationDelay: `${(idx + 4) * 80}ms` }}>
                <CheckCircle2 className="mt-0.5 h-3 w-3 text-toxic" />{commit.sha.slice(0, 7)} :: {commit.commit?.message}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, className, delay }: { label: string; value: number; className?: string; delay: number }) {
  return <div className={`module-card ${className ?? ''}`} style={{ animationDelay: `${delay * 80}ms` }}><div className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</div><div className="mt-1 text-3xl font-bold text-neon">{value}</div></div>;
}

function Gauge({ label, value, hue }: GaugeProps) {
  const bounded = Math.max(0, Math.min(100, value));
  const ring = hue === 'cyan' ? 'text-neon' : hue === 'pink' ? 'text-cyberPink' : 'text-toxic';

  return (
    <div className="rounded-sm border border-white/10 bg-white/[0.03] p-2">
      <div className="relative mx-auto h-16 w-16">
        <svg viewBox="0 0 42 42" className="h-16 w-16 -rotate-90">
          <circle cx="21" cy="21" r="16" fill="none" className="stroke-white/10" strokeWidth="4" />
          <circle cx="21" cy="21" r="16" fill="none" className={`stroke-current ${ring}`} strokeWidth="4" strokeDasharray={`${bounded} ${100 - bounded}`} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-xs text-zinc-200">{bounded}%</span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-xs text-zinc-400"><Cpu className="h-3 w-3" />{label}</div>
    </div>
  );
}
