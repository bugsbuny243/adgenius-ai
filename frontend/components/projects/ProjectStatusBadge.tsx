import { normalizeProjectStatus, projectStatusLabel } from '@/lib/project-status';

const STATUS_CLASS: Record<string, string> = {
  draft: 'border-white/20 text-white/80',
  in_progress: 'border-sky-300/40 text-sky-100',
  revision: 'border-amber-300/40 text-amber-100',
  delivered: 'border-emerald-300/40 text-emerald-100'
};

export function ProjectStatusBadge({ status }: { status: string | null | undefined }) {
  const normalized = normalizeProjectStatus(status);
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${STATUS_CLASS[normalized] ?? STATUS_CLASS.draft}`}>
      {projectStatusLabel(normalized)}
    </span>
  );
}
