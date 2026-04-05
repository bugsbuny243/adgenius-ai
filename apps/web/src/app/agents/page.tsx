import Link from 'next/link'
import { createClient } from '@/src/lib/supabase/server'
import { requireUser } from '@/src/lib/auth'
import { V1_AGENT_CATALOG } from '@/src/lib/agents'

export default async function AgentsPage() {
  await requireUser()
  const supabase = await createClient()

  const { data: agents } = await supabase
    .from('agent_types')
    .select('id,slug,name,icon,description,is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const displayAgents = agents?.length
    ? agents
    : V1_AGENT_CATALOG.map((item, index) => ({
        id: String(index),
        slug: item.slug,
        name: item.name,
        icon: item.icon,
        description: item.description,
        is_active: item.isActive,
      }))

  return (
    <section className="space-y-4">
      <h1 className="page-title">Agentlar</h1>
      <div className="card-grid">
        {displayAgents.map((agent: any) => (
          <article key={agent.id} className="panel">
            <h2>
              <span>{agent.icon}</span> {agent.name}
            </h2>
            <p className="muted">{agent.description}</p>
            <Link className="primary-button" href={`/agents/${agent.slug}`}>
              Kullan
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
