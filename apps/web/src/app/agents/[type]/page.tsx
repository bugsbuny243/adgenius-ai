import { notFound } from 'next/navigation'
import { AgentRunner } from '@/src/components/agent-runner'
import { createClient } from '@/src/lib/supabase/server'
import { requireUser } from '@/src/lib/auth'
import { V1_AGENT_CATALOG } from '@/src/lib/agents'

export default async function AgentDetailPage({ params }: { params: Promise<{ type: string }> }) {
  await requireUser()
  const { type } = await params
  const supabase = await createClient()

  const { data: dbAgent } = await supabase
    .from('agent_types')
    .select('id,slug,name,icon,description,placeholder,is_active')
    .eq('slug', type)
    .eq('is_active', true)
    .maybeSingle()

  const fallback = V1_AGENT_CATALOG.find((item) => item.slug === type)
  const agent = dbAgent
    ? dbAgent
    : fallback
      ? {
          slug: fallback.slug,
          name: fallback.name,
          icon: fallback.icon,
          description: fallback.description,
          placeholder: fallback.placeholder,
        }
      : null

  if (!agent) {
    notFound()
  }

  return (
    <section className="space-y-4">
      <div className="panel">
        <h1 className="page-title">
          {agent.icon} {agent.name}
        </h1>
        <p className="muted">{agent.description}</p>
      </div>
      <AgentRunner agentSlug={agent.slug} placeholder={agent.placeholder} />
    </section>
  )
}
