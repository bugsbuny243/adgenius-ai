'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';
import { getMonthKey } from '@/lib/usage';
import { resolveWorkspaceContext } from '@/lib/workspace';

type SettingsData = {
  userEmail: string;
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  memberRole: 'owner' | 'admin' | 'member';
  planName: string;
  runLimit: number;
  runsCount: number;
};

type MemberRow = {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'revoked';
  invite_token: string;
  created_at: string;
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createBrowserSupabase();
      const { user, workspace, memberRole } = await resolveWorkspaceContext(supabase);

      const [{ data: subscription, error: subscriptionError }, { data: usage, error: usageError }, { data: memberRows }, { data: inviteRows }] =
        await Promise.all([
          supabase.from('subscriptions').select('plan_name, run_limit, status').eq('workspace_id', workspace.id).eq('status', 'active').maybeSingle(),
          supabase.from('usage_counters').select('runs_count').eq('workspace_id', workspace.id).eq('month_key', getMonthKey()).maybeSingle(),
          supabase.from('workspace_members').select('id, user_id, role, created_at').eq('workspace_id', workspace.id).order('created_at', { ascending: true }),
          supabase.from('workspace_invitations').select('id, email, role, status, invite_token, created_at').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
        ]);

      if (subscriptionError || !subscription) {
        setError('Abonelik bilgisi alınamadı.');
        return;
      }

      if (usageError) {
        setError(`Kullanım bilgisi alınamadı: ${usageError.message}`);
        return;
      }

      const nextData: SettingsData = {
        userEmail: user.email ?? '-',
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        ownerId: workspace.owner_id,
        memberRole,
        planName: subscription.plan_name,
        runLimit: subscription.run_limit,
        runsCount: usage?.runs_count ?? 0,
      };

      setData(nextData);
      setWorkspaceName(nextData.workspaceName);
      setMembers((memberRows ?? []) as MemberRow[]);
      setInvites((inviteRows ?? []) as InviteRow[]);
    } catch (loadError) {
      console.error('Settings page load failed:', loadError);
      setError('Ayarlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleCreateInvite = async (): Promise<void> => {
    if (!data) {
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError('Davet için e-posta girin.');
      return;
    }

    try {
      const supabase = createBrowserSupabase();
      const { user } = await resolveWorkspaceContext(supabase);

      const { error: inviteError } = await supabase.from('workspace_invitations').insert({
        workspace_id: data.workspaceId,
        invited_by: user.id,
        email,
        role: inviteRole,
      });

      if (inviteError) {
        setError(`Davet oluşturulamadı: ${inviteError.message}`);
        return;
      }

      setInviteEmail('');
      setMessage('Davet kaydı oluşturuldu (foundation).');
      await loadSettings();
    } catch (inviteErr) {
      setError(inviteErr instanceof Error ? inviteErr.message : 'Davet oluşturulamadı.');
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
        <h1 className="text-2xl font-semibold">Workspace Ayarları</h1>
        <p className="text-zinc-300">Tek kullanıcı ve ekipli kullanım için temel yönetim paneli.</p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
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
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
          />
        </div>

        <p className="text-xs text-zinc-400">Rolün: {data.memberRole} · Owner ID: {data.ownerId}</p>

        <button
          type="button"
          onClick={() => void handleSaveWorkspaceName()}
          disabled={saving}
          className="w-fit rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Workspace adını kaydet'}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold">Üye listesi ve roller</h2>
        <div className="mt-3 space-y-2">
          {members.map((member) => (
            <div key={member.id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
              <p>{member.user_id}</p>
              <p className="text-xs text-zinc-400">Rol: {member.role} · Katılım: {new Date(member.created_at).toLocaleString('tr-TR')}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        <h2 className="text-lg font-semibold">Invite Foundation</h2>
        <p className="text-sm text-zinc-300">Owner/Admin davet kaydı oluşturabilir. Kabul akışı v3 için ayrıldı.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <input
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="uye@ornek.com"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <select
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button type="button" onClick={() => void handleCreateInvite()} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
            Davet oluştur
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {invites.map((invite) => (
            <div key={invite.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-2 text-xs text-zinc-300">
              {invite.email} · rol={invite.role} · durum={invite.status} · token={invite.invite_token}
            </div>
          ))}
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
