import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerLogsPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/logs');
  const data = (await response.json().catch(() => ({ events: [] }))) as { events?: Array<{ id: string; event_type: string; actor_user_id: string | null; created_at: string | null }> };

  return <section className="panel"><h2 className="text-lg font-semibold">Loglar / Hata Kayıtları</h2><div className="mt-3 space-y-2 text-xs">{(data.events ?? []).map((e)=><p key={e.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">{e.event_type} • {e.actor_user_id ?? 'system'} • {new Date(e.created_at ?? '').toLocaleString('tr-TR')}</p>)}</div></section>;
}
