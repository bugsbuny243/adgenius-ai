'use client';

import { CheckCircle2, Cpu, Rocket, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

type Platform = 'android' | 'ios';
type GameBrief = {
  title: string;
  slug: string;
  packageName: string;
  summary: string;
  gameType: 'runner_2d';
  targetPlatform: 'android';
  mechanics: string[];
  visualStyle: string;
  controls: string;
  monetizationNotes: string;
  releaseNotes: string;
  storeShortDescription: string;
  storeFullDescription: string;
};

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase config missing.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expired. Please sign in again.');
  return token;
}

export default function NewGameFactoryPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [platform, setPlatform] = useState<Platform>('android');
  const [prompt, setPrompt] = useState('');
  const [brief, setBrief] = useState<GameBrief | null>(null);
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const isCreateDisabled = useMemo(() => loading || prompt.trim().length < 12, [loading, prompt]);

  async function createBrief() {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/game-factory/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: prompt.trim(), targetPlatform: platform })
      });

      const raw = await response.text();
      let data: { ok: boolean; error?: string; projectId?: string; brief?: GameBrief };
      try {
        data = JSON.parse(raw) as { ok: boolean; error?: string; projectId?: string; brief?: GameBrief };
      } catch {
        throw new Error('Server returned malformed brief response.');
      }

      if (!response.ok || !data.ok || !data.brief || !data.projectId) {
        throw new Error(data.error ?? 'Brief generation failed.');
      }

      setBrief(data.brief);
      setProjectId(data.projectId);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  async function approveProject() {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/game-factory/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Project approval failed.');
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setLoading(false);
    }
  }

  async function startBuild() {
    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/game-factory/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId })
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Build failed to start.');
      router.push(`/game-factory/${projectId}/builds`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-cyan-300/20 bg-white/[0.04] p-6 shadow-[0_0_60px_-30px_rgba(34,211,238,0.85)] backdrop-blur-2xl sm:p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs tracking-[0.18em] text-cyan-100"><Sparkles className="h-3.5 w-3.5" />BRIEF GENERATOR</span>
          <span className="text-xs text-slate-400">STEP {step}/3</span>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-3xl font-bold tracking-tight text-white">Generate Premium Game Brief</h1>
            <p className="text-sm text-slate-300">Describe your concept. The command core will craft a production-ready brief instantly.</p>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={8}
              placeholder="Example: Endless 2D runner with evolving biomes, collectible upgrades, ad monetization, and neon cyber visuals."
              className="w-full bg-black/40 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setPlatform('android')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${platform === 'android' ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-100 shadow-[0_0_20px_-8px_rgba(6,182,212,1)]' : 'bg-black/40 border border-slate-800 text-slate-300 hover:border-slate-700'}`}>
                Android
              </button>
              <button type="button" disabled className="cursor-not-allowed rounded-xl bg-black/40 border border-slate-800 px-4 py-2 text-sm text-slate-500">iOS (Soon)</button>
            </div>
            <button
              type="button"
              disabled={isCreateDisabled}
              onClick={createBrief}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/60 bg-cyan-500/25 px-5 py-3 font-semibold text-cyan-100 shadow-[0_0_30px_-8px_rgba(6,182,212,1)] transition hover:bg-cyan-500/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" /> {loading ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        )}

        {step === 2 && brief && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold text-white">Review Generated Brief</h2>
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/35 p-4 text-sm text-slate-200 sm:grid-cols-2">
              <p><b>Title:</b> {brief.title}</p>
              <p><b>Package:</b> {brief.packageName}</p>
              <p><b>Type:</b> {brief.gameType}</p>
              <p><b>Platform:</b> {brief.targetPlatform}</p>
              <p className="sm:col-span-2"><b>Summary:</b> {brief.summary}</p>
              <p className="sm:col-span-2"><b>Short Store Text:</b> {brief.storeShortDescription}</p>
              <p><b>Visual Style:</b> {brief.visualStyle}</p>
              <p><b>Controls:</b> {brief.controls}</p>
              <div className="sm:col-span-2">
                <p className="mb-1 font-semibold">Core Mechanics</p>
                <ul className="list-disc space-y-1 pl-5 text-slate-300">
                  {brief.mechanics.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={approveProject} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-4 py-2.5 font-semibold text-emerald-100 transition hover:bg-emerald-300/25 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Approve & Continue</button>
              <button type="button" onClick={() => setStep(1)} disabled={loading} className="rounded-xl border border-white/20 px-4 py-2.5 text-slate-300 transition hover:border-white/35 disabled:opacity-50">Regenerate</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold text-white">Launch First Build</h2>
            <p className="text-sm text-slate-300">Project approved and primed. Trigger build pipeline to compile your first release artifact.</p>
            <div className="flex items-center gap-3 rounded-2xl border border-violet-300/30 bg-violet-300/10 px-4 py-3 text-violet-100">
              <Cpu className="h-4 w-4" /> Build infrastructure synchronized and ready.
            </div>
            <button type="button" onClick={startBuild} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/40 bg-cyan-300/15 px-5 py-2.5 font-semibold text-cyan-100 shadow-[0_0_30px_-10px_rgba(34,211,238,0.9)] transition hover:bg-cyan-300/25 disabled:opacity-50"><Rocket className="h-4 w-4" />{loading ? 'Starting Build...' : 'Start Build'}</button>
          </div>
        )}

        {error && <p className="mt-5 rounded-xl border border-rose-300/35 bg-rose-950/35 px-4 py-3 text-sm text-rose-200">{error}</p>}
      </section>
    </main>
  );
}
