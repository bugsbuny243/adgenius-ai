'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const primaryLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agentlar' },
  { href: '/runs', label: 'Çalışmalar' },
  { href: '/settings', label: 'Ayarlar' }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

const secondaryLinks = [
  { href: '/projects', label: 'Projeler' },
  { href: '/saved', label: 'Kaydedilenler' },
  { href: '/composer', label: 'Yayın Kuyruğu' }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

type NavProps = {
  showOwnerLink?: boolean;
  showSuperOwnerBadge?: boolean;
};

export function Nav({ showOwnerLink = false, showSuperOwnerBadge = false }: NavProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }

    router.push('/signin');
    router.refresh();
  }

  return (
    <nav className="mb-8 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-lilac">Koschei</p>
          <h1 className="text-2xl font-semibold">Koschei AI</h1>
          <p className="text-xs text-white/55">AI destekli üretim alanı</p>
          {showSuperOwnerBadge ? (
            <p className="mt-2 inline-flex rounded-full border border-amber-300/60 bg-amber-400/10 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-100">
              Super Owner
            </p>
          ) : null}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/upgrade" className="rounded-xl border border-neon/60 px-4 py-2 text-sm text-neon transition hover:bg-neon/10">
            Planı Yükselt
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:border-neon hover:text-neon"
          >
            Çıkış
          </button>
        </div>
      </div>

      <div className="hidden space-y-2 md:block">
        <div className="flex flex-wrap gap-2">
          {primaryLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl border px-4 py-2 text-sm transition ${
                  active
                    ? 'border-neon/70 bg-neon/10 text-neon'
                    : 'border-white/10 text-white/85 hover:border-neon hover:text-neon'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {showOwnerLink ? (
            <Link href="/owner" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/85 hover:border-neon hover:text-neon">
              Owner Panel
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {secondaryLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={`rounded-xl border px-3 py-1.5 text-xs ${active ? 'border-white/40 text-white' : 'border-white/10 text-white/60 hover:text-white/85'}`}>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <details className="w-full md:hidden">
        <summary className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm">Menü</summary>
        <div className="mt-2 grid gap-2">
          {[...primaryLinks, ...(showOwnerLink ? [{ href: '/owner' as const satisfies Route, label: 'Owner Panel' }] : [])].map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={`rounded-xl border px-4 py-2 text-sm ${active ? 'border-neon/70 text-neon' : 'border-white/10'}`}>
                {link.label}
              </Link>
            );
          })}
          <p className="px-1 pt-2 text-[11px] uppercase tracking-wide text-white/45">İkincil</p>
          {secondaryLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={`rounded-xl border px-4 py-2 text-sm ${active ? 'border-white/40 text-white' : 'border-white/10 text-white/70'}`}>
                {link.label}
              </Link>
            );
          })}
          <Link href="/upgrade" className="rounded-xl border border-neon/60 px-4 py-2 text-sm text-neon">
            Planı Yükselt
          </Link>
          <button type="button" onClick={handleSignOut} className="rounded-xl border border-white/10 px-4 py-2 text-left text-sm">
            Çıkış
          </button>
        </div>
      </details>
    </nav>
  );
}
