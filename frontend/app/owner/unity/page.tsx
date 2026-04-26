'use client';

import { useMemo, useState } from 'react';
import {
  UNITY_TEMPLATE_SEEDS,
  createUnityBuildJobPayload,
  createUnityGameBriefFromPrompt,
  normalizePackageName,
  selectUnityTemplateForPrompt,
  validateUnityGameProjectDraft
} from '@/lib/unity-shared';

const DEFAULT_PROMPT = 'Create a colorful mobile puzzle game with quick sessions and score combos.';

export default function OwnerUnityBridgePage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [appName, setAppName] = useState('Koschei Mobile Game');

  const selectedTemplate = useMemo(() => selectUnityTemplateForPrompt(prompt), [prompt]);
  const packageName = useMemo(() => normalizePackageName(appName), [appName]);
  const gameBrief = useMemo(() => createUnityGameBriefFromPrompt(prompt), [prompt]);
  const draftValidation = useMemo(
    () =>
      validateUnityGameProjectDraft({
        appName,
        packageName,
        userPrompt: prompt,
        targetPlatform: 'android',
        templateSlug: selectedTemplate.slug
      }),
    [appName, packageName, prompt, selectedTemplate.slug]
  );

  const buildPayloadPreview = useMemo(
    () =>
      createUnityBuildJobPayload({
        unityGameProjectId: 'production-project-id',
        appName,
        packageName,
        userPrompt: prompt,
        buildType: 'development',
        requestedOutput: 'aab'
      }),
    [appName, packageName, prompt]
  );

  return (
    <section className="grid gap-4">
      <header className="panel">
        <h2 className="text-xl font-semibold">Koschei Unity Bridge</h2>
        <p className="mt-2 text-sm text-white/80">
          Unity build hazırlığı bu ekranda yönetilir. Build çalıştırma süreci Unity worker katmanında yürür.
        </p>
      </header>

      <section className="panel">
        <h3 className="text-base font-semibold">Template seeds</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {UNITY_TEMPLATE_SEEDS.map((template) => (
            <article key={template.slug} className="rounded-xl border border-white/15 bg-black/20 p-3 text-sm">
              <p className="font-medium">{template.title}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-neon/80">{template.genre}</p>
              <p className="mt-2 text-white/80">{template.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel grid gap-3">
        <h3 className="text-base font-semibold">Unity Build Akışı</h3>
        <label className="grid gap-2 text-sm">
          <span>App name</span>
          <input
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            className="rounded-lg border border-white/15 bg-black/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span>Game prompt</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={6}
            className="rounded-lg border border-white/15 bg-black/20 px-3 py-2"
          />
        </label>

        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
          <p>
            <strong>Selected template:</strong> {selectedTemplate.slug}
          </p>
          <p>
            <strong>Normalized package name:</strong> {packageName}
          </p>
          {!draftValidation.ok ? (
            <ul className="mt-2 list-disc pl-5 text-rose-200">
              {draftValidation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-emerald-200">Taslak doğrulaması tamamlandı. Build payload hazır.</p>
          )}
        </div>
      </section>

      <section className="panel grid gap-3">
        <h3 className="text-base font-semibold">Generated game brief</h3>
        <pre className="overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs">{JSON.stringify(gameBrief, null, 2)}</pre>
      </section>

      <section className="panel grid gap-3">
        <h3 className="text-base font-semibold">Build payload</h3>
        <pre className="overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs">{JSON.stringify(buildPayloadPreview, null, 2)}</pre>
      </section>
    </section>
  );
}
