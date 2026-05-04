import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Koschei',
  description: 'Koschei kullanım koşulları.'
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <PublicSiteNav />
      </div>
      <div className="max-w-4xl mx-auto py-16 px-6 prose prose-invert text-slate-300">
        <h1 className="!text-cyan-400 !font-extrabold">Kullanım Koşulları</h1>
        <p>Son güncelleme: 23 Nisan 2026.</p>

        <h2 className="!text-cyan-400 !font-bold">1. Hizmet Kapsamı</h2>
        <p>Koschei; oyun üretim iş akışları, proje yönetimi ve AI destekli otomasyon için bir platform sağlar.</p>

        <h2 className="!text-cyan-400 !font-bold">2. Kullanıcı Sorumlulukları</h2>
        <p>Kullanıcı, hesap güvenliğinden ve platform üzerinde yürütülen işlemlerin uygunluğundan sorumludur.</p>

        <h2 className="!text-cyan-400 !font-bold">3. Yasaklı Kullanım</h2>
        <p>Yasa dışı faaliyetler, kötüye kullanım, spam ve yetkisiz erişim girişimleri yasaktır.</p>

        <h2 className="!text-cyan-400 !font-bold">4. Hizmet Değişiklikleri</h2>
        <p>Bakım, güvenlik veya yasal zorunluluklar nedeniyle hizmette kesinti ya da değişiklik olabilir.</p>

        <h2 className="!text-cyan-400 !font-bold">5. İletişim</h2>
        <p>Sorularınız için: onur24sel@gmail.com</p>
      </div>
    </main>
  );
}
