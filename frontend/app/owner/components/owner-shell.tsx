import Link from 'next/link';
import { Nav } from '@/components/nav';

type OwnerShellProps = {
  workspaceName: string;
  role: string;
  isSuperOwner: boolean;
  children: React.ReactNode;
};

const OWNER_LINKS = [
  { href: '/owner/system', label: 'Sistem Durumu' },
  { href: '/owner/unity', label: 'Unity Operasyon' },
  { href: '/owner/ads', label: 'Reklam Yönetimi' },
  { href: '/owner/payments', label: 'Ödemeler' },
  { href: '/owner/users', label: 'Kullanım / Limitler' }
] as const;

export function OwnerShell({ workspaceName, role, isSuperOwner, children }: OwnerShellProps) {
  return (
    <main>
      <Nav showOwnerLink={isSuperOwner} showSuperOwnerBadge={isSuperOwner} />
      <section className="mb-4 rounded-xl border border-amber-300/40 bg-amber-500/10 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-100">Owner Control Plane</p>
        <h1 className="mt-1 text-xl font-semibold">{workspaceName}</h1>
        <p className="text-sm text-amber-50/90">
          Internal owner scope • role: {role}
          {isSuperOwner ? ' • super owner override active' : ''}
        </p>
      </section>
      {isSuperOwner ? (
        <section className="mb-4 flex flex-wrap gap-2">
          {OWNER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg border border-white/15 px-3 py-2 text-sm hover:border-neon">
              {link.label}
            </Link>
          ))}
        </section>
      ) : null}
      {children}
    </main>
  );
}
