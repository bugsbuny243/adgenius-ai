import { createSupabaseServerClient } from '@/lib/supabase-server';
import { CyberpunkDashboard } from './CyberpunkDashboard';

export default async function OwnerDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [{ count: unityJobCount }, { count: profileCount }, { count: purchaseCount }] = await Promise.all([
    supabase.from('unity_build_jobs').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('package_purchases').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <main className="min-h-screen bg-[#020617] p-6">
      <h1 className="mb-6 text-3xl font-bold text-cyan-200">Owner Command Center // Premium</h1>
      <CyberpunkDashboard
        unityJobCount={unityJobCount ?? 0}
        profileCount={profileCount ?? 0}
        purchaseCount={purchaseCount ?? 0}
      />
    </main>
  );
}
