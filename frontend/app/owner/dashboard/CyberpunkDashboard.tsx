'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  unityJobCount: number;
  profileCount: number;
  purchaseCount: number;
};

function GlowCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-all duration-300 hover:border-cyan-300/45 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_22px_60px_rgba(34,211,238,0.18)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent opacity-50" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

function Gauge({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));

  return (
    <GlowCard>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{label}</p>
      <div className="relative mt-4 h-24 w-24">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="50" stroke="rgba(148,163,184,0.24)" strokeWidth="10" fill="none" />
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#gaugeGradient)"
            strokeWidth="10"
            fill="none"
            strokeDasharray="314"
            strokeDashoffset={314 - (314 * pct) / 100}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 grid place-content-center text-xl font-bold text-slate-100">{pct}%</span>
      </div>
    </GlowCard>
  );
}

export function CyberpunkDashboard({ unityJobCount, profileCount, purchaseCount }: Props) {
  const logs = [
    'INIT > Premium core online',
    'SYNC > Build agents: stable',
    'AI > Insight engine calibrated',
    'PVP > Matchmaking queue listening',
  ];

  return (
    <div className="space-y-5 text-slate-100">
      <div className="grid auto-rows-[minmax(140px,auto)] gap-4 md:grid-cols-6">
        {[['Unity Builds', unityJobCount], ['Users', profileCount], ['Purchases', purchaseCount]].map(([title, v]) => (
          <GlowCard key={String(title)} className="md:col-span-2">
            <p className="text-sm text-slate-300">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-100">{v}</p>
          </GlowCard>
        ))}

        <GlowCard className="md:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-sm text-slate-300">ops-terminal.log</p>
            <span className="rounded-full border border-cyan-400/45 bg-cyan-400/12 px-3 py-1 text-xs text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.35)]">
              LIVE
            </span>
          </div>
          <div className="space-y-1 font-mono text-sm">
            {logs.map((line) => (
              <motion.p key={line} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }} className="text-slate-200">
                {line}
              </motion.p>
            ))}
          </div>
        </GlowCard>

        <GlowCard className="md:col-span-2">
          <p className="text-sm text-slate-300">Critical Action</p>
          <button className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(34,211,238,0.42)] transition-all duration-300 hover:shadow-[0_0_34px_rgba(139,92,246,0.5)]">
            Release Pipeline
          </button>
        </GlowCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Gauge label="Unity Build" value={unityJobCount} max={100} />
        <Gauge label="Server Health" value={92} max={100} />
        <Gauge label="AI Metrics" value={78} max={100} />
      </div>
    </div>
  );
}
