import { PaymentManager } from '@/app/owner/payments/payment-manager';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { createSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

export default async function OwnerPaymentsPage() {
  await requirePlatformOwner();
  const supabase = createSupabaseServiceRoleClient();

  const { data: paymentOrders } = await supabase
    .from('payment_orders')
    .select('id, user_id, plan_key, amount, currency, status, created_at, approved_at, metadata')
    .eq('provider', 'shopier')
    .order('created_at', { ascending: false })
    .limit(50);

  const userIds = [...new Set((paymentOrders ?? []).map((order) => order.user_id).filter(Boolean))] as string[];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, email').in('id', userIds)
    : { data: [] as { id: string; email: string | null }[] };

  const emailMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.email]));

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <article className="panel">
        <h2 className="text-lg font-semibold">Shopier Ödeme Onay Akışı</h2>
        <p className="mt-1 text-sm text-white/70">Kullanıcının ödeme tıklaması yalnızca pending kayıt oluşturur. Paket yalnız owner manuel onayından sonra aktive edilir.</p>

        <div className="mt-3 space-y-2 text-sm">
          {(paymentOrders ?? []).map((order) => (
            <div key={order.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="font-medium">{order.plan_key} • {order.amount} {order.currency}</p>
              <p>Kullanıcı: {emailMap.get(order.user_id) ?? order.user_id}</p>
              <p>Durum: {order.status}</p>
              <p>Talep: {order.created_at ? new Date(order.created_at).toLocaleString('tr-TR') : '-'}</p>
              {order.approved_at ? <p>Onay: {new Date(order.approved_at).toLocaleString('tr-TR')}</p> : null}
              <p className="text-xs text-white/60">Order ID: {order.id}</p>
            </div>
          ))}
          {(paymentOrders ?? []).length === 0 ? <p className="text-sm text-white/60">Henüz ödeme kaydı yok.</p> : null}
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Manuel Onay / Red</h3>
        <PaymentManager />
      </article>
    </section>
  );
}
