import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

export default function EpostaAgentOrnekleriPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <h1 className="text-3xl font-semibold">E-posta agent örnekleri</h1>
        <p className="text-zinc-300">
          E-posta agentları; müşteri yanıtları, toplantı özetleri ve takip mesajları gibi tekrarlayan iletişim
          senaryolarında zaman kazandırır.
        </p>
        <p className="text-zinc-300">
          En iyi sonuç için mesaj amacı, alıcı profili ve beklenen aksiyonu prompt içinde net olarak belirtin.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
