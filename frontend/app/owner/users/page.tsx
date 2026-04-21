import { getOwnerAccessContextOrRedirect } from '@/lib/owner-access';

export default async function OwnerUsersPage() {
  const { supabase, workspaceId } = await getOwnerAccessContextOrRedirect();

  const [membersRes, projectsRes] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('id, user_id, role, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('projects')
      .select('id, name, status, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(30)
  ]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="panel">
        <h2 className="text-lg font-semibold">User and membership overview</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(membersRes.data ?? []).map((member) => (
            <p key={member.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {member.user_id} • {member.role}
            </p>
          ))}
        </div>
      </article>

      <article className="panel">
        <h2 className="text-lg font-semibold">Project overview</h2>
        <div className="mt-3 space-y-2 text-sm">
          {(projectsRes.data ?? []).map((project) => (
            <p key={project.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              {project.name} • {project.status ?? 'draft'}
            </p>
          ))}
        </div>
      </article>
    </section>
  );
}
