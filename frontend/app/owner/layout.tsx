import { getOwnerAccessContextOrRedirect } from '@/lib/owner-access';
import { OwnerShell } from '@/app/owner/components/owner-shell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const context = await getOwnerAccessContextOrRedirect();

  return (
    <OwnerShell workspaceName={context.workspaceName} role={context.role} isSuperOwner={context.isSuperOwner}>
      {children}
    </OwnerShell>
  );
}
