const plans = [
  { name: 'Başlangıç', price: '₺499/ay', desc: 'Aylık 100 run, tek workspace, temel agent kullanımı.' },
  { name: 'Büyüme', price: '₺1.999/ay', desc: 'Aylık 1.000 run, ekip üyeleri, öncelikli destek.' },
  { name: 'Kurumsal', price: 'İletişime geçin', desc: 'Özel limitler, güvenlik incelemeleri ve kurumsal onboarding.' },
]

export default function PricingPage() {
  return (
    <section className="space-y-4">
      <h1 className="page-title">Fiyatlandırma</h1>
      <p className="muted">Koschei planları ile kullanım limitinizi ve ekip kapasitenizi ölçekleyin.</p>
      <div className="card-grid">
        {plans.map((plan) => (
          <article key={plan.name} className="panel">
            <h2>{plan.name}</h2>
            <p><strong>{plan.price}</strong></p>
            <p className="muted">{plan.desc}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
