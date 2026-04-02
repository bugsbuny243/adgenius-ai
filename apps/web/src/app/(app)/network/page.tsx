import { Badge } from '../../../components/ui/badge'
import { Card } from '../../../components/ui/card'

const networkStats = [
  { label: 'Bağlı Publisher', value: '1,284' },
  { label: 'Aktif Slot', value: '9,412' },
  { label: 'İstek / sn', value: '3,920' },
  { label: 'p95 Latency', value: '86ms' },
]

const rollout = [
  { stage: 'Stage 1', item: 'Yeni publisher entegrasyonu', status: 'Tamamlandı' },
  { stage: 'Stage 2', item: 'Gemini destekli bid tuning', status: 'Devrede' },
  { stage: 'Stage 3', item: 'Fraud otomatik aksiyon', status: 'İzlemede' },
]

export default function Page() {
  return (
    <main className="space-y-6 p-6">
      <header className="space-y-2">
        <Badge>Network Ops</Badge>
        <h1 className="text-2xl font-semibold">Kendi Reklam Ağı Kontrol Merkezi</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">TikTok/Meta/Google yerine doğrudan AdGenius dağıtım altyapısı.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {networkStats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </section>

      <Card>
        <h2 className="text-lg font-semibold">72 Saatlik Rollout Durumu</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="py-2">Aşama</th>
                <th className="py-2">Görev</th>
                <th className="py-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {rollout.map((row) => (
                <tr key={row.stage} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-2 font-medium">{row.stage}</td>
                  <td className="py-2">{row.item}</td>
                  <td className="py-2 text-emerald-600">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  )
}
