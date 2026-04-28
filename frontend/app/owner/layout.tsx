import { requirePlatformOwner } from '@/lib/owner-auth';
import { OwnerShell } from '@/app/owner/components/owner-shell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const owner = await requirePlatformOwner();
  const ownerLabel = owner.email ?? owner.id;

  return <OwnerShell ownerLabel={ownerLabel}>{children}</OwnerShell>;
}
