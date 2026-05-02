import { NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export async function GET() {
  await requirePlatformOwner();

  const supabase = getSupabaseServiceRoleClient();

  const [profilesRes, purchasesRes, logsRes, buildsRes] = await Promise.all([
    supabase.from('profiles').select('id,email,full_name,created_at').order('created_at', { ascending: false }).limit(100),
    supabase
      .from('package_purchases')
      .select('id,user_id,package_name,amount,status,created_at,approved_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('error_logs').select('id,level,message,created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('build_statuses').select('id,status,service,created_at').order('created_at', { ascending: false }).limit(20)
  ]);

  if (profilesRes.error || purchasesRes.error || logsRes.error || buildsRes.error) {
    return NextResponse.json({ error: 'Owner panel verileri yüklenemedi.' }, { status: 500 });
  }

  const purchases = purchasesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  const usersWithPackage = new Set(purchases.map((purchase) => purchase.user_id));

  return NextResponse.json({
    users: profiles,
    purchases,
    pendingApprovals: purchases.filter((purchase) => purchase.status === 'pending'),
    metrics: {
      totalUsers: profiles.length,
      purchasedUsers: usersWithPackage.size,
      pendingCount: purchases.filter((purchase) => purchase.status === 'pending').length,
      approvedCount: purchases.filter((purchase) => purchase.status === 'approved').length
    },
    system: {
      recentErrors: logsRes.data ?? [],
      recentBuilds: buildsRes.data ?? []
    }
  });
}
