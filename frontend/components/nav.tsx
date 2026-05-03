'use client';

import { Home, Package2, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const userLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/game-factory', label: 'Game Factory', icon: Sparkles },
  { href: '/pricing', label: 'Packages', icon: Package2 },
  { href: '/settings', label: 'Ayarlar', icon: Settings }
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
    <aside className="w-full rounded-3xl border border-white/10 bg-zinc-900/50 p-5 shadow-2xl shadow-black/50 backdrop-blur-xl lg:sticky lg:top-8 lg:w-72 lg:self-start">
      <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Koschei Control</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">AI Dashboard</h1>
      <p className="mt-1 text-xs text-zinc-400">AI destekli oyun üretim alanı</p>
      <div className="mt-6 space-y-2">
        {userLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return <Link key={link.href} href={link.href} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-transform hover:scale-[1.02] active:scale-[0.98] ${active ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'border border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-violet-400/60'}`}><Icon className="h-4 w-4" />{link.label}</Link>;
        })}
      </div>
      {showOwnerLink ? <p className="mt-4 text-xs text-zinc-500">Owner bağlantıları owner sayfalarında görünür.</p> : null}
      <button type="button" onClick={handleSignOut} className="mt-6 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] hover:bg-zinc-200 active:scale-[0.98]">Çıkış</button>
    </aside>
  );
}
