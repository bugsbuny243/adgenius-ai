import { AdSlotPlaceholder, MobileAnchorAdPlaceholder } from '@/components/ads/ad-slot-placeholder';
import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-semibold">Kullanım Şartları</h1>
        <p className="text-zinc-300">
          AdGenius AI hizmetini kullanan herkes, platformu yürürlükteki mevzuata uygun şekilde kullanmaktan sorumludur.
        </p>
        <p className="text-zinc-300">
          Hizmet sürekliliği için azami çaba gösterilse de bakım, güncelleme veya teknik nedenlerle geçici erişim
          kesintileri yaşanabilir.
        </p>
        <p className="text-zinc-300">
          AI tarafından üretilen çıktılar bilgilendirme ve üretim desteği amacı taşır; nihai doğrulama ve kullanım
          kararı kullanıcıya aittir.
        </p>
        <p className="text-zinc-300">
          Paket türüne göre kullanım limiti, kota veya abonelik koşulları uygulanabilir. İhlal durumunda erişim
          sınırlandırılabilir.
        </p>

        <AdSlotPlaceholder
          slotId="marketing-terms-content"
          label="İçerik/Rehber reklam alanı (yakında)"
          minHeight={120}
          className="mt-8"
        />
        <MobileAnchorAdPlaceholder slotId="marketing-terms-mobile-anchor" />
      </main>
      <SiteFooter />
    </div>
  );
}
