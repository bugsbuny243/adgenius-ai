import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';
import { ApprovePurchaseButton } from '@/app/owner/dashboard/approve-purchase-button';

type DashboardResponse = {
  buildJobs?: Array<{ id: string; unity_game_project_id: string; status: 'pending' | 'success' | 'failed' | string; created_at: string | null; error_message: string | null }>;
  packagePurchases?: Array<{ id: string; user_id: string; package_key: string; amount: number; currency: string; status: string; created_at: string | null }>;
  profiles?: Array<{ id: string; email: string | null; created_at: string | null }>;
  subscriptions?: Array<{ id: string; user_id: string; status: string; current_period_end: string | null }>;
  googlePlayIntegrations?: Array<{ id: string; user_id: string; status: string; error_message: string | null; updated_at: string | null }>;
};

export default async function OwnerDashboardPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/dashboard');
  const data = (await response.json().catch(() => ({}))) as DashboardResponse;

  const subscriptionsByUser = new Map<string, Array<{ id: string; status: string; current_period_end: string | null }>>();
  for (const sub of data.subscriptions ?? []) {
    const list = subscriptionsByUser.get(sub.user_id) ?? [];
    list.push({ id: sub.id, status: sub.status, current_period_end: sub.current_period_end });
    subscriptionsByUser.set(sub.user_id, list);
  }

  return (
    <section className="grid gap-4">
      <article className="panel">
        <h2 className="text-lg font-semibold">Build Monitor</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(data.buildJobs ?? []).map((job) => (
            <p key={job.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {job.unity_game_project_id} • <span className="font-medium">{job.status}</span> • {new Date(job.created_at ?? '').toLocaleString('tr-TR')}
            </p>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2 className="text-lg font-semibold">Satış Takibi (Onay Bekleyen)</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(data.packagePurchases ?? []).filter((p) => p.status === 'pending').map((purchase) => (
            <div key={purchase.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p>{purchase.package_key} • {purchase.amount} {purchase.currency}</p>
              <p className="text-xs text-white/70">Kullanıcı: {purchase.user_id}</p>
              <ApprovePurchaseButton purchaseId={purchase.id} />
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2 className="text-lg font-semibold">Kullanıcı Yönetimi</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(data.profiles ?? []).map((profile) => {
            const subscriptions = subscriptionsByUser.get(profile.id) ?? [];
            return (
              <div key={profile.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="font-medium">{profile.email ?? '-'} • {profile.id}</p>
                <p className="text-xs text-white/70">Subscriptions: {subscriptions.length ? subscriptions.map((sub) => sub.status).join(', ') : 'yok'}</p>
              </div>
            );
          })}
        </div>
      </article>

      <article className="panel">
        <h2 className="text-lg font-semibold">Google Play Status</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(data.googlePlayIntegrations ?? []).map((integration) => (
            <div key={integration.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p>Kullanıcı: {integration.user_id}</p>
              <p>Durum: {integration.status}</p>
              <p>Hata: {integration.error_message ?? '-'}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
