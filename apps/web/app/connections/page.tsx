import { Nav } from '@/components/nav';
import { instagramConnector } from '@/lib/connectors/instagram';
import { tiktokConnector } from '@/lib/connectors/tiktok';
import { youtubeConnector } from '@/lib/connectors/youtube';

export const dynamic = 'force-dynamic';

export default async function ConnectionsPage() {
  const statuses = await Promise.all([
    youtubeConnector.getStatus(),
    instagramConnector.getStatus(),
    tiktokConnector.getStatus()
  ]);

  return (
    <main>
      <Nav />
      <section className="panel">
        <h2 className="mb-4 text-xl font-semibold">Bağlantılar</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {statuses.map((item) => (
            <article key={item.platform} className="rounded-xl border border-white/10 p-4">
              <p className="text-lg font-semibold capitalize">{item.platform}</p>
              <p className="text-sm text-white/70">Durum: {item.label}</p>
              <p className="mt-2 text-xs text-white/50">Gerçek OAuth yakında eklenecek.</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
