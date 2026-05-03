'use client';

import { Home, LogOut, Package2, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const userLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/game-factory', label: 'Game Factory', icon: Sparkles },
  { href: '/pricing', label: 'Packages', icon: Package2 },
  { href: '/settings', label: 'Settings', icon: Settings }
] as const satisfies ReadonlyArray<{ href: Route; label: string; icon: typeof Home }>;

type NavProps = { showOwnerLink?: boolean };

export function Nav({ showOwnerLink = false }: NavProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.push('/signin');
    router.refresh();
  }

  return (
    <aside className="w-full rounded-2xl border border-white/5 bg-zinc-900/40 p-4 shadow-[0_0_30px_-10px_rgba(139,92,246,0.2)] backdrop-blur-xl lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-72 lg:self-start">
      <div className="mb-6 border-b border-white/5 pb-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-violet-300">Koschei Control</p>
        <h1 className="mt-2 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">Cyber Console</h1>
      </div>

      <nav className="space-y-1.5">
        {userLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${active ? 'border-white/10 bg-white/5 text-zinc-100' : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-zinc-200'}`}
            >
              <span className={`absolute inset-y-1 left-0 w-0.5 rounded-full ${active ? 'bg-violet-400' : 'bg-transparent group-hover:bg-white/30'}`} />
              <Icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {showOwnerLink ? <p className="mt-4 text-xs text-zinc-500">Owner links are available in owner pages.</p> : null}

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/30 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_22px_-8px_rgba(139,92,246,0.8)] transition hover:brightness-110"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}
