import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerUsersPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/users');
  const data = (await response.json().catch(() => ({ users: [] }))) as { users?: Array<{ id: string; email: string | null }> };

  return (
    <section className="panel">
      <h2 className="text-lg font-semibold">Kullanıcılar</h2>
      <div className="mt-3 space-y-2 text-sm">
        {(data.users ?? []).map((user) => (
          <p key={user.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{user.email ?? '-'} • {user.id}</p>
        ))}
      </div>
    </section>
  );
}
