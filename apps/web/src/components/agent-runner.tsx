'use client'

import { useState } from 'react'
import { runAgentAction, saveOutputAction } from '@/src/app/agents/[type]/actions'

type Props = {
  agentSlug: string
  placeholder: string
}

export function AgentRunner({ agentSlug, placeholder }: Props) {
  const [resultText, setResultText] = useState('')
  const [runId, setRunId] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'saving'>('idle')

  async function onRun(formData: FormData) {
    setStatus('running')
    setError('')

    const res = await runAgentAction(agentSlug, formData)

    if (!res.ok) {
      setError(res.error)
      setStatus('idle')
      return
    }

    setResultText(res.resultText)
    setRunId(res.runId)
    setStatus('idle')
  }

  async function onSave(formData: FormData) {
    if (!runId || !resultText) return

    setStatus('saving')
    setError('')
    formData.set('content', resultText)

    const res = await saveOutputAction(runId, formData)

    if (!res.ok) {
      setError(res.error)
      setStatus('idle')
      return
    }

    setStatus('idle')
  }

  return (
    <div className="space-y-4">
      <form action={onRun} className="form-stack">
        <label>
          Görev
          <textarea name="userInput" required placeholder={placeholder} rows={8} />
        </label>
        <button className="primary-button" type="submit" disabled={status !== 'idle'}>
          {status === 'running' ? 'Çalıştırılıyor...' : 'Agentı Çalıştır'}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}

      {resultText ? (
        <section className="panel">
          <h3>Üretilen Çıktı</h3>
          <pre className="output-pre">{resultText}</pre>
          <form action={onSave} className="form-stack">
            <label>
              Başlık
              <input name="title" placeholder="Çıktı başlığı" />
            </label>
            <button className="secondary-button" type="submit" disabled={status !== 'idle'}>
              {status === 'saving' ? 'Kaydediliyor...' : 'Çıktıyı Kaydet'}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  )
}
