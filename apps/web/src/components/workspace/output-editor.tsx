'use client';

import { useEffect, useMemo, useState } from 'react';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderInlineMarkdown(text: string) {
  let output = text;
  output = output.replace(/`([^`]+)`/g, '<code class="rounded bg-zinc-800 px-1 text-xs">$1</code>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return output;
}

function renderMarkdown(text: string): string {
  const lines = escapeHtml(text).split('\n');
  const htmlParts: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!inList) {
        htmlParts.push('<ul class="list-disc space-y-1 pl-5">');
        inList = true;
      }
      htmlParts.push(`<li>${renderInlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }

    if (line.startsWith('## ')) {
      htmlParts.push(`<h2 class="mb-2 mt-4 text-lg font-semibold">${renderInlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('### ')) {
      htmlParts.push(`<h3 class="mb-2 mt-3 text-base font-semibold">${renderInlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (line.trim().length === 0) {
      htmlParts.push('<br/>');
      continue;
    }

    htmlParts.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  if (inList) {
    htmlParts.push('</ul>');
  }

  return htmlParts.join('');
}

type OutputEditorProps = {
  initialContent: string;
  saveTitle: string;
  onTitleChange: (value: string) => void;
  onSave: (content: string) => void;
  onContentAutosave: (content: string) => void;
  onCopy: (content: string) => Promise<void>;
  onClear: () => void;
  saving: boolean;
  saveStatus: string;
};

export function OutputEditor({
  initialContent,
  saveTitle,
  onTitleChange,
  onSave,
  onContentAutosave,
  onCopy,
  onClear,
  saving,
  saveStatus,
}: OutputEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onContentAutosave(content);
    }, 2000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [content, onContentAutosave]);

  const renderedMarkdown = useMemo(() => renderMarkdown(content), [content]);

  return (
    <section className="flex h-full min-h-[600px] flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-200">Output Editor</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => onSave(content)}
            disabled={saving || content.trim().length === 0}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={() => {
              void onCopy(content);
            }}
            disabled={content.trim().length === 0}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Kopyala
          </button>
          <button
            type="button"
            onClick={() => {
              setContent('');
              onClear();
            }}
            disabled={content.length === 0}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-zinc-200 hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Temizle
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode((current) => !current)}
            className="rounded-md border border-indigo-500/40 px-3 py-1.5 text-indigo-200 hover:border-indigo-400 hover:text-indigo-100"
          >
            {previewMode ? 'Düzenleme' : 'Önizleme'}
          </button>
        </div>
      </div>

      <input
        type="text"
        value={saveTitle}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Başlık (opsiyonel)"
        className="mb-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-indigo-400 placeholder:text-zinc-500 focus:ring"
      />

      {previewMode ? (
        <div
          className="prose prose-invert max-w-none flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm"
          dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
        />
      ) : (
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-[420px] flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none ring-indigo-400 focus:ring"
          placeholder="Agent sonucu burada düzenlenebilir..."
        />
      )}

      {saveStatus ? <p className="mt-3 text-xs text-zinc-300">{saveStatus}</p> : null}
    </section>
  );
}
