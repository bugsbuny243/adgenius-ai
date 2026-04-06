import { SiteFooter } from '@/components/layout/footer';
import { SiteNavbar } from '@/components/layout/navbar';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteNavbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-semibold">İletişim</h1>
        <p className="text-zinc-300">
          Koschei AI ürün ekibi; iş ortaklığı, kurumsal kullanım ve teknik geri bildirim konularında destek sağlar.
        </p>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-sm text-zinc-400">E-posta</p>
          <a href="mailto:contact@koschei.ai" className="mt-1 inline-block text-indigo-300 hover:text-indigo-200">
            contact@koschei.ai
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
