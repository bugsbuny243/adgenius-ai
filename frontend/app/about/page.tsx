import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Hakkımızda | Koschei AI',
  description: 'Koschei AI ürün vizyonu, çalışma yaklaşımı ve mevcut kapsamı hakkında bilgi alın.'
};

export default function AboutPage() {
  return (
    <main className="panel space-y-4">
      <PublicSiteNav />
      <h1 className="text-3xl font-bold">Hakkımızda</h1>
      <p className="text-white/75">
        Koschei AI, içerik operasyonu yürüten ekiplerin süreçlerini daha görünür ve yönetilebilir hale getirmek için
        geliştirilen bir Next.js tabanlı ürün deneyimidir.
      </p>
      <p className="text-white/75">
        Platform; görev akışı takibi, AI destekli taslak üretimi ve ekip içi koordinasyon adımlarını aynı çalışma
        alanında toplar. Yaklaşımımız “insan denetimli hızlandırma”dır: ürün ekiplerin yerine karar vermez, ekiplerin
        daha hızlı ve tutarlı çalışmasına yardımcı olur.
      </p>
      <p className="text-white/75">
        Yol haritamızda entegrasyon ve otomasyon yeteneklerinin genişletilmesi bulunur. Ancak yalnızca aktif ve testten
        geçmiş özellikleri canlı ürün kapsamı olarak sunarız.
      </p>
    </main>
  );
}
