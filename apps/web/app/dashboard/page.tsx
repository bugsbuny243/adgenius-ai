import { redirect } from 'next/navigation';
import { Nav } from '@/components/nav';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <main>
      <Nav />
      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel">
          <h2 className="text-sm text-white/70">Authenticated User</h2>
          <p className="mt-2 break-all text-lg">{user.email}</p>
        </article>
        <article className="panel">
          <h2 className="text-sm text-white/70">Active Agents</h2>
          <p className="mt-2 text-3xl font-semibold">12</p>
        </article>
        <article className="panel">
          <h2 className="text-sm text-white/70">Monthly Runs</h2>
          <p className="mt-2 text-3xl font-semibold">48,210</p>
        </article>
      </section>
    </main>
  );
}
