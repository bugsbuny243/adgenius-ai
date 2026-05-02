import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseReadonlyServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BuildJob = {
  id: string;
  unity_game_project_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
};

type PackagePurchase = {
  id: string;
  user_id: string;
  package_key: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string | null;
};

const statusBadge = (status: string | null | undefined) => {
  const normalized = (status ?? '').toLowerCase();
  if (['success', 'completed', 'active', 'paid', 'approved'].includes(normalized)) {
    return 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30';
  }
  if (['failed', 'error', 'cancelled', 'refunded', 'rejected'].includes(normalized)) {
    return 'bg-rose-500/15 text-rose-300 ring-rose-400/30';
  }
  if (['pending', 'processing', 'queued'].includes(normalized)) {
    return 'bg-amber-500/15 text-amber-300 ring-amber-400/30';
  }
  return 'bg-slate-500/15 text-slate-300 ring-slate-400/30';
};

export default async function OwnerDashboardPage() {
  await requirePlatformOwner();
  const supabase = await createSupabaseReadonlyServerClient();

  const [buildJobsRes, profilesRes, purchasesRes] = await Promise.all([
    supabase.from('unity_build_jobs').select('id,unity_game_project_id,status,created_at,updated_at').order('created_at', { ascending: false }).limit(15),
    supabase.from('profiles').select('id,email,full_name,created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('package_purchases').select('id,user_id,package_key,amount,currency,status,created_at').order('created_at', { ascending: false }).limit(15)
  ]);

  const buildJobs = (buildJobsRes.data ?? []) as BuildJob[];
  const profiles = (profilesRes.data ?? []) as Profile[];
  const purchases = (purchasesRes.data ?? []) as PackagePurchase[];

  const pendingPurchases = purchases.filter((purchase) => purchase.status.toLowerCase() === 'pending').length;
  const failedBuilds = buildJobs.filter((job) => (job.status ?? '').toLowerCase().includes('fail')).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 lg:sticky lg:top-6 lg:h-fit">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Owner Panel</p>
        <h1 className="mt-2 text-xl font-semibold text-white">Dashboard</h1>
        <nav className="mt-5 space-y-2 text-sm">
          <a href="#overview" className="block rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:border-cyan-400/60 hover:text-white">Genel Durum</a>
          <a href="#build-jobs" className="block rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:border-cyan-400/60 hover:text-white">Unity Build Jobs</a>
          <a href="#profiles" className="block rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:border-cyan-400/60 hover:text-white">Profiles</a>
          <a href="#purchases" className="block rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:border-cyan-400/60 hover:text-white">Package Purchases</a>
        </nav>
      </aside>

      <section className="space-y-6">
        <div id="overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
            <p className="text-sm text-slate-400">Toplam Build Job</p>
            <p className="mt-2 text-3xl font-bold text-white">{buildJobs.length}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
            <p className="text-sm text-slate-400">Failed Build</p>
            <p className="mt-2 text-3xl font-bold text-rose-300">{failedBuilds}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
            <p className="text-sm text-slate-400">Toplam Profile</p>
            <p className="mt-2 text-3xl font-bold text-white">{profiles.length}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-4">
            <p className="text-sm text-slate-400">Pending Purchase</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{pendingPurchases}</p>
          </article>
        </div>

        <article id="build-jobs" className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h2 className="text-lg font-semibold text-white">Unity Build Jobs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="px-2 py-2">Project</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {buildJobs.map((job) => (
                  <tr key={job.id} className="border-t border-white/10 text-slate-200">
                    <td className="px-2 py-3">{job.unity_game_project_id ?? '-'}</td>
                    <td className="px-2 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadge(job.status)}`}>{job.status ?? 'unknown'}</span>
                    </td>
                    <td className="px-2 py-3">{job.created_at ? new Date(job.created_at).toLocaleString('tr-TR') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article id="profiles" className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h2 className="text-lg font-semibold text-white">Profiles</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {profiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                <p className="font-medium text-white">{profile.full_name ?? profile.email ?? 'İsimsiz Kullanıcı'}</p>
                <p className="mt-1 text-xs text-slate-400">{profile.email ?? '-'}</p>
                <p className="mt-2 text-xs text-slate-500">ID: {profile.id}</p>
              </div>
            ))}
          </div>
        </article>

        <article id="purchases" className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <h2 className="text-lg font-semibold text-white">Package Purchases</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="px-2 py-2">Package</th>
                  <th className="px-2 py-2">User</th>
                  <th className="px-2 py-2">Amount</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-t border-white/10 text-slate-200">
                    <td className="px-2 py-3">{purchase.package_key}</td>
                    <td className="px-2 py-3">{purchase.user_id}</td>
                    <td className="px-2 py-3">{purchase.amount} {purchase.currency}</td>
                    <td className="px-2 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusBadge(purchase.status)}`}>{purchase.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
