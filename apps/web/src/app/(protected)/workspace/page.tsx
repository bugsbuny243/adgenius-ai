import { RunPanel } from "@/components/workspace/run-panel";

export default function WorkspacePage() {
  return (
    <div className="space-y-4">
      <section className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-semibold">Çalışma Alanı</h1>
        <p className="mt-2 text-sm text-slate-300">Ajanlar, projeler ve çıktılar burada yönetilir.</p>
      </section>
      <RunPanel />
    </div>
  );
}
