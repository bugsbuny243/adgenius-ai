import { Badge } from '../../../components/ui/badge'
import { Card } from '../../../components/ui/card'

const kpis = [
  { label: 'Aktif Kampanya', value: '18', note: '+4 bugün' },
  { label: 'Toplam Harcama', value: '$42,380', note: 'Son 24 saat' },
  { label: 'Ortalama ROAS', value: '3.8x', note: 'AI optimize açık' },
  { label: 'Fill Rate', value: '%91.4', note: 'Network genel' },
]

const priorities = [
  'Düşük performanslı kampanyalarda hedef CPA yeniden dengele.',
  'En yüksek dönüşüm getiren 3 publisher için slot kapasitesini artır.',
  'IVT şüphesi olan placement’larda trafik kalite doğrulaması başlat.',
]

export default function Page() {
  return (
    <main className="space-y-6 p-6">
      <header className="space-y-2">
        <Badge>Advertiser Command Center</Badge>
        <h1 className="text-2xl font-semibold">AdGenius Operasyon Paneli</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">3. parti ağlara bağlı kalmadan kampanyalarını kendi networkünde yönet.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.label}>
            <p className="text-xs text-zinc-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
            <p className="mt-1 text-xs text-emerald-600">{item.note}</p>
          </Card>
        ))}
      </section>

      <Card>
        <h2 className="text-lg font-semibold">AI Öncelik Listesi (Şimdi)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {priorities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </main>
  )
}
