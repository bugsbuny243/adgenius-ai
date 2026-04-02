const pillars = [
  {
    title: "Kendi Demand Katmanımız",
    description:
      "Google/Meta/TikTok bağımlılığı olmadan kampanya oluşturma, bütçe yönetimi ve otomatik optimizasyon.",
  },
  {
    title: "Kendi Supply Katmanımız",
    description:
      "Publisher onboarding, slot yönetimi ve embed.js ile anında dağıtım. Trafik bizim ağımızda akar.",
  },
  {
    title: "AdGenius AI Core",
    description:
      "Gemini API + AdGenius AI birlikte kreatif üretir, eşleştirme yapar, teklif ve fraud kararlarını otomatikleştirir.",
  },
]

const sprint72h = [
  {
    window: "0-24 Saat",
    tasks: [
      "Tüm demo dili kaldırılır, platform dili 'network operasyonu'na çevrilir.",
      "Advertiser -> Campaign -> Serve -> Track hattı production modunda doğrulanır.",
      "Publisher tarafında slot ve entegrasyon akışı tek ekrandan hızlandırılır.",
    ],
  },
  {
    window: "24-48 Saat",
    tasks: [
      "AI optimizasyon döngüsü (bid + quality + fraud) aktif edilir.",
      "Admin'de delivery ve finans görünürlüğü sıkılaştırılır.",
      "Network health KPI'ları: fill rate, latency, invalid traffic yüzdesi.",
    ],
  },
  {
    window: "48-72 Saat",
    tasks: [
      "Yayın trafiği altında stres testi ve otomatik alarm eşikleri.",
      "Payout ve wallet akışında mutabakat kontrolleri.",
      "Launch runbook: incident, rollback, hotfix süreçleri canlıya alınır.",
    ],
  },
]

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-zinc-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">AdGenius Network / War Mode</p>
        <h1 className="mt-3 text-3xl font-bold md:text-5xl">Demo değil. Kendi reklam ağımızı 72 saatte operasyon moduna alıyoruz.</h1>
        <p className="mt-4 max-w-3xl text-sm text-zinc-300 md:text-base">
          Bu sistem üçüncü parti ağlara trafik taşımaz. Kendi demand, kendi supply, kendi karar motoru. Operasyonu insan ordusuyla
          değil, AdGenius AI + Gemini destekli otomasyonla büyütürüz.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article key={pillar.title} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">{pillar.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{pillar.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold">72 Saatlik Bitirme Planı</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {sprint72h.map((phase) => (
            <article key={phase.window} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-500">{phase.window}</h3>
              <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-zinc-700 dark:text-zinc-300">
                {phase.tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
