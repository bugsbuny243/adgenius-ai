import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Fiyatlar</h1>
        <p className="mt-3 max-w-3xl text-zinc-300">
          AdGenius AI planları ekip boyutuna ve kullanım hacmine göre kademeli olarak sunulur. Güncel paket
          ayrıntıları ve kurumsal teklifler için kısa süre içinde bu sayfada detaylı bir tablo yayınlanacaktır.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
