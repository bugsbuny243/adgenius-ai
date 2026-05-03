'use client';

import { motion } from 'framer-motion';

type Props = {
  unityJobCount: number;
  profileCount: number;
  purchaseCount: number;
};

function Gauge({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="rounded-2xl border border-cyan-400/40 bg-white/5 p-4 backdrop-blur-md">
      <p className="text-xs uppercase tracking-widest text-cyan-200">{label}</p>
      <div className="relative mt-3 h-24 w-24">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="50" stroke="rgba(34,211,238,0.2)" strokeWidth="10" fill="none" />
          <circle cx="60" cy="60" r="50" stroke="rgb(34,211,238)" strokeWidth="10" fill="none" strokeDasharray="314" strokeDashoffset={314 - (314 * pct) / 100} />
        </svg>
        <span className="absolute inset-0 grid place-content-center text-xl font-bold text-cyan-300">{pct}%</span>
      </div>
    </div>
  );
}

export function CyberpunkDashboard({ unityJobCount, profileCount, purchaseCount }: Props) {
  const logs = [
    'INIT > Koschei core online',
    'SYNC > Unity build agents heartbeat: stable',
    'ART > Meshy pipeline ready',
    'PVP > Matchmaking queue listening',
  ];

  return (
    <div className="space-y-6 text-cyan-100">
      <div className="grid gap-4 md:grid-cols-3">
        {[['Unity Builds', unityJobCount], ['Users', profileCount], ['Purchases', purchaseCount]].map(([title, v], i) => (
          <motion.div key={String(title)} whileHover={{ y: -4, scale: 1.01 }} className="rounded-2xl border border-cyan-400/40 bg-black/40 p-5 shadow-[0_0_30px_rgba(34,211,238,0.12)] backdrop-blur-md">
            <p className="text-sm text-cyan-300/80">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-100">{v}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Gauge label="Unity Build" value={unityJobCount} max={100} />
        <Gauge label="Agent Health" value={92} max={100} />
        <Gauge label="Realtime Matchmaking" value={78} max={100} />
      </div>

      <div className="rounded-2xl border border-cyan-400/40 bg-black/50 p-4 font-mono text-sm backdrop-blur-md">
        <p className="mb-3 text-cyan-300">hacker-terminal.log</p>
        <div className="space-y-1">
          {logs.map((line) => (
            <motion.p key={line} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="text-cyan-200">
              {line}
            </motion.p>
          ))}
        </div>
      </div>
    </div>
  );
}
