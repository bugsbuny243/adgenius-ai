import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

export default function AIAgentNedirPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <h1 className="text-3xl font-semibold">AI agent nedir?</h1>
        <p className="text-zinc-300">
          AI agent, belirli bir hedef için girdi alıp çıktı üreten ve bu süreci tekrar edilebilir hale getiren yazılım
          bileşenidir.
        </p>
        <p className="text-zinc-300">
          AdGenius AI içinde agentlar; içerik oluşturma, e-posta taslakları hazırlama, araştırma notları üretme gibi
          görevleri hızlandırmak için kullanılır.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
