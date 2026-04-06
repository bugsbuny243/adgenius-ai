'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { signOut } from '@/lib/auth';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { resolveWorkspaceContext } from '@/lib/workspace';

type WorkspaceOption = {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
};

const appNavItems = [
  { href: '/dashboard', label: 'Panel' },
  { href: '/projects', label: 'Projeler' },
  { href: '/agents', label: 'Agentlar' },
  { href: '/runs', label: 'Geçmiş Çalışmalar' },
  { href: '/saved', label: 'Kayıtlı Çıktılar' },
  { href: '/settings', label: 'Ayarlar' },
];

const roleLabel: Record<WorkspaceOption['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);

  const loginRedirectPath = useMemo(() => {
    const nextPath = pathname && pathname !== '/' ? pathname : '/dashboard';
    return `/signin?next=${encodeURIComponent(nextPath)}`;
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      try {
        const supabase = createBrowserSupabase();
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        const hasSession = Boolean(session?.access_token);
        if (error || !hasSession) {
          setIsAuthenticated(false);
          router.replace(loginRedirectPath);
          return;
        }

        setIsAuthenticated(true);

        const { workspace } = await resolveWorkspaceContext(supabase);
        const { data: workspaceRows } = await supabase
          .from('workspace_members')
          .select('workspace_id, role, workspaces!inner(id, name)')
          .order('created_at', { ascending: true });

        const options = (workspaceRows ?? []).flatMap((row) => {
          const item = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
          if (!item) {
            return [];
          }

          return [
            {
              id: item.id,
              name: item.name,
              role: row.role as WorkspaceOption['role'],
            },
          ];
        });

        if (mounted) {
          setWorkspaces(options);
          setCurrentWorkspaceId(workspace.id);
        }
      } catch {
        setIsAuthenticated(false);
        router.replace(loginRedirectPath);
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    void verifySession();

    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        setIsAuthenticated(false);
        router.replace(loginRedirectPath);
        return;
      }

      setIsAuthenticated(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loginRedirectPath, router]);

  async function onSwitchWorkspace(nextWorkspaceId: string) {
    const supabase = createBrowserSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    await supabase.from('user_workspace_preferences').upsert({
      user_id: user.id,
      current_workspace_id: nextWorkspaceId,
    });

    setCurrentWorkspaceId(nextWorkspaceId);
    router.refresh();
  }

  async function onLogout() {
    await signOut();
    setIsAuthenticated(false);
    router.replace('/signin');
    router.refresh();
  }

  function onNewTask() {
    const lastAgentType = window.localStorage.getItem('koschei:last-agent-type');
    if (lastAgentType) {
      router.push(`/workspace/${lastAgentType}`);
      return;
    }

    router.push('/dashboard');
  }

  if (checkingAuth) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">Oturum kontrol ediliyor...</div>;
  }

  if (!isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">Giriş sayfasına yönlendiriliyor...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row">
        <aside className="h-fit min-w-64 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="text-lg font-semibold">Koschei AI</span>
            <button
              type="button"
              onClick={onNewTask}
              className="rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-400"
            >
              Yeni Görev
            </button>
          </div>

          <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2">
            <label className="mb-1 block text-xs text-zinc-400">Workspace</label>
            <select
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
              value={currentWorkspaceId ?? ''}
              onChange={(event) => void onSwitchWorkspace(event.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name} ({roleLabel[workspace.role]})
                </option>
              ))}
            </select>
          </div>

          <nav className="space-y-1">
            {appNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white',
                  pathname.startsWith(item.href) && 'bg-zinc-800 text-white',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            className="mt-4 w-full rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Çıkış Yap
          </button>
        </aside>
        <main className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">{children}</main>
      </div>
    </div>
  );
}
