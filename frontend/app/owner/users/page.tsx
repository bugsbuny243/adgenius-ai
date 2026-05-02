import { setUserPremiumAction } from '@/app/owner/actions';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerUsersPage() {
  await requirePlatformOwner();
  const supabase = await createSupabaseReadonlyServerClient();

  const [profilesRes, subscriptionsRes] = await Promise.all([
    supabase.from('profiles').select('id,email,full_name,created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('subscriptions').select('workspace_id,plan_name,status,updated_at')
  ]);

  const subscriptionByWorkspace = new Map((subscriptionsRes.data ?? []).map((s) => [s.workspace_id, s]));

  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">User Management</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-300">
            <tr><th className="px-2 py-2">Kullanıcı</th><th className="px-2 py-2">Abonelik</th><th className="px-2 py-2">Durum</th><th className="px-2 py-2">Aksiyon</th></tr>
          </thead>
          <tbody>
            {(profilesRes.data ?? []).map((user) => {
              const sub = subscriptionByWorkspace.get(user.id);
              const isPremium = (sub?.plan_name ?? '').toLowerCase() === 'premium' && (sub?.status ?? '').toLowerCase() === 'active';
              return (
                <tr key={user.id} className="border-t border-white/10">
                  <td className="px-2 py-3">{user.full_name || user.email || user.id}</td>
                  <td className="px-2 py-3">{sub?.plan_name ?? 'free'}</td>
                  <td className="px-2 py-3">{sub?.status ?? 'inactive'}</td>
                  <td className="px-2 py-3">
                    <form action={setUserPremiumAction}>
                      <input type="hidden" name="workspaceId" value={user.id} />
                      <input type="hidden" name="nextState" value={isPremium ? 'revoke' : 'grant'} />
                      <button className="rounded-lg border border-white/15 px-3 py-1.5 hover:border-neon" type="submit">
                        {isPremium ? 'Premium Kaldır' : 'Premium Ver'}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
