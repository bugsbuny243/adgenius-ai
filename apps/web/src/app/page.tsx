import Link from 'next/link'
import { V1_AGENT_CATALOG } from '@/src/lib/agents'

const faqs = [
  {
    q: 'Koschei nedir?',
    a: 'Koschei, ekiplerin AI agent türlerini seçip görev çalıştırdığı ve sonuçları sakladığı Supabase-native bir çalışma alanıdır.',
  },
  {
    q: 'Gemini nasıl kullanılıyor?',
    a: 'Her agent türünün kendi system prompt\'u vardır. Çalıştırma sırasında Gemini bu bağlamla sonuç üretir.',
  },
  {
    q: 'Kullanım limiti var mı?',
    a: 'Evet, plan bazlı aylık görev limitleri bulunur ve dashboard içinde takip edilir.',
  },
]

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="panel space-y-3">
        <h1 className="page-title">İşini AI agent’lara devret</h1>
        <p className="muted">
          Koschei, içerik, e-posta, araştırma, e-ticaret, raporlama ve daha fazlası için çalışan AI agent ekibiniz.
        </p>
        <div className="actions">
          <Link className="primary-button" href="/signup">
            Ücretsiz Dene
          </Link>
          <Link className="secondary-button" href="/agents">
            Agentları Gör
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Nasıl çalışır?</h2>
        <ol>
          <li>1) Agent türünü seçin.</li>
          <li>2) Görev/prompt girin.</li>
          <li>3) Gemini sonucu üretir.</li>
          <li>4) Çıktıyı kaydedip geçmişten tekrar açın.</li>
        </ol>
      </section>

      <section className="panel">
        <h2>Agent türleri</h2>
        <div className="card-grid">
          {V1_AGENT_CATALOG.map((agent) => (
            <article key={agent.slug} className="mini-card">
              <p>
                <strong>{agent.icon} {agent.name}</strong>
              </p>
              <p className="muted">{agent.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Fiyatlar</h2>
        <p className="muted">Başlangıç, Büyüme ve Kurumsal paketleri ile kullanımınıza göre ölçekleyin.</p>
        <Link href="/pricing">Paketleri görüntüle</Link>
      </section>

      <section className="panel">
        <h2>Sık sorulan sorular</h2>
        {faqs.map((item) => (
          <article key={item.q} className="faq-item">
            <p><strong>{item.q}</strong></p>
            <p className="muted">{item.a}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
