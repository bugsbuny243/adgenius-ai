import { PublicSiteNav } from '@/components/public-site-nav';

const agents = [
  {
    name: 'Koschei Blogger Agent',
    what: 'Blog yazısı planı, SEO başlıkları ve yayın öncesi içerik hazırlığı üretir.',
    status: 'Aktif',
    requirement: 'Hesap bağlantısı gerekebilir'
  },
  {
    name: 'Koschei Channel Planner',
    what: 'Video serisi akışı, bölüm başlıkları ve yayın takvimi hazırlar.',
    status: 'Aktif',
    requirement: 'Kullanıcı onayı gerektirir'
  },
  {
    name: 'Koschei Game Factory',
    what: 'Oyun fikrini görev planına çevirir, build hattı için üretim adımlarını yönetir.',
    status: 'Beta',
    requirement: 'Build kredisi gerekebilir'
  },
  {
    name: 'Koschei Publisher Assistant',
    what: 'Mağaza açıklamaları, sürüm notu taslakları ve yayın kontrol listesi oluşturur.',
    status: 'Beta',
    requirement: 'Kullanıcı onayı gerektirir'
  },
  {
    name: 'Koschei Sheets Agent',
    what: 'Operasyon tablolarını düzenler, görevleri sınıflandırır ve iş listeleri üretir.',
    status: 'Aktif',
    requirement: 'Hesap bağlantısı gerekebilir'
  },
  {
    name: 'Koschei Mail Assistant',
    what: 'İş e-postaları için yanıt taslakları ve takip mesajları hazırlar.',
    status: 'Aktif',
    requirement: 'Hesap bağlantısı gerekebilir'
  },
  {
    name: 'Koschei SEO Agent',
    what: 'Sayfa başlığı, meta önerisi ve indeksleme hazırlık kontrolü yapar.',
    status: 'Yakında',
    requirement: 'Kullanıcı onayı gerektirir'
  },
  {
    name: 'Koschei Research Agent',
    what: 'Konu araştırması yapar, kaynak notlarını özetler ve karar taslağı çıkarır.',
    status: 'Aktif',
    requirement: 'Kullanıcı onayı gerektirir'
  }
] as const;

export default function AgentsPage() {
  return (
    <main className="panel space-y-8">
      <PublicSiteNav />
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei Agent Library</p>
        <h1 className="text-4xl font-bold">Koschei Ajanları</h1>
        <p className="max-w-3xl text-white/75">
          İçerik, oyun, yayın ve iş süreçlerini tek panelden AI ajanlarıyla planla, üret ve yönet.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.name} className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{agent.name}</h2>
              <span className="rounded-md border border-neon/30 bg-neon/10 px-2 py-1 text-xs text-neon">{agent.status}</span>
            </div>
            <p className="mt-2 text-sm text-white/75">{agent.what}</p>
            <p className="mt-3 text-xs text-white/60">{agent.requirement}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
