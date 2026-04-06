import { createServerSupabase } from '@/lib/supabase/server';

type SharedProject = {
  project_id: string;
  project_name: string;
  project_description: string | null;
  created_at: string;
  items: Array<{ id: string; title: string; content: string; created_at: string }>;
};

type SharedOutput = {
  saved_output_id: string;
  title: string;
  content: string;
  created_at: string;
};

export default async function ShareReadOnlyPage({ params }: { params: { token: string } }) {
  const supabase = createServerSupabase();

  const { data: projectRows } = await supabase.rpc('get_shared_project', { p_token: params.token });
  const project = ((projectRows ?? [])[0] ?? null) as SharedProject | null;

  if (project) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl space-y-4 bg-zinc-950 px-4 py-10 text-zinc-100">
        <header className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Read-only paylaşım</p>
          <h1 className="text-2xl font-semibold">{project.project_name}</h1>
          {project.project_description ? <p className="text-sm text-zinc-300">{project.project_description}</p> : null}
          <p className="text-xs text-zinc-500">{new Date(project.created_at).toLocaleString('tr-TR')}</p>
        </header>

        <section className="space-y-3">
          {(project.items ?? []).map((item) => (
            <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="text-base font-medium">{item.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{item.content}</p>
            </article>
          ))}
        </section>
      </main>
    );
  }

  const { data: outputRows } = await supabase.rpc('get_shared_saved_output', { p_token: params.token });
  const output = ((outputRows ?? [])[0] ?? null) as SharedOutput | null;

  if (output) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl space-y-4 bg-zinc-950 px-4 py-10 text-zinc-100">
        <header className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Read-only çıktı</p>
          <h1 className="text-2xl font-semibold">{output.title}</h1>
          <p className="text-xs text-zinc-500">{new Date(output.created_at).toLocaleString('tr-TR')}</p>
        </header>
        <article className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="whitespace-pre-wrap text-sm text-zinc-300">{output.content}</p>
        </article>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-200">
      <p>Paylaşım linki geçersiz veya süresi dolmuş.</p>
    </main>
  );
}
