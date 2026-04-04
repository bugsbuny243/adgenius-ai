import { notFound, redirect } from 'next/navigation'
import { db } from '@/src/lib/db'
import { getSessionUser } from '@/src/lib/auth'
import { confirmExtraction } from '@/src/server/services/persistence-service'

async function confirm(formData: FormData) {
  'use server'
  const user = await getSessionUser()
  const extractionId = String(formData.get('extractionId'))
  const payload = {
    extractionId,
    ownerId: user.id,
    customerName: String(formData.get('customerName')),
    workTitle: String(formData.get('workTitle')),
    summary: String(formData.get('summary')),
    taskList: JSON.parse(String(formData.get('taskListJson'))),
    keyDates: JSON.parse(String(formData.get('keyDatesJson'))),
  }
  const result = await confirmExtraction(payload)
  redirect(`/work-items/${result.workItemId}`)
}

export default async function AIResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const extraction = await db.aiExtraction.findUnique({ where: { id }, include: { aiRun: true } })
  if (!extraction) notFound()

  const tasks = extraction.taskList as Array<{ title: string; dueDate: string | null }>
  const dates = extraction.keyDates as Array<{ label: string; date: string }>

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">AI Sonucu İncele & Onayla</h1>
      <form action={confirm} className="space-y-4 rounded-lg border border-slate-200 p-5">
        <input type="hidden" name="extractionId" value={extraction.id} />
        <input type="hidden" name="taskListJson" value={JSON.stringify(tasks)} />
        <input type="hidden" name="keyDatesJson" value={JSON.stringify(dates)} />
        <label className="block text-sm">Müşteri adı<input name="customerName" className="mt-1 block w-full rounded border border-slate-300 p-2" defaultValue={extraction.customerName ?? ''} /></label>
        <label className="block text-sm">İş başlığı<input name="workTitle" className="mt-1 block w-full rounded border border-slate-300 p-2" defaultValue={extraction.workTitle ?? ''} /></label>
        <label className="block text-sm">Özet<textarea name="summary" rows={5} className="mt-1 block w-full rounded border border-slate-300 p-2" defaultValue={extraction.summary} /></label>
        <div><h2 className="font-semibold">Görevler</h2><ul>{tasks.map((task, idx) => <li key={idx}>{task.title}</li>)}</ul></div>
        <div><h2 className="font-semibold">Tarihler</h2><ul>{dates.map((d, idx) => <li key={idx}>{d.label}: {d.date}</li>)}</ul></div>
        <div><h2 className="font-semibold">Risk işaretleri</h2><ul>{(extraction.riskFlags as string[]).map((r, idx) => <li key={idx}>{r}</li>)}</ul></div>
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Onayla ve kayıtları oluştur</button>
      </form>
    </div>
  )
}
