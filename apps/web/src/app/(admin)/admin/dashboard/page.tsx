import { Badge } from '../../../../components/ui/badge'
import { Card } from '../../../../components/ui/card'

const healthChecks = [
  { metric: 'Ad Decision Service', value: 'UP', extra: '99.97% uptime' },
  { metric: 'Tracking Pipeline', value: 'UP', extra: '0.2% gecikmeli event' },
  { metric: 'Wallet & Ledger', value: 'UP', extra: 'Mutabakat sorunu yok' },
  { metric: 'Fraud Engine', value: 'ALERT', extra: '2 placement incelemede' },
]

export default function Page() {
  return (
    <main className="space-y-6 p-6">
      <header className="space-y-2">
        <Badge>Admin War Room</Badge>
        <h1 className="text-2xl font-semibold">Global Network Yönetim Ekranı</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Tüm reklam ağının teknik, finansal ve güvenlik durumunu tek yerden yönet.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {healthChecks.map((item) => (
          <Card key={item.metric}>
            <p className="text-xs text-zinc-500">{item.metric}</p>
            <p className="mt-2 text-xl font-bold">{item.value}</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{item.extra}</p>
          </Card>
        ))}
      </section>

      <Card>
        <h2 className="text-lg font-semibold">Kritik Operasyon Komutları</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Onaysız kampanyaları otomatik policy taramasından geçir.</li>
          <li>Payout bekleyen publisher listesinde risk skoru yüksek olanları sırala.</li>
          <li>p95 latency 120ms üstüne çıkarsa traffic throttling uygula.</li>
        </ul>
      </Card>
    </main>
  )
}
