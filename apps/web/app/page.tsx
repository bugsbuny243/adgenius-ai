import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="panel space-y-5">
      <p className="text-sm uppercase tracking-[0.2em] text-lilac">Koschei AI</p>
      <h1 className="text-4xl font-bold">AI-powered operations for projects and teams</h1>
      <p className="max-w-2xl text-white/70">
        Koschei AI is a command center where teams can manage projects, coordinate AI agents, and keep day-to-day
        work organized in one place.
      </p>
      <div className="flex gap-3">
        <Link href="/signin" className="rounded-xl bg-neon px-5 py-3 font-semibold text-ink">
          Log In
        </Link>
        <Link href="/dashboard" className="rounded-xl border border-white/20 px-5 py-3">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
