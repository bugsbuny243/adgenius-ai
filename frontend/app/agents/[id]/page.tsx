import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { AgentEditorShell } from '@/components/agent-editor/AgentEditorShell';
import { RunStatusPoller } from '@/components/agent-editor/RunStatusPoller';
import { ResultPanel } from '@/components/agent-editor/ResultPanel';
import { SocialOutputPanel } from '@/components/agent-editor/SocialOutputPanel';
import { buildFormSummary, getAgentEditorConfig, parseEditorMetadata } from '@/lib/agent-editor';
import { deriveQueuePreview, neutralizeVendorTerms, sanitizeUserFacingEngineLabel, toPlatformLabel, toQueueStateHint, toQueueStatusLabel } from '@/lib/publish-queue';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getWorkspaceContext } from '@/lib/workspace';
import {
  attachSavedOutputToProjectAction,
  createProjectItemFromOutputAction,
  queueSocialPublishAction,
  rerunAgentAction,
  runAgentAction,
  saveOutputAction
} from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STALE_PENDING_MS = 2 * 60 * 1000;

function getStatusLabel(status: string): string {
  if (status === 'completed') return 'Tamamlandı';
  if (status === 'failed') return 'Hata';
  if (status === 'processing') return 'İşleniyor';
  if (status === 'pending') return 'Sırada';
  return status;
}

type AgentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run_id?: string; edit_run_id?: string; error?: string }>;
};

