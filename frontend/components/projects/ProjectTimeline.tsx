import { projectItemTypeLabel } from '@/lib/project-item-types';
import type { WorkflowItemRecord } from '@/lib/project-workflow';

export function ProjectTimeline({ items }: { items: Array<WorkflowItemRecord & { normalizedType: string }> }) {
  if (items.length === 0) {
    return <p className="text-sm text-white/70">No workflow timeline yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
          <p className="font-medium">{item.title || projectItemTypeLabel(item.normalizedType )}</p>
          <p className="text-xs text-white/60">{projectItemTypeLabel(item.normalizedType )} • {new Date(item.created_at).toLocaleString('tr-TR')}</p>
        </div>
      ))}
    </div>
  );
}
