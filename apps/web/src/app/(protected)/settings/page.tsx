'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { getMonthKey } from '@/lib/usage';

type SettingsData = {
  userEmail: string;
  workspaceId: string;
  workspaceName: string;
  planName: string;
  runLimit: number;
  runsCount: number;
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const supabase = createBrowserSupabase();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError('Kullanıcı bilgisi alınamadı.');
          return;
        }

        const { data: membership, error: membershipError } = await supabase
          .from('workspace_members')
          .select('workspace_id, workspaces!inner(id, name)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          setError(`Çalışma alanı bilgisi alınamadı: ${membershipError.message}`);
          return;
        }

        const workspace = Array.isArray(membership?.workspaces) ? membership.workspaces[0] : membership?.workspaces;

        if (!membership?.workspace_id || !workspace) {
          setError('Çalışma alanı bulunamadı.');
          return;
        }

        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('plan_name, run_limit, status')
          .eq('workspace_id', membership.workspace_id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscriptionError || !subscription) {
          setError('Abonelik bilgisi alınamadı.');
          return;
        }

        const monthKey = getMonthKey();
        const { data: usage, error: usageError } = await supabase
          .from('usage_counters')
          .select('runs_count')
          .eq('workspace_id', membership.workspace_id)
          .eq('month_key', monthKey)
          .maybeSingle();

        if (usageError) {
          setError(`Kullanım bilgisi alınamadı: ${usageError.message}`);
          return;
        }

        const nextData: SettingsData = {
          userEmail: user.email ?? '-',
          workspaceId: membership.workspace_id,
          workspaceName: workspace.name,
          planName: subscription.plan_name,
          runLimit: subscription.run_limit,
          runsCount: usage?.runs_count ?? 0,
        };

        setData(nextData);
        setWorkspaceName(nextData.workspaceName);
      } catch (loadError) {
        console.error('Settings page load failed:', loadError);
        setError('Ayarlar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSaveWorkspaceName = async (): Promise<void> => {
    if (!data) {
      return;
    }

    const trimmedName = workspaceName.trim();
    if (!trimmedName) {
      setError('Çalışma alanı adı boş olamaz.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createBrowserSupabase();
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({ name: trimmedName })
        .eq('id', data.workspaceId);

      if (updateError) {
        setError(`Çalışma alanı güncellenemedi: ${updateError.message}`);
        return;
      }

      setData({ ...data, workspaceName: trimmedName });
      setMessage('Çalışma alanı adı güncellendi.');
    } catch (saveError) {
      console.error('Workspace name update failed:', saveError);
      setError('Çalışma alanı güncellenirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <section className="text-zinc-300">Ayarlar yükleniyor...</section>;
  }

  if (error && !data) {
    return <section className="text-rose-300">{error}</section>;
  }

  if (!data) {
    return <section className="text-zinc-300">Ayar verisi bulunamadı.</section>;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Ayarlar</h1>
        <p className="text-zinc-300">Hesap ve çalışma alanı ayarlarını buradan yönetebilirsin.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <div className="space-y-1">
          <label className="text-sm text-zinc-400">E-posta</label>
          <input
            type="text"
            value={data.userEmail}
            readOnly
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="workspaceName" className="text-sm text-zinc-400">
            Çalışma alanı adı
          </label>
          <input
            id="workspaceName"
            type="text"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSaveWorkspaceName()}
          disabled={saving}
          className="w-fit rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Çalışma alanı adını kaydet'}
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold">Plan ve kullanım</h2>
        <p className="text-sm text-zinc-300">Mevcut plan: {data.planName}</p>
        <p className="text-sm text-zinc-300">
          Aylık kullanım: {data.runsCount} / {data.runLimit}
        </p>
        <button
          type="button"
          disabled
          onClick={() => {
            window.alert('Yakında');
          }}
          className="w-fit rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 opacity-60"
        >
          Planını Yükselt
        </button>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">{message}</p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{error}</p>
      ) : null}
    </section>
  );
}
