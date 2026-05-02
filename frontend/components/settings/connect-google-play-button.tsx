'use client';

import { Play } from 'lucide-react';

export function ConnectGooglePlayButton() {
  return (
    <a
      href="/api/google/auth"
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
    >
      <Play className="h-5 w-5" />
      Google Play Console'u Bağla
    </a>
  );
}
