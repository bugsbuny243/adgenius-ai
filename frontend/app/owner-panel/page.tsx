'use client';

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
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <h1 className="text-3xl font-bold">Owner Command Center</h1>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Toplam Üye" value={summary?.metrics.totalUsers ?? 0} />
        <MetricCard label="Paket Alan" value={summary?.metrics.purchasedUsers ?? 0} />
        <MetricCard label="Bekleyen Onay" value={summary?.metrics.pendingCount ?? 0} />
        <MetricCard label="Onaylı" value={summary?.metrics.approvedCount ?? 0} />
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Manuel Onay Sistemi</h2>
        <div className="overflow-auto rounded border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr><th className="p-2">User</th><th className="p-2">Paket</th><th className="p-2">Tutar</th><th className="p-2">Aksiyon</th></tr>
            </thead>
            <tbody>
              {summary?.pendingApprovals.map((purchase) => (
                <tr key={purchase.id} className="border-t">
                  <td className="p-2">{purchase.user_id}</td>
                  <td className="p-2">{purchase.package_name}</td>
                  <td className="p-2">{purchase.amount ?? '-'}</td>
                  <td className="p-2"><button className="rounded bg-black px-3 py-1 text-white" onClick={() => approve(purchase.id)}>Onayla</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Kullanıcılar ve Paket Yönetimi</h2>
        <ul className="space-y-2">
          {summary?.users.map((user) => {
            const pack = summary.purchases.find((purchase) => purchase.user_id === user.id);
            return (
              <li key={user.id} className="rounded border p-3">
                <div className="font-medium">{user.email ?? user.id}</div>
                <div className="text-xs text-gray-600">Paket: {pack?.package_name ?? 'Yok'} | Durum: {pack?.status ?? '-'}</div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-xl font-semibold">Sistem Gözetimi (Supabase)</h2>
          <div className="rounded border p-3">
            <h3 className="font-semibold">Son Hata Logları</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {summary?.system.recentErrors.map((row) => <li key={row.id}>[{row.level}] {row.message}</li>)}
            </ul>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-xl font-semibold">Sistem Gözetimi (GitHub)</h2>
          <div className="rounded border p-3">
            <h3 className="font-semibold">Son Commitler</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {commits.map((commit) => <li key={commit.sha}>{commit.sha.slice(0, 7)} - {commit.commit?.message}</li>)}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded border p-4"><div className="text-xs text-gray-500">{label}</div><div className="text-2xl font-bold">{value}</div></div>;
}
