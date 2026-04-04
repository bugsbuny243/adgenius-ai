import Link from 'next/link'

export default function HomePage() {
  return (
    <section className="space-y-10">
      <div className="panel space-y-5">
        <h1 className="text-4xl font-bold">Kendi iş ajanlarını kuran operasyon sistemi</h1>
        <p className="max-w-3xl text-lg text-slate-300">
          Dosyaları, notları ve süreçleri Gemini destekli ajanlara verin. AgentForge bunları görev, kayıt ve aksiyona dönüştürsün.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white" href="/demo">Demo İste</Link>
          <Link className="rounded-lg border border-slate-700 px-4 py-2" href="/login">Giriş Yap</Link>
          <Link className="rounded-lg border border-slate-700 px-4 py-2" href="/dashboard">Sistemi Gör</Link>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel">Dosya + ekran görüntüsü + ses notu tek iş akışında işlenir.</div>
        <div className="panel">Gemini yapısal çıktı üretir: görev, risk, eksik alan, müşteri kaydı.</div>
        <div className="panel">Onay gerektiren adımlar durur, onay sonrası gerçek kayıt açılır.</div>
      </div>
    </section>
  )
}
