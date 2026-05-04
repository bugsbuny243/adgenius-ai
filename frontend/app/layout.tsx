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
        className={`${inter.variable} min-h-screen bg-[#05070f] font-sans text-slate-100 antialiased selection:bg-cyan-400/35 selection:text-cyan-50`}
      >
        <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_8%_15%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_88%_6%,rgba(167,139,250,0.2),transparent_24%),radial-gradient(circle_at_50%_110%,rgba(56,189,248,0.1),transparent_35%),linear-gradient(180deg,#02040a_0%,#05070f_44%,#03050c_100%)]" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_right,rgba(125,211,252,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:30px_30px] [mask-image:radial-gradient(ellipse_85%_70%_at_50%_0%,black_40%,transparent_100%)]" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(125,211,252,0.12),transparent_55%)]" />

        <div className="relative min-h-screen">{children}</div>
      </body>
    </html>
  );
}
