import type { ReactNode } from 'react';

type ProjectItemCardProps = {
  title: string;
  content: string | null;
  createdAt: string;
  children?: ReactNode;
};

export function ProjectItemCard({ title, content, createdAt, children }: ProjectItemCardProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-black/20 p-3">
      <p className="font-medium">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-white/75">{content || 'İçerik girilmedi.'}</p>
      <p className="mt-2 text-xs text-white/55">{new Date(createdAt).toLocaleString('tr-TR')}</p>
      {children}
    </article>
  );
}
