'use client';

import { useEffect, useMemo, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { getMonthKey } from '@/lib/usage';
import { resolveWorkspaceContext } from '@/lib/workspace';

type MemberRow = {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  profiles: { email: string | null; full_name: string | null } | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
};

type SettingsData = {
  userId: string;
  userEmail: string;
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  role: 'owner' | 'admin' | 'member';
  planName: string;
  runLimit: number;
  runsCount: number;
  members: MemberRow[];
  invitations: InviteRow[];
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManageWorkspace = useMemo(() => data?.role === 'owner' || data?.role === 'admin', [data?.role]);

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const supabase = createBrowserSupabase();
        const { user, workspace, role } = await resolveWorkspaceContext(supabase);

        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('plan_name, run_limit, status')
          .eq('workspace_id', workspace.id)
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
          .eq('workspace_id', workspace.id)
          .eq('month_key', monthKey)
          .maybeSingle();

        if (usageError) {
          setError(`Kullanım bilgisi alınamadı: ${usageError.message}`);
          return;
        }

        const { data: members, error: membersError } = await supabase
          .from('workspace_members')
          .select('id, user_id, role, profiles(email, full_name)')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: true });

        if (membersError) {
          setError(`Üye bilgisi alınamadı: ${membersError.message}`);
          return;
        }

        const { data: invitations, error: invitesError } = await supabase
          .from('workspace_invitations')
          .select('id, email, role, status, created_at')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (invitesError) {
          setError(`Davet bilgisi alınamadı: ${invitesError.message}`);
          return;
        }

        const nextData: SettingsData = {
          userId: user.id,
          userEmail: user.email ?? '-',
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          ownerId: workspace.owner_id,
          role,
          planName: subscription.plan_name,
          runLimit: subscription.run_limit,
          runsCount: usage?.runs_count ?? 0,
          members: (members ?? []) as unknown as MemberRow[],
          invitations: (invitations ?? []) as InviteRow[],
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
    if (!data || !canManageWorkspace) {
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
      const { error: updateError } = await supabase.from('workspaces').update({ name: trimmedName }).eq('id', data.workspaceId);

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

  const handleInvite = async () => {
    if (!data || !canManageWorkspace) {
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError('Davet için e-posta girin.');
      return;
    }

    setInviting(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createBrowserSupabase();
      const { data: inserted, error: inviteError } = await supabase
        .from('workspace_invitations')
        .upsert(
          {
            workspace_id: data.workspaceId,
            email,
            role: inviteRole,
            invited_by: data.userId,
            status: 'pending',
          },
          { onConflict: 'workspace_id,email' }
        )
        .select('id, email, role, status, created_at')
        .single();

      if (inviteError || !inserted) {
        setError(`Davet kaydedilemedi: ${inviteError?.message ?? 'Bilinmeyen hata'}`);
        return;
      }

      setData({
        ...data,
        invitations: [inserted as InviteRow, ...data.invitations.filter((invite) => invite.email !== email)],
      });
      setInviteEmail('');
      setMessage('Davet temeli oluşturuldu. E-posta gönderim adımı v3 için hazır.');
    } catch {
      setError('Davet oluşturulurken beklenmeyen bir hata oluştu.');
    } finally {
      setInviting(false);
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
        <h1 className="text-2xl font-semibold">Ayarlar ve Workspace</h1>
        <p className="text-zinc-300">Workspace bilgilerini, rolünü ve ekip üyelerini buradan yönetebilirsin.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold">Workspace Yönetimi</h2>

        <div className="space-y-1">
          <label className="text-sm text-zinc-400">E-posta</label>
          <input type="text" value={data.userEmail} readOnly className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-300" />
        </div>

        <div className="space-y-1">
          <label htmlFor="workspaceName" className="text-sm text-zinc-400">
            Workspace adı
          </label>
          <input
            id="workspaceName"
            type="text"
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            disabled={!canManageWorkspace}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring disabled:opacity-70"
          />
        </div>

        <p className="text-xs text-zinc-400">Rolün: <strong>{data.role}</strong> • Owner ID: {data.ownerId}</p>

        <button
          type="button"
          onClick={() => void handleSaveWorkspaceName()}
          disabled={saving || !canManageWorkspace}
          className="w-fit rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Workspace adını kaydet'}
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold">Üyeler ve Roller</h2>
        <ul className="space-y-2">
          {data.members.map((member) => (
            <li key={member.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm">
              <span>{member.profiles?.full_name || member.profiles?.email || member.user_id}</span>
              <span className="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">{member.role}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold">Davet Altyapısı</h2>
        <p className="text-xs text-zinc-400">Bu sürümde davet kaydı oluşturulur. E-posta gönderimi sonraki versiyonda bağlanacak.</p>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="kullanici@ornek.com"
            disabled={!canManageWorkspace}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')}
            disabled={!canManageWorkspace}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="button"
            disabled={!canManageWorkspace || inviting}
            onClick={() => void handleInvite()}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-100 hover:border-indigo-400 disabled:opacity-50"
          >
            {inviting ? 'Kaydediliyor...' : 'Davet oluştur'}
          </button>
        </div>

        <div className="space-y-2">
          {data.invitations.map((invite) => (
            <p key={invite.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300">
              {invite.email} • rol: {invite.role} • durum: {invite.status} • {new Date(invite.created_at).toLocaleString('tr-TR')}
            </p>
          ))}
          {data.invitations.length === 0 ? <p className="text-xs text-zinc-400">Henüz davet oluşturulmadı.</p> : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold">Plan ve kullanım</h2>
        <p className="text-sm text-zinc-300">Mevcut plan: {data.planName}</p>
        <p className="text-sm text-zinc-300">
          Aylık kullanım: {data.runsCount} / {data.runLimit}
        </p>
      </div>

      {message ? <p className="rounded-lg border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="rounded-lg border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
