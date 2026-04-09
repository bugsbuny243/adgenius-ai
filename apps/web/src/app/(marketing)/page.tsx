import Link from "next/link";
import { LiveEditor } from "@/components/editor/live-editor";
import { Adsense } from "@/components/layout/adsense";
import { Button } from "@/components/ui/button";

export default function MarketingHomePage() {
  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Koschei AI Platformu</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight">Premium üretim akışını tek panelden yönetin.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">Koschei, ekiplerin içerik, büyüme ve dönüşüm işlerini kurumsal ölçekli biçimde yönetmesini sağlar.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/workspace">
            <Button>Çalışma Alanına Geç</Button>
          </Link>
          <Link href="/workspace">
            <Button variant="ghost">Hemen Başlat</Button>
          </Link>
        </div>
      </section>
      <LiveEditor />
      <section className="glass rounded-2xl p-6">
        <h2 className="mb-3 text-lg font-semibold">Sponsorlu Alan</h2>
        <Adsense />
      </section>
    </div>
  );
}
