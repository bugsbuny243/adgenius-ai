import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export default async function OwnerUsersPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">Kullanıcılar</h2>
      <p className="mt-1 text-sm text-white/70">Normal kullanıcılar bu listeye erişemez. Platform owner tüm kullanıcıları izler.</p>
      <div className="mt-3 space-y-2 text-sm">
        {(users ?? []).map((user) => (
          <p key={user.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            {user.email ?? '-'} • {user.id}
          </p>
        ))}
      </div>
    </section>
  );
}
