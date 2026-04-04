import Link from 'next/link'

export default function HomePage() {
  return (
    <section className="space-y-12">
      <div className="space-y-5">
        <h1 className="text-4xl font-bold">Dosya ve notlardan otomatik iş çıkaran AI operasyon masası</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          PDF, ekran görüntüsü, ses notu ve yazıları yükleyin. OperaAI bunları analiz etsin; müşteri, görev, tarih, not ve iş kayıtlarına dönüştürsün.
        </p>
        <div className="flex gap-3">
          <Link className="rounded-lg bg-slate-900 px-4 py-2 text-white" href="/signup">Hemen Başla</Link>
          <Link className="rounded-lg border border-slate-300 px-4 py-2" href="/login">Giriş Yap</Link>
          <Link className="rounded-lg border border-slate-300 px-4 py-2" href="/demo">Sistemi Gör</Link>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold">Nasıl çalışır?</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
          <li>Yükle</li>
          <li>AI analiz etsin</li>
          <li>Onayla ve kaydet</li>
        </ol>
      </div>

      <div>
        <h2 className="text-2xl font-semibold">Kimler için?</h2>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          <li>ajanslar</li><li>yazılım ekipleri</li><li>danışmanlık firmaları</li><li>üretici/ihracatçı ekipler</li><li>teklif ve dosya takibi yoğun ekipler</li>
        </ul>
      </div>

      <div>
        <h2 className="text-2xl font-semibold">Neyi çözer?</h2>
        <ul className="mt-4 space-y-2 text-slate-700">
          <li>belge dağınıklığını azaltır</li>
          <li>toplantı sonrası iş çıkarmayı hızlandırır</li>
          <li>görev ve tarih kaçırmayı azaltır</li>
          <li>müşteri ve iş takibini tek yere toplar</li>
        </ul>
      </div>
    </section>
  )
}
