import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import { attachSavedOutputToProjectAction, createProjectItemFromOutputAction, runAgentAction, saveOutputAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type AgentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_id?: string; error?: string }>;
};

export default async function AgentDetailPage({ params, searchParams }: AgentDetailPageProps) {
  const { id } = await params;
  const { run_id: runIdParam, error: errorParam } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { workspaceId, userId } = await getWorkspaceContext();

  const runAgent = runAgentAction.bind(null, id);
  const saveOutput = saveOutputAction.bind(null, id);
  const createProjectItem = createProjectItemFromOutputAction.bind(null, id, runIdParam ?? '');
  const attachOutput = attachSavedOutputToProjectAction.bind(null, id, runIdParam ?? '');

  const [{ data: agent }, { data: projects }] = await Promise.all([
    supabase.from('agent_types').select('id, slug, name, description, is_active').eq('id', id).maybeSingle(),
    supabase
      .from('projects')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  ]);

  if (!agent) {
    notFound();
  }

  const runQuery = supabase
    .from('agent_runs')
    .select('id, user_input, result_text, status, error_message, created_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('agent_type_id', id)
    .order('created_at', { ascending: false });

  const { data: recentRuns } = await runQuery.limit(10);

  const activeRun = runIdParam
    ? recentRuns?.find((run) => run.id === runIdParam) ?? null
    : recentRuns?.[0] ?? null;

  const { data: savedOutputs } = await supabase
    .from('saved_outputs')
    .select('id, agent_run_id, title')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const activeOutput = activeRun ? (savedOutputs ?? []).find((output) => output.agent_run_id === activeRun.id) : null;

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{agent.name}</h2>
            <p className="text-sm text-white/60">Slug: {agent.slug}</p>
            <p className="mt-2 text-sm text-white/75">{agent.description || 'Bu agent için açıklama eklenmemiş.'}</p>
          </div>
          <span className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/70">{agent.is_active ? 'Aktif' : 'Pasif'}</span>
        </div>

        {errorParam ? <p className="mb-3 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{errorParam}</p> : null}

        <form action={runAgent} className="space-y-3">
          <textarea
            name="prompt"
            rows={7}
            required
            placeholder="Agent için bir istem yaz..."
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              name="project_id"
              defaultValue=""
              className="min-w-64 rounded-lg border border-white/20 bg-black/30 px-3 py-2 outline-none focus:border-neon"
            >
              <option value="">Proje seçimi (opsiyonel)</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">
              Çalıştır
            </button>
          </div>
        </form>
      </section>

      <section className="panel mb-4">
        <h3 className="mb-3 text-lg font-semibold">Sonuç</h3>
        {activeRun ? (
          <div className="space-y-3">
            <p className="text-xs text-white/60">Durum: {activeRun.status}</p>
            <p className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/80 whitespace-pre-wrap">{activeRun.result_text || activeRun.error_message || 'Sonuç hazırlanıyor...'}</p>

            {activeRun.status === 'completed' ? (
              <div className="space-y-3">
                <form action={saveOutput} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="run_id" value={activeRun.id} />
                  <input
                    type="text"
                    name="title"
                    defaultValue={activeOutput?.title ?? 'Kaydedilen çıktı'}
                    className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                  />
                  <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Çıktıyı kaydet</button>
                </form>

                {activeOutput ? (
                  <>
                    <form action={createProjectItem} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="output_id" value={activeOutput.id} />
                      <select name="project_id" defaultValue="" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                        <option value="">Projeye ekle</option>
                        {projects?.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="title"
                        defaultValue="Agent Çıktısı"
                        className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                      />
                      <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Proje öğesi oluştur</button>
                    </form>
                  </>
                ) : (
                  <form action={attachOutput} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="run_id" value={activeRun.id} />
                    <select name="project_id" defaultValue="" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                      <option value="">Projeye kaydet</option>
                      {projects?.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      name="title"
                      defaultValue="Agent Çıktısı"
                      className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm"
                    />
                    <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Kaydet ve projeye bağla</button>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-white/70">Henüz bu agent için çalıştırma bulunmuyor.</p>
        )}
      </section>

      <section className="panel">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Geçmiş çalıştırmalar</h3>
          <Link href="/agents" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm hover:border-neon">
            Agent listesine dön
          </Link>
        </div>

        <div className="space-y-2">
          {recentRuns?.map((run) => (
            <Link
              key={run.id}
              href={`/agents/${id}?run_id=${run.id}`}
              className="block rounded-lg border border-white/10 p-3 text-sm hover:border-neon"
            >
              <p className="text-white/70">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
              <p className="mt-1 text-white/90">{run.user_input.slice(0, 100) || 'İstem yok'}</p>
            </Link>
          ))}
          {!recentRuns?.length ? <p className="text-sm text-white/70">Kayıtlı çalıştırma bulunamadı.</p> : null}
        </div>
      </section>
    </main>
  );
}