export default async function AgentDetailPage({ params, searchParams }: AgentDetailPageProps) {
  const { id } = await params;
  const { run_id: runIdParam, edit_run_id: editRunIdParam, error: errorParam } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  const { workspaceId, userId } = await getWorkspaceContext();

  const runAgent = runAgentAction.bind(null, id);
  const saveOutput = saveOutputAction.bind(null, id);
  const rerunAgent = rerunAgentAction.bind(null, id);
  const createProjectItem = createProjectItemFromOutputAction.bind(null, id, runIdParam ?? '');
  const attachOutput = attachSavedOutputToProjectAction.bind(null, id, runIdParam ?? '');
  const queueSocialPublish = queueSocialPublishAction.bind(null, id, runIdParam ?? '');

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
    .select('id, user_input, result_text, status, error_message, created_at, updated_at, completed_at, metadata, model_name')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('agent_type_id', id)
    .order('created_at', { ascending: false });

  const { data: recentRuns } = await runQuery.limit(10);

  const activeRun = runIdParam
    ? recentRuns?.find((run) => run.id === runIdParam) ?? null
    : recentRuns?.[0] ?? null;

  const editableRun = editRunIdParam
    ? recentRuns?.find((run) => run.id === editRunIdParam) ?? activeRun
    : activeRun;

  const initialEditorMetadata = parseEditorMetadata(editableRun?.metadata);
  const config = getAgentEditorConfig(agent.slug);
  const formSummary = activeRun ? buildFormSummary(config, parseEditorMetadata(activeRun.metadata).editorState) : [];
  const activeMetadata = activeRun ? parseEditorMetadata(activeRun.metadata) : null;
  const isPending = activeRun?.status === 'pending' || activeRun?.status === 'processing';
  const isStalePending = activeRun
    ? isPending && Date.now() - new Date(activeRun.updated_at ?? activeRun.created_at).getTime() > STALE_PENDING_MS
    : false;
  const resultText = activeRun
    ? neutralizeVendorTerms(
        activeRun.result_text ||
          (activeRun.status === 'failed' ? activeRun.error_message || 'Çalıştırma hata ile sonlandı.' : '') ||
          (activeRun.status === 'completed' ? 'Çalıştırma tamamlandı ancak sonuç metni boş görünüyor.' : '') ||
          'Sonuç hazırlanıyor. Sayfa otomatik güncellenecek...'
      )
    : '';

  const { data: savedOutputs } = await supabase
    .from('saved_outputs')
    .select('id, agent_run_id, title')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const activeOutput = activeRun ? (savedOutputs ?? []).find((output) => output.agent_run_id === activeRun.id) : null;

  const activeContentItem = activeRun
    ? (
        await supabase
          .from('content_items')
          .select(
            'id, brief, platforms, youtube_title, youtube_description, instagram_caption, tiktok_caption, project_id, saved_output_id'
          )
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .eq('run_id', activeRun.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data
    : null;

  const { data: publishJobs } =
    activeContentItem?.id
      ? await supabase
          .from('publish_jobs')
          .select('id, status, target_platform, queued_at, content_output_id, payload, project_id')
          .eq('workspace_id', workspaceId)
          .eq('content_output_id', activeContentItem.id)
          .order('queued_at', { ascending: false })
          .limit(10)
      : { data: [] };


  const [{ data: linkedProject }, { data: linkedSavedOutput }] = await Promise.all([
    activeContentItem?.project_id
      ? supabase.from('projects').select('id, name').eq('workspace_id', workspaceId).eq('id', activeContentItem.project_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    activeContentItem?.saved_output_id
      ? supabase
          .from('saved_outputs')
          .select('id, title, content')
          .eq('workspace_id', workspaceId)
          .eq('id', activeContentItem.saved_output_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);

  return (
    <main>
      <Nav />
      <section className="panel mb-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{agent.name}</h2>
            <p className="text-sm text-white/60">Slug: {agent.slug}</p>
            <p className="mt-2 text-sm text-white/75">{agent.description || 'Bu agent için açıklama eklenmemiş.'}</p>
          </div>
          <span className="rounded-md border border-white/15 px-2 py-1 text-xs text-white/70">{agent.is_active ? 'Aktif' : 'Pasif'}</span>
        </div>

        {errorParam ? <p className="mb-3 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{neutralizeVendorTerms(errorParam)}</p> : null}

        <AgentEditorShell
          agentSlug={agent.slug}
          projects={projects ?? []}
          runAction={runAgent}
          initialMetadata={initialEditorMetadata}
        />
      </section>

      <section className="panel mb-4">
        <h3 className="mb-3 text-lg font-semibold">Sonuç</h3>
        <p className="mb-3 text-sm text-white/65">Form özeti, ek notlar ve üretilen çıktı ayrı bloklarda gösterilir.</p>
        {activeRun ? (
          <div className="space-y-3">
            <RunStatusPoller runId={activeRun.id} status={activeRun.status} />
            <p className="text-xs text-white/60">
              Durum: <span className="font-medium text-white/85">{getStatusLabel(activeRun.status)}</span>
            </p>
            <p className="text-xs text-white/50">
              Oluşturulma: {new Date(activeRun.created_at).toLocaleString('tr-TR')}
              {activeRun.completed_at ? ` • Tamamlanma: ${new Date(activeRun.completed_at).toLocaleString('tr-TR')}` : ''}
            </p>
            <p className="text-xs text-white/50">Çalışma motoru: {sanitizeUserFacingEngineLabel(activeRun.metadata && typeof activeRun.metadata === 'object' && 'ai_engine' in activeRun.metadata ? activeRun.metadata.ai_engine : null)}</p>

            {isPending ? (
              <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Çalıştırma devam ediyor. Sonuç tamamlandığında bu alan otomatik güncellenir.
              </p>
            ) : null}
            {isStalePending ? (
                <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  Bu çalıştırma beklenenden uzun sürdü. "Bu sonucu düzenle" ile aynı girdi üzerinden yeniden çalıştırabilirsiniz.
                </p>
              ) : null}
            {activeRun.status === 'failed' ? (
              <p className="rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {neutralizeVendorTerms(activeRun.error_message || 'Çalıştırma tamamlanamadı. Aynı girdiyi düzenleyip yeniden deneyebilirsiniz.')}
              </p>
            ) : null}

            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Form Özeti</p>
              {formSummary.length ? (
                <ul className="space-y-1 text-sm text-white/85">
                  {formSummary.map((item) => (
                    <li key={item.label}>
                      <span className="text-white/60">{item.label}: </span>
                      {item.value}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/70">Form alanı kaydı yok.</p>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Ek Notlar</p>
              <p className="text-sm whitespace-pre-wrap text-white/80">{activeMetadata?.freeNotes || 'Ek not girilmedi.'}</p>
            </div>

            {agent.slug === 'sosyal' ? (
              activeContentItem ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/60">
                    <p>
                      İçerik kaydı: <span className="text-white/85">{activeContentItem.id}</span>
                    </p>
                    <p>
                      Proje bağlantısı:{' '}
                      <span className="text-white/85">{activeContentItem.project_id ? activeContentItem.project_id : 'Yok'}</span>
                    </p>
                  </div>
                  <SocialOutputPanel
                    agentId={id}
                    runId={activeRun.id}
                    contentItemId={activeContentItem.id}
                    projectId={activeContentItem.project_id}
                    youtubeTitle={activeContentItem.youtube_title}
                    youtubeDescription={activeContentItem.youtube_description}
                    instagramCaption={activeContentItem.instagram_caption}
                    tiktokCaption={activeContentItem.tiktok_caption}
                  />

                  <form action={queueSocialPublish} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                    <input type="hidden" name="run_id" value={activeRun.id} />
                    <input type="hidden" name="content_item_id" value={activeContentItem.id} />
                    <select name="target_platform" defaultValue="youtube" className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm">
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                    </select>
                    <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Yayın Kuyruğuna Ekle</button>
                  </form>

                  <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-white/50">Yayın Kuyruğu Geçmişi</p>
                    <p className="mb-2 text-xs text-white/55">Bu alan yalnızca mevcut kuyruk kayıtlarının hazırlık durumunu gösterir.</p>
                    {publishJobs && publishJobs.length > 0 ? (
                      <div className="space-y-2 text-sm text-white/80">
                        {publishJobs.map((job) => {
                          const preview = deriveQueuePreview({
                            payload: job.payload,
                            targetPlatform: job.target_platform,
                            contentItem: activeContentItem,
                            savedOutput: linkedSavedOutput
                          });

                          return (
                            <div key={job.id} className="rounded-md border border-white/10 p-2">
                              <p className="text-white/90">{toPlatformLabel(job.target_platform)} • {toQueueStatusLabel(job.status)}</p>
                              <p className="text-xs text-white/60">{toQueueStateHint(job.status)} • {job.queued_at ? new Date(job.queued_at).toLocaleString('tr-TR') : 'Tarih yok'}</p>
                              <p className="mt-1 text-white/80">İçerik özeti: {preview.summary}</p>
                              {preview.detail ? <p className="text-xs text-white/65">Detay: {preview.detail}</p> : null}
                              <p className="text-xs text-white/60">Proje: {linkedProject?.name ?? 'Bağlı proje yok'}</p>
                              {preview.payloadPartial ? <p className="text-xs text-amber-200">Payload kısmi olduğundan özet mevcut içerikten türetildi.</p> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-white/65">Henüz bu içerik için yayın kuyruğu kaydı bulunmuyor.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <ResultPanel agentSlug={agent.slug} text={resultText} status={activeRun.status as 'completed' | 'failed' | 'pending' | 'processing'} />
                  <p className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/65">
                    Platform bazlı içerik blokları henüz kayda alınamadı. Ham çıktı aşağıda görüntüleniyor.
                  </p>
                </div>
              )
            ) : (
              <ResultPanel agentSlug={agent.slug} text={resultText} status={activeRun.status as 'completed' | 'failed' | 'pending' | 'processing'} />
            )}

            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/50">Hızlı aksiyonlar</p>
              <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/agents/${id}?run_id=${activeRun.id}&edit_run_id=${activeRun.id}`}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon"
              >
                Bu sonucu düzenle
              </Link>
              <form action={rerunAgent}>
                <input type="hidden" name="source_run_id" value={activeRun.id} />
                <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:border-neon">Aynı girdiyi tekrar çalıştır</button>
              </form>
              </div>
            </div>

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
          <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/70">Henüz bu agent için çalıştırma bulunmuyor. Editörü doldurup ilk çalıştırmayı başlatabilirsiniz.</p>
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
            <Link key={run.id} href={`/agents/${id}?run_id=${run.id}`} className="block rounded-lg border border-white/10 p-3 text-sm hover:border-neon">
              <p className="text-white/70">{new Date(run.created_at).toLocaleString('tr-TR')}</p>
              <p className="text-xs text-white/50">Durum: {getStatusLabel(run.status)}</p>
              <p className="text-xs text-white/50">Motor: {sanitizeUserFacingEngineLabel(run.metadata && typeof run.metadata === 'object' && 'ai_engine' in run.metadata ? run.metadata.ai_engine : null)}</p>
              <p className="mt-1 text-white/90">{run.user_input.slice(0, 100) || 'İstem yok'}</p>
            </Link>
          ))}
          {!recentRuns?.length ? <p className="text-sm text-white/70">Kayıtlı çalıştırma bulunamadı.</p> : null}
        </div>
      </section>
    </main>
  );
}
