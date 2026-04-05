'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { signOut } from '@/lib/auth';
import { createBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const appNavItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agentlar' },
  { href: '/runs', label: 'Çalıştırmalar' },
  { href: '/saved', label: 'Kaydedilenler' },
  { href: '/settings', label: 'Ayarlar' },
];

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const loginRedirectPath = useMemo(() => {
    const nextPath = pathname && pathname !== '/' ? pathname : '/dashboard';
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      try {
        if (!isSupabaseConfigured()) {
          router.replace('/login');
          return;
        }

        const supabase = createBrowserSupabase();
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.access_token) {
          router.replace(loginRedirectPath);
          return;
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    void verifySession();

    if (!isSupabaseConfigured()) {
      return () => {
        mounted = false;
      };
    }

    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        router.replace(loginRedirectPath);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loginRedirectPath, router]);

  async function onLogout() {
    await signOut();
    router.replace('/login');
    router.refresh();
  }

  if (checkingAuth) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">Oturum kontrol ediliyor...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:flex-row">
        <aside className="h-fit min-w-64 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-4 text-lg font-semibold">AdGenius AI</div>
          <nav className="space-y-1">
            {appNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white',
                  pathname.startsWith(item.href) && 'bg-zinc-800 text-white'
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
