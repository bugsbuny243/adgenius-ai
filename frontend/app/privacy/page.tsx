import type { Metadata } from 'next';
import { PublicSiteNav } from '@/components/public-site-nav';

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Koschei',
  description: 'Koschei gizlilik politikası.'
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#020617] text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <PublicSiteNav />
      </div>
      <div className="max-w-4xl mx-auto py-16 px-6 prose prose-invert text-slate-300">
        <h1 className="!text-cyan-400 !font-extrabold">Gizlilik Politikası</h1>
        <p>Son güncelleme: 23 Nisan 2026.</p>

        <h2 className="!text-cyan-400 !font-bold">1. Toplanan Bilgiler</h2>
        <p>Hesap bilgileri, proje verileri, içerik girdileri ve teknik kayıtlar hizmeti sağlamak için işlenebilir.</p>

        <h2 className="!text-cyan-400 !font-bold">2. OAuth ve Entegrasyonlar</h2>
        <p>Google OAuth erişimi yalnızca kullanıcı onayı verilen kapsamlarla sınırlıdır ve token verileri güvenli sunucu katmanında saklanır.</p>

        <h2 className="!text-cyan-400 !font-bold">3. Veri Kullanımı</h2>
        <p>Veriler; kimlik doğrulama, üretim iş akışları, güvenlik izleme, hata giderme ve destek süreçleri için kullanılır.</p>

        <h2 className="!text-cyan-400 !font-bold">4. Veri Saklama ve Güvenlik</h2>
        <p>Veriler gerekli süre boyunca saklanır; erişim kontrolü ve güvenlik denetimleri uygulanır.</p>

        <h2 className="!text-cyan-400 !font-bold">5. İletişim</h2>
        <p>Gizlilik soruları için: onur24sel@gmail.com</p>
      </div>
    </main>
  );
}
