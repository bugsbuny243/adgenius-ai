export default function Page(){
  const code = `<script src="/embed.js"></script>
<script>AdGeniusEmbed.init("slot-123")</script>`
  return <main className='p-6'><h2 className='text-2xl font-semibold'>Integration</h2><pre className='mt-4 rounded bg-slate-900 p-4 text-slate-100'>{code}</pre></main>
}
