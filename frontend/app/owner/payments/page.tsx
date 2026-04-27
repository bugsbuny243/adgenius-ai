import { PaymentManager } from '@/app/owner/payments/payment-manager';
import { requirePlatformOwner } from '@/lib/owner-auth';
import { fetchBackendForOwner } from '@/lib/backend-server';

export default async function OwnerPaymentsPage() {
  await requirePlatformOwner();
  const response = await fetchBackendForOwner('/owner/payments');
  const data = (await response.json().catch(() => ({ paymentOrders: [], emailMap: {} }))) as { paymentOrders?: Array<any>; emailMap?: Record<string, string | null> };

  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <article className="panel">
        <h2 className="text-lg font-semibold">Shopier Ödeme Onay Akışı</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(data.paymentOrders ?? []).map((order) => (
            <div key={order.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="font-medium">{order.plan_key} • {order.amount} {order.currency}</p>
              <p>Kullanıcı: {data.emailMap?.[order.user_id] ?? order.user_id}</p>
              <p>Durum: {order.status}</p>
            </div>
          ))}
        </div>
      </article>
      <article className="panel"><h3 className="text-lg font-semibold">Manuel Onay / Red</h3><PaymentManager /></article>
    </section>
  );
}
