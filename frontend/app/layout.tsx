import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Koschei V5 · Neural Command Layer',
  description: 'Cyberpunk glassmorphism control layer for autonomous game intelligence operations.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} min-h-screen bg-[#020617] font-sans text-slate-200 antialiased selection:bg-cyan-500/30 selection:text-cyan-100`}
      >
        <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_10%_10%,rgba(6,182,212,0.2),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(139,92,246,0.2),transparent_30%),linear-gradient(180deg,#020617_0%,#020617_100%)]" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_65%_at_50%_0%,black_45%,transparent_100%)]" />
        <div className="relative min-h-screen">{children}</div>
      </body>
    </html>
  );
}
