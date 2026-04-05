'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { createBrowserSupabase } from '@/lib/supabase/client';

const guestNavItems = [
  { href: '/agents', label: 'Agentlar' },
  { href: '/pricing', label: 'Fiyatlar' },
  { href: '/about', label: 'Hakkımızda' },
  { href: '/contact', label: 'İletişim' },
  { href: '/signin', label: 'Giriş' },
  { href: '/signup', label: 'Kayıt' },
];

const authNavItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/agents', label: 'Agentlar' },
  { href: '/pricing', label: 'Fiyatlar' },
  { href: '/about', label: 'Hakkımızda' },
];

export function SiteNavbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await createBrowserSupabase().auth.getUser();

      setIsAuthenticated(Boolean(user));
    }

    void checkAuth();
  }, []);

  const navItems = isAuthenticated ? authNavItems : guestNavItems;

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          AdGenius AI
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-zinc-300 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
