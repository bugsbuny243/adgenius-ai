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
    <aside className="w-full rounded-sm border border-white/10 bg-white/5 p-3 backdrop-blur-md lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-24 lg:self-start">
      <div className="mb-4 border-b border-white/10 pb-3 text-center">
        <p className="text-[9px] uppercase tracking-[0.24em] text-neon/80">CTRL</p>
      </div>

      <nav className="space-y-2">
        {userLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              className={`group relative flex items-center justify-center rounded-sm border px-2 py-3 transition ${active ? 'border-neon/40 bg-neon/10 text-neon shadow-neon-cyan' : 'border-transparent text-zinc-400 hover:border-cyberPink/35 hover:bg-cyberPink/10 hover:text-cyberPink hover:shadow-neon-pink'}`}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      {showOwnerLink ? <p className="mt-4 text-center text-[10px] text-zinc-500">owner</p> : null}

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-5 flex w-full items-center justify-center rounded-sm border border-neon/30 bg-neon/10 px-2 py-3 text-neon transition hover:shadow-neon-cyan"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </aside>
  );
}
