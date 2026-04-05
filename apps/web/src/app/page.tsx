import Link from 'next/link'

export default function HomePage() {
  return (
    <section className="panel">
      <h1 className="page-title">AgentForge</h1>
      <p className="muted">
        AgentForge is the canonical product shell for creating and running business agents powered by Gemini.
      </p>
      <ul>
        <li>
          <Link href="/dashboard">Go to dashboard</Link>
        </li>
        <li>
          <Link href="/agents">Manage agents</Link>
        </li>
        <li>
          <Link href="/runs">Review runs</Link>
        </li>
      </ul>
    </section>
  )
}
