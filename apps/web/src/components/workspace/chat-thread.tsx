'use client';

import { SkeletonText } from '@/components/ui/skeleton';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type ChatThreadProps = {
  messages: ChatMessage[];
  loading: boolean;
};

export function ChatThread({ messages, loading }: ChatThreadProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <h2 className="mb-3 text-sm font-medium text-zinc-200">Konuşma Akışı</h2>

      {loading ? (
        <div className="space-y-3">
          <SkeletonText lines={3} />
          <SkeletonText lines={2} className="opacity-70" />
        </div>
      ) : null}

      {!loading && messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4 text-sm text-zinc-300">
          Bir görev yazarak başlayın. Sonuçlar burada adım adım görünür.
        </p>
      ) : null}

      <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => {
          const isUser = message.role === 'user';

          return (
            <article
              key={message.id}
              className={`rounded-2xl border p-3 ${isUser ? 'ml-8 border-indigo-500/30 bg-indigo-500/10' : 'mr-8 border-zinc-700 bg-zinc-900/70'}`}
            >
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-400">{isUser ? 'Siz' : 'Koschei'}</p>
              <p className="whitespace-pre-wrap text-sm text-zinc-100">{message.content}</p>
              <p className="mt-2 text-right text-[11px] text-zinc-500">{new Date(message.createdAt).toLocaleTimeString('tr-TR')}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
