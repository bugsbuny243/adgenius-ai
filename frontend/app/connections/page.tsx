import Link from 'next/link';
import { Nav } from '@/components/nav';
import { bloggerConnector } from '@/lib/connectors/blogger';
import { instagramConnector } from '@/lib/connectors/instagram';
import { tiktokConnector } from '@/lib/connectors/tiktok';
import { youtubeConnector } from '@/lib/connectors/youtube';
import type { ConnectorStatus } from '@/lib/connectors/types';
import { getEnvDiagnostics } from '@/lib/env';

export const dynamic = 'force-dynamic';

type ConnectionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const GOOGLE_STATUS_BANNERS: Record<string, { tone: 'success' | 'error'; message: string }> = {
  connected: { tone: 'success', message: 'Google bağlantısı tamamlandı. YouTube ve Blogger erişimi güncellendi.' },
  disconnected: { tone: 'success', message: 'Google bağlantısı kaldırıldı.' },
  failed: { tone: 'error', message: 'Bağlantı tamamlanamadı. Lütfen tekrar deneyin.' },
  expired: { tone: 'error', message: 'Bağlantı oturumu zaman aşımına uğradı. Tekrar bağlanın.' },
  workspace_required: { tone: 'error', message: 'Geçerli bir çalışma alanı bulunamadı.' }
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('tr-TR');
}

function formatScopeSummary(scopes: string[] | undefined): string {
  if (!scopes?.length) return 'Scope bilgisi yok';
  const compact = scopes.map((scope) => scope.split('/').pop() ?? scope);
  return compact.slice(0, 3).join(', ');
}

function ConnectionCard({ item }: { item: ConnectorStatus }) {
  const isConnected = item.state === 'connected';
  const platformLabel = item.platform === 'youtube' ? 'YouTube' : item.platform === 'blogger' ? 'Blogger' : item.platform;
  const isGoogleOAuthPlatform = item.platform === 'youtube' || item.platform === 'blogger';

  return (
    <article className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{platformLabel}</h3>
        <span className={`rounded-md border px-2 py-1 text-xs ${isConnected ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-200' : 'border-white/20 text-white/70'}`}>
          {isConnected ? 'Bağlı' : 'Bağlı değil'}
        </span>
      </div>

      <p className="mt-3 text-sm text-white/70">
        {isConnected
          ? 'Yayın hazırlığında bu hesabı kullanabilirsiniz.'
          : isGoogleOAuthPlatform
            ? 'Bağlantıyı açarak yayın hazırlığı ve hesap doğrulaması akışını aktif edebilirsiniz.'
            : 'Bu platform manuel yayın hazırlığı akışıyla çalışır.'}
      </p>

      <div className="mt-4 grid gap-2 text-sm text-white/80">
        <p><span className="text-white/55">Hesap:</span> {item.accountLabel ?? item.providerAccountId ?? '—'}</p>
        <p><span className="text-white/55">Bağlantı tarihi:</span> {formatDate(item.connectedAt)}</p>
        <p><span className="text-white/55">Son senkron:</span> {formatDate(item.lastSyncedAt)}</p>
        {item.channelId ? <p><span className="text-white/55">Channel ID:</span> {item.channelId}</p> : null}
        {item.blogId ? <p><span className="text-white/55">Blog ID:</span> {item.blogId}</p> : null}
        <p><span className="text-white/55">Scope özeti:</span> {formatScopeSummary(item.scopes)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {isGoogleOAuthPlatform && isConnected ? (
          <>
            <Link href="/api/integrations/google/connect" className="rounded-lg border border-neon/50 px-3 py-2 text-xs text-neon hover:bg-neon/10">Yeniden bağlan</Link>
            <form action="/api/integrations/google/disconnect" method="post">
              <button type="submit" className="rounded-lg border border-white/25 px-3 py-2 text-xs hover:border-red-300/40 hover:text-red-200">Bağlantıyı kaldır</button>
            </form>
          </>
        ) : isGoogleOAuthPlatform ? (
          <Link href="/api/integrations/google/connect" className="rounded-lg border border-neon/50 px-3 py-2 text-xs text-neon hover:bg-neon/10">Google ile bağlan</Link>
        ) : (
          <span className="rounded-lg border border-white/25 px-3 py-2 text-xs text-white/70">Manuel yayın hazırlığı</span>
        )}
      </div>
    </article>
  );
}

export default async function ConnectionsPage({ searchParams }: ConnectionsPageProps) {
  const params = (await searchParams) ?? {};
  const googleStatusParam = params.google;
  const googleStatus = Array.isArray(googleStatusParam) ? googleStatusParam[0] : googleStatusParam;
  const googleBanner = googleStatus ? GOOGLE_STATUS_BANNERS[googleStatus] : null;

  const statuses = await Promise.all([
    youtubeConnector.getStatus(),
    bloggerConnector.getStatus(),
    instagramConnector.getStatus(),
    tiktokConnector.getStatus()
  ]);
  const diagnostics = getEnvDiagnostics();
  const googleOAuthConfigured =
    Boolean(diagnostics.serverEnv.GOOGLE_CLIENT_ID) &&
    Boolean(diagnostics.serverEnv.GOOGLE_CLIENT_SECRET) &&
    Boolean(diagnostics.serverEnv.GOOGLE_REDIRECT_URI);

  return (
    <main>
      <Nav />
      {googleBanner ? (
        <section className={`mb-4 rounded-xl border p-3 text-sm ${googleBanner.tone === 'success' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/40 bg-rose-500/10 text-rose-200'}`}>
          {googleBanner.message}
        </section>
      ) : null}
      <section className="panel">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Bağlantılar</h2>
            <p className="text-sm text-white/70">YouTube ve Blogger bağlantılarını tek merkezde yönetin.</p>
          </div>
          <Link href="/settings" className="rounded-lg border border-white/20 px-3 py-2 text-xs hover:border-neon">Ayar özetine dön</Link>
        </div>
        <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/75">
          <p>Google OAuth durumu: {googleOAuthConfigured ? 'bağlantıya hazır' : 'kurulum gerekli'}</p>
          <p className="mt-1">Google bağlantısı YouTube/Blogger yayın akışları için kullanılır.</p>
          <p className="mt-1">YouTube ve Blogger Google OAuth ile çalışır. Instagram ve TikTok akışları manuel yayın hazırlığı modunda kullanılabilir.</p>
          {!googleOAuthConfigured ? (
            <p className="mt-1 text-amber-100">Google doğrulaması tamamlanana kadar bu bağlantı geliştirici/test kullanıcılarıyla sınırlı olabilir.</p>
          ) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {statuses.map((item) => <ConnectionCard key={item.platform} item={item} />)}
        </div>
      </section>
    </main>
  );
}
