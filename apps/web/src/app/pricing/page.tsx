import { SiteNavbar } from '@/components/site-navbar';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Fiyatlar</h1>
        <p className="mt-3 text-zinc-300">Koschei planları yakında burada detaylı olarak yayınlanacak.</p>
      </main>
    </div>
  );
}
