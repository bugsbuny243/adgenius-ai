'use client';

import type { AgentEditorConfig, EditorState } from '@/lib/agent-editor';

type AgentEditorRendererProps = {
  config: AgentEditorConfig;
  state: EditorState;
  onChange: (key: string, value: string | boolean) => void;
};

export function AgentEditorRenderer({ config, state, onChange }: AgentEditorRendererProps) {
  return (
    <div className="space-y-4">
      {config.sections.map((section) => (
        <div key={section.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="text-sm font-semibold text-white/90">{section.title}</h4>
          <p className="mt-1 text-xs text-white/55">Bu bölümdeki alanlar çalışma öncesi brifti güçlendirir.</p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {section.fields.map((field) => {
              const value = typeof state[field.key] === 'string' ? (state[field.key] as string) : '';

              if (field.type === 'select') {
                return (
                  <label key={field.key} className="flex min-w-0 flex-col gap-1 text-sm md:col-span-1">
                    <span className="text-white/70">{field.label}</span>
                    <select
                      value={value}
                      onChange={(event) => onChange(field.key, event.target.value)}
                      className="min-w-0 rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none transition focus:border-neon"
                    >
                      <option value="">Seçiniz</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              if (field.type === 'textarea') {
                return (
                  <label key={field.key} className="flex min-w-0 flex-col gap-1 text-sm md:col-span-2">
                    <span className="text-white/70">{field.label}</span>
                    <textarea
                      value={value}
                      onChange={(event) => onChange(field.key, event.target.value)}
                      rows={4}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none transition focus:border-neon"
                    />
                  </label>
                );
              }

              return (
                <label key={field.key} className="flex min-w-0 flex-col gap-1 text-sm md:col-span-1">
                  <span className="text-white/70">{field.label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="min-w-0 rounded-lg border border-white/20 bg-black/40 px-3 py-2 outline-none transition focus:border-neon"
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {config.toggles?.length ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="mb-3 text-sm font-semibold text-white/90">Opsiyonel Ayarlar</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {config.toggles.map((toggle) => (
              <label key={toggle.key} className="inline-flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={Boolean(state[toggle.key])}
                  onChange={(event) => onChange(toggle.key, event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/40"
                />
                {toggle.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
