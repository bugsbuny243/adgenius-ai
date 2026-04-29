import { OwnerShell } from '@/app/owner/components/owner-shell';
import { getOwnerAccess } from '@/lib/owner-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, isOwner } = await getOwnerAccess();
  const ownerLabel = user.email ?? user.id;

  if (!isOwner) {
    return (
      <main>
        <OwnerShell ownerLabel={ownerLabel} isOwner={false}>
          <section className="panel">
            <h2 className="text-lg font-semibold">Owner Panel</h2>
            <p className="mt-3 text-sm text-rose-200">Bu sayfaya erişim yetkiniz yok.</p>
          </section>
        </OwnerShell>
      </main>
    );
  }

  return <OwnerShell ownerLabel={ownerLabel} isOwner>{children}</OwnerShell>;
}
