export default function Page() {
  const code = `<div data-adgenius-slot="slot-key"></div>
<script src="https://api.adgenius.ai/static/embed.js" async></script>`

  return (
    <main className='p-6'>
      <h2 className='text-2xl font-semibold'>Integration</h2>
      <pre className='mt-4 rounded bg-slate-900 p-4 text-slate-100'>{code}</pre>
    </main>
  )
}
