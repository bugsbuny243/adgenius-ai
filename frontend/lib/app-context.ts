import { redirect } from 'next/navigation';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase-server';
import { getWorkspaceContextOrNull, type WorkspaceContext } from '@/lib/workspace';

export type AppContext = {
  userId: string;
  workspace: WorkspaceContext;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
};

export async function getAppContextOrRedirect(): Promise<AppContext> {
  if (!isSupabaseServerConfigured()) {
    redirect('/signin?error=supabase_not_configured');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const workspace = await getWorkspaceContextOrNull();

  if (!workspace) {
    throw new Error('Çalışma alanı bulunamadı.');
  }

  return { userId: user.id, workspace, supabase };
}
