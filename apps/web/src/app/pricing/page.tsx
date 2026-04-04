export default function PricingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel"><h2 className="font-semibold">Starter</h2><p>5 ajan / 1 organizasyon</p></div>
        <div className="panel"><h2 className="font-semibold">Scale</h2><p>Sınırsız run + approval akışı</p></div>
        <div className="panel"><h2 className="font-semibold">Enterprise</h2><p>SSO, audit, özel SLA</p></div>
      </div>
    </div>
  )
}
