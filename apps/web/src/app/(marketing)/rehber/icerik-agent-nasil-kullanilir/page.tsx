import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

export default function IcerikAgentNasilKullanilirPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
        <h1 className="text-3xl font-semibold">İçerik agent nasıl kullanılır?</h1>
        <p className="text-zinc-300">
          Önce hedef kitle, ton ve içerik amacı gibi temel bağlamı netleştirin. Ardından kısa ama açık bir görev
          metni ile agentı çalıştırın.
        </p>
        <p className="text-zinc-300">
          İlk çıktıyı doğrudan yayınlamak yerine başlık, veri doğruluğu ve marka dili açısından gözden geçirerek son
          sürümü oluşturun.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
