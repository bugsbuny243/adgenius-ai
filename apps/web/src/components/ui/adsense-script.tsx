import Script from 'next/script';

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const adsenseEnabled = process.env.NEXT_PUBLIC_ENABLE_ADSENSE === 'true';

export function AdSenseScript() {
  if (!adsenseEnabled || !adsenseClient) {
    return null;
  }

  return (
    <Script
      id="adsense-global-script"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
      crossOrigin="anonymous"
    />
  );
}
