import { createServerSupabase } from '@/lib/supabase/server';

type Params = Promise<{ token: string }>;

export default async function SharedResourcePage({ params }: { params: Params }) {
  const { token } = await params;
  const supabase = createServerSupabase();

  const [{ data: sharedProject }, { data: sharedItems }, { data: sharedOutput }] = await Promise.all([
    supabase.rpc('get_shared_project', { p_token: token }),
    supabase.rpc('get_shared_project_items', { p_token: token }),
    supabase.rpc('get_shared_saved_output', { p_token: token }),
  ]);

  const project = Array.isArray(sharedProject) ? sharedProject[0] : null;
  const output = Array.isArray(sharedOutput) ? sharedOutput[0] : null;

  if (!project && !output) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-zinc-100">
        <h1 className="text-2xl font-semibold">Paylaşım bulunamadı</h1>
        <p className="text-zinc-400">Link geçersiz, süresi dolmuş veya iptal edilmiş olabilir.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5 px-4 py-12 text-zinc-100">
      <h1 className="text-2xl font-semibold">Read-only paylaşım</h1>
      {project ? (
        <article className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <h2 className="text-xl font-medium">{project.name}</h2>
          <p className="text-sm text-zinc-400">{project.description || 'Açıklama yok'}</p>
          <p className="text-xs text-zinc-500">Öğe sayısı: {project.item_count}</p>
          <div className="space-y-2">
            {(sharedItems ?? []).map((item: { item_id: string; item_type: string; title: string | null; content: string | null }) => (
              <div key={item.item_id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                <p className="text-sm font-medium">{item.title || item.item_type}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{item.content || '-'}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {output ? (
        <article className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <h2 className="text-xl font-medium">{output.title || 'Kayıtlı çıktı'}</h2>
          <p className="whitespace-pre-wrap text-sm text-zinc-300">{output.content}</p>
        </article>
      ) : null}
    </section>
  );
}
