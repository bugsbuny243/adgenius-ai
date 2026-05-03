'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const userLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/game-factory', label: 'Game Factory' },
  { href: '/settings', label: 'Ayarlar' }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

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
    <aside className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md lg:w-72 lg:min-h-[75vh]">
      <p className="text-xs uppercase tracking-[0.2em] text-violet-300">Koschei Control</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">AI Dashboard</h1>
      <p className="mt-1 text-xs text-zinc-400">AI destekli oyun üretim alanı</p>
      <div className="mt-5 space-y-2">
        {userLinks.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return <Link key={link.href} href={link.href} className={`block rounded-full px-4 py-2 text-sm transition ${active ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'border border-white/10 text-zinc-300 hover:scale-105 hover:border-violet-400/60'}`}>{link.label}</Link>;
        })}
      </div>
      {showOwnerLink ? <p className="mt-4 text-xs text-zinc-500">Owner bağlantıları owner sayfalarında görünür.</p> : null}
      <button type="button" onClick={handleSignOut} className="mt-6 w-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105">Çıkış</button>
    </aside>
  );
}
