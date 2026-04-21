import { getOwnerAccessContextOrRedirect } from '@/lib/owner-access';
import { PaymentManager } from '@/app/owner/payments/payment-manager';

export default async function OwnerPaymentsPage() {
  const { supabase, workspaceId } = await getOwnerAccessContextOrRedirect();

  const [paymentsRes, invoicesRes, transactionsRes, eventsRes] = await Promise.all([
    supabase
      .from('payments')
      .select('id, reference, amount, currency, status, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, due_date, total_amount, currency')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('transactions')
      .select('id, payment_id, transaction_type, status, amount, currency, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('billing_events')
      .select('id, payment_id, event_type, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)
  ]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="panel">
        <h2 className="text-lg font-semibold">Payment workflow</h2>
        <p className="mt-1 text-sm text-white/70">Owner-side billing control with manual updates and extensible records.</p>
        <div className="mt-3">
          <PaymentManager />
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Payments</h3>
        <div className="mt-3 space-y-2 text-sm">
          {(paymentsRes.data ?? []).map((payment) => (
            <div key={payment.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="font-medium">{payment.reference} • {payment.status}</p>
              <p>{payment.amount} {payment.currency}</p>
              <p className="text-xs text-white/60">{payment.id}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Invoices</h3>
        <div className="mt-3 space-y-2 text-sm">
          {(invoicesRes.data ?? []).map((invoice) => (
            <p key={invoice.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {invoice.invoice_number} • {invoice.status} • {invoice.total_amount} {invoice.currency}
            </p>
          ))}
          {(invoicesRes.data ?? []).length === 0 ? <p className="text-white/60">No invoices recorded yet.</p> : null}
        </div>
      </article>

      <article className="panel">
        <h3 className="text-lg font-semibold">Transactions & billing events</h3>
        <div className="mt-3 space-y-2 text-xs">
          {(transactionsRes.data ?? []).map((transaction) => (
            <p key={transaction.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              TX {transaction.transaction_type} • {transaction.status} • {transaction.amount} {transaction.currency}
            </p>
          ))}
          {(eventsRes.data ?? []).map((event) => (
            <p key={event.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              EVT {event.event_type} • {event.payment_id ?? 'n/a'}
            </p>
          ))}
        </div>
      </article>
    </section>
  );
}
