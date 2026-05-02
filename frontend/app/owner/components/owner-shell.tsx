import Link from 'next/link';
import { Nav } from '@/components/nav';

type OwnerShellProps = {
  ownerLabel: string;
  children: React.ReactNode;
};

export const OWNER_LINKS = [
  { href: '/owner', label: 'Genel Bakış' },
  { href: '/owner/dashboard', label: 'Dashboard' },
  { href: '/owner/users', label: 'Kullanıcılar' },
  { href: '/owner/payments', label: 'Ödemeler' },
  { href: '/owner/subscriptions', label: 'Abonelikler' },
  { href: '/owner/game-factory', label: 'Game Factory' },
  { href: '/owner/build-jobs', label: 'Build İşleri' },
  { href: '/owner/release-jobs', label: 'Yayın İşleri' },
  { href: '/owner/integrations', label: 'Sistem Entegrasyonları' },
  { href: '/owner/settings', label: 'Ayarlar' },
  { href: '/owner/logs', label: 'Loglar / Hata Kayıtları' }
] as const;

export function OwnerShell({ ownerLabel, children }: OwnerShellProps) {
  return (
    <main>
      <Nav showOwnerLink />
      <section className="mb-4 rounded-xl border border-amber-300/40 bg-amber-500/10 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-100">Owner Control Plane</p>
        <h1 className="mt-1 text-xl font-semibold">Platform Owner</h1>
        <p className="text-sm text-amber-50/90">Yetkili hesap: {ownerLabel}</p>
      </section>
      <section className="mb-4 flex flex-wrap gap-2">
        {OWNER_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:border-neon">
            {link.label}
          </Link>
        ))}
      </section>
      {children}
    </main>
  );
}
