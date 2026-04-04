import { submitUpload } from './actions'

export default function UploadPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Upload intake</h1>
      <form action={submitUpload} className="space-y-4 rounded-lg border border-slate-200 p-5">
        <label className="block text-sm font-medium">Dosyalar (PDF, doküman, ekran görüntüsü, ses notu)
          <input name="files" type="file" multiple className="mt-2 block w-full" />
        </label>
        <label className="block text-sm font-medium">Serbest metin
          <textarea name="freeText" rows={6} className="mt-2 w-full rounded border border-slate-300 p-2" />
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Gemini ile analiz et</button>
      </form>
    </div>
  )
}
