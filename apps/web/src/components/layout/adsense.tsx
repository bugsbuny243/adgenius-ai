"use client";

import Script from "next/script";

export const Adsense = () => {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_ADSENSE === "true";
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (!enabled || !client) {
    return null;
  }

  return (
    <>
      <Script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} crossOrigin="anonymous" strategy="afterInteractive" />
      <ins className="adsbygoogle block min-h-24 w-full" data-ad-client={client} data-ad-slot="1234567890" data-ad-format="auto" data-full-width-responsive="true" />
    </>
  );
};
