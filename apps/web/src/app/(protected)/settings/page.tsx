'use client';

import { useEffect, useMemo, useState } from 'react';

import { getAccessTokenOrThrow } from '@/lib/api-client';
import { signOut } from '@/lib/auth';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { getMonthKey } from '@/lib/usage';
import { resolveWorkspaceContext } from '@/lib/workspace';

type SettingsData = {
  email: string;
  fullName: string;
  workspaceName: string;
  planName: 'free' | 'starter' | 'pro';
  runLimit: number;
  runsCount: number;
};

const PLAN_LABELS: Record<SettingsData['planName'], string> = {
  free: 'Ücretsiz',
  starter: 'Başlangıç',
  pro: 'Pro',
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingWorkspace, setSavingWorkspace] = useState(false);

  useEffect(() => {
    async function loadSettings(): Promise<void> {
      setLoading(true);
      setStatus('');

      try {
        const supabase = createBrowserSupabase();
        const { user, workspace, profile } = await resolveWorkspaceContext(supabase);

        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('plan_name, run_limit')
          .eq('workspace_id', workspace.id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscriptionError || !subscription) {
          throw new Error(subscriptionError?.message ?? 'Abonelik bilgisi alınamadı.');
        }

        const { data: usageCounter, error: usageError } = await supabase
          .from('usage_counters')
          .select('runs_count')
          .eq('workspace_id', workspace.id)
          .eq('month_key', getMonthKey())
          .maybeSingle();

        if (usageError) {
          throw new Error(`Kullanım bilgisi alınamadı: ${usageError.message}`);
        }

        const loaded: SettingsData = {
          email: user.email ?? profile?.email ?? '',
          fullName: profile?.full_name ?? '',
          workspaceName: workspace.name,
          planName: (subscription.plan_name as SettingsData['planName']) ?? 'free',
          runLimit: subscription.run_limit,
          runsCount: usageCounter?.runs_count ?? 0,
        };

        setData(loaded);
        setFullName(loaded.fullName);
        setWorkspaceName(loaded.workspaceName);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Ayarlar yüklenemedi.');
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  const usagePercent = useMemo(() => {
    if (!data || data.runLimit <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((data.runsCount / data.runLimit) * 100));
  }, [data]);

  async function updateProfile(): Promise<void> {
    setSavingProfile(true);
    setStatus('');

    try {
      const accessToken = await getAccessTokenOrThrow();
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ full_name: fullName }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'Profil güncellenemedi.');
      }

      setData((prev) => (prev ? { ...prev, fullName } : prev));
      setStatus('Profil bilgisi güncellendi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Profil güncellenemedi.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function updateWorkspace(): Promise<void> {
    setSavingWorkspace(true);
    setStatus('');

    try {
      const accessToken = await getAccessTokenOrThrow();
      const response = await fetch('/api/workspace', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: workspaceName }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'Çalışma alanı güncellenemedi.');
      }

      setData((prev) => (prev ? { ...prev, workspaceName } : prev));
      setStatus('Çalışma alanı güncellendi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Çalışma alanı güncellenemedi.');
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function onSignOut(): Promise<void> {
    await signOut();
    window.location.href = '/signin';
  }

  if (loading) {
    return <p className="text-sm text-zinc-300">Ayarlar yükleniyor...</p>;
  }

  if (!data) {
    return <p className="text-sm text-rose-300">Ayar bilgileri yüklenemedi.</p>;
  }

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Ayarlar</h1>
      {status ? <p className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3 text-sm text-zinc-200">{status}</p> : null}

      <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Profil</h2>
        <div className="mt-3 grid gap-3">
          <label className="text-sm text-zinc-300">
            E-posta
            <input
              value={data.email}
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Ad Soyad
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
            />
          </label>
          <button
            type="button"
            onClick={() => void updateProfile()}
            disabled={savingProfile}
            className="w-fit rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            {savingProfile ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Çalışma Alanı</h2>
        <div className="mt-3 grid gap-3">
          <label className="text-sm text-zinc-300">
            Workspace adı
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
            />
          </label>
          <button
            type="button"
            onClick={() => void updateWorkspace()}
            disabled={savingWorkspace}
            className="w-fit rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            {savingWorkspace ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Abonelik</h2>
        <p className="mt-2 text-sm text-zinc-300">Aktif plan: {PLAN_LABELS[data.planName] ?? data.planName}</p>
        <p className="mt-1 text-sm text-zinc-300">
          Aylık kullanım: {data.runsCount} / {data.runLimit} run
        </p>
        <div className="mt-3 h-2 w-full rounded-full bg-zinc-800">
          <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${usagePercent}%` }} />
        </div>
        <button
          type="button"
          disabled
          title="Yakında geliyor"
          className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 disabled:cursor-not-allowed"
        >
          Planını Yükselt
        </button>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <h2 className="text-lg font-medium">Hesap</h2>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="mt-3 rounded-lg border border-rose-700 px-4 py-2 text-sm text-rose-300 hover:border-rose-500"
        >
          Hesabımdan Çık
        </button>
      </article>
    </section>
  );
}
