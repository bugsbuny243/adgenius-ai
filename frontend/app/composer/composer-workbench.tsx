'use client';

import { useMemo, useState } from 'react';
import { LivePreviewPanel } from '@/components/agent-editor/LivePreviewPanel';
import { SocialOutputPanel } from '@/components/agent-editor/SocialOutputPanel';

type ComposerWorkbenchProps = {
  projects: Array<{ id: string; name: string }>;
  createContentJobAction: (formData: FormData) => void;
  youtubeConnected: boolean;
  bloggerConnected: boolean;
};

export function ComposerWorkbench({ projects, createContentJobAction, youtubeConnected, bloggerConnected }: ComposerWorkbenchProps) {
  const [brief, setBrief] = useState('');
  const [agentType, setAgentType] = useState('Koschei Social Agent');
  const [contentType, setContentType] = useState('Video metni');
  const [projectId, setProjectId] = useState('');
  const [youtube, setYoutube] = useState(true);
  const [instagram, setInstagram] = useState(true);
  const [tiktok, setTiktok] = useState(true);

  const derivedPrompt = useMemo(
    () => `Agent: ${agentType}\nİçerik türü: ${contentType}\nBrief: ${brief || 'Henüz belirtilmedi'}\nPlatformlar: ${[
      youtube ? 'YouTube' : null,
      instagram ? 'Instagram' : null,
      tiktok ? 'TikTok' : null
    ]
      .filter(Boolean)
      .join(', ')}`,
    [agentType, contentType, brief, youtube, instagram, tiktok]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <form action={createContentJobAction} className="panel space-y-3">
        <h2 className="text-xl font-semibold">Composer</h2>
        <label className="block text-sm">Agent
          <select name="agent_type" value={agentType} onChange={(event) => setAgentType(event.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
            <option>Koschei Social Agent</option>
            <option>Koschei Research Agent</option>
            <option>Koschei Publisher Assistant</option>
          </select>
        </label>
        <label className="block text-sm">İçerik türü
          <select name="content_type" value={contentType} onChange={(event) => setContentType(event.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
            <option>Video metni</option>
            <option>Reklam metni</option>
            <option>Blog özeti</option>
            <option>Topluluk gönderisi</option>
          </select>
        </label>

        <label className="block text-sm">Proje
          <select name="project_id" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2">
            <option value="">Projeye bağlama (opsiyonel)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">Prompt / brief
          <textarea required name="brief" rows={5} value={brief} onChange={(event) => setBrief(event.target.value)} className="mt-2 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2" />
        </label>

        <fieldset>
          <legend className="text-sm">Platformlar</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <label><input type="checkbox" name="platforms" value="youtube" checked={youtube} onChange={(e) => setYoutube(e.target.checked)} /> YouTube</label>
            <label><input type="checkbox" name="platforms" value="instagram" checked={instagram} onChange={(e) => setInstagram(e.target.checked)} /> Instagram</label>
            <label><input type="checkbox" name="platforms" value="tiktok" checked={tiktok} onChange={(e) => setTiktok(e.target.checked)} /> TikTok</label>
          </div>
        </fieldset>

        <button type="submit" className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink">Üret, önizle, kaydet ve kuyruğa ekle</button>
      </form>

      <LivePreviewPanel
        title="Canlı içerik planı"
        helpText="Composer çıktısı bu yapı üzerinden üretilecek."
        blocks={[
          { title: 'Agent', content: agentType || 'Henüz belirtilmedi' },
          { title: 'İçerik türü', content: contentType || 'Henüz belirtilmedi' },
          { title: 'Brief', content: brief || 'Henüz belirtilmedi' }
        ]}
        derivedPrompt={derivedPrompt}
      />

      <div className="xl:col-span-2 panel">
        <h3 className="mb-2 text-lg font-semibold">Sosyal çıktı önizleme</h3>
        <SocialOutputPanel
          projectId={projectId || null}
          youtubeConnected={youtubeConnected}
          bloggerConnected={bloggerConnected}
          youtubeTitle={brief ? `🎯 ${brief.slice(0, 70)}` : null}
          youtubeDescription={brief || null}
          instagramCaption={brief || null}
          tiktokCaption={brief || null}
        />
      </div>
    </div>
  );
}
