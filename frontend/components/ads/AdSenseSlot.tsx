'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type AdSenseSlotProps = {
  slot: string;
  hasContent: boolean;
  className?: string;
};

const allowedExactRoutes = new Set(['/', '/blog', '/guides', '/about', '/pricing']);

function isAllowedPublicContentRoute(pathname: string) {
  if (allowedExactRoutes.has(pathname)) return true;
  return /^\/(blog|guides)\/[a-z0-9-]+$/.test(pathname);
}

export function AdSenseSlot({ slot, hasContent, className }: AdSenseSlotProps) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        if (mounted) setIsAuthenticated(false);
        return;
      }

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (mounted) {
        setIsAuthenticated(Boolean(user));
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const isEligible = useMemo(() => isAllowedPublicContentRoute(pathname), [pathname]);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;


  useEffect(() => {
    if (isAuthenticated === false && isEligible && hasContent && clientId) {
      try {
        ((window as typeof window & { adsbygoogle?: unknown[] }).adsbygoogle =
          (window as typeof window & { adsbygoogle?: unknown[] }).adsbygoogle || []).push({});
      } catch {
        // no-op
      }
    }
  }, [clientId, hasContent, isAuthenticated, isEligible]);
  if (!clientId || !isEligible || !hasContent || isAuthenticated !== false) {
    return null;
  }

  return (
    <div className={className}>
      <Script id="koschei-adsense-script" async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`} crossOrigin="anonymous" strategy="afterInteractive" />
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
