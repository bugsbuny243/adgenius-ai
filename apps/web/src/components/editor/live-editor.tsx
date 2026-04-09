"use client";

import { useMemo, useState } from "react";

export const LiveEditor = () => {
  const [markup, setMarkup] = useState("<section><h2>Kampanya Başlığı</h2><p>İçeriği düzenleyin ve anında görün.</p></section>");

  const preview = useMemo(
    () => `<!doctype html><html><body style="font-family:Inter;padding:18px;color:#0f172a">${markup}</body></html>`,
    [markup]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 text-sm text-slate-300">Canlı Editör</h3>
        <textarea
          value={markup}
          onChange={(event) => setMarkup(event.target.value)}
          className="h-72 w-full rounded-xl border border-white/15 bg-slate-950/80 p-3 text-sm outline-none"
        />
      </div>
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 text-sm text-slate-300">Önizleme</h3>
        <iframe title="Canlı Önizleme" srcDoc={preview} className="h-72 w-full rounded-xl border border-white/15 bg-white" />
      </div>
    </div>
  );
};
