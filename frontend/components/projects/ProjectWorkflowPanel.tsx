import type { ReactNode } from 'react';
import { ProjectItemCard } from '@/components/projects/ProjectItemCard';
import { projectItemTypeLabel } from '@/lib/project-item-types';
import type { WorkflowItemRecord } from '@/lib/project-workflow';

export function ProjectWorkflowPanel({
  title,
  item,
  emptyText,
  action
}: {
  title: string;
  item: WorkflowItemRecord | null;
  emptyText: string;
  action?: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action}
      </div>
      {!item ? (
        <p className="text-sm text-white/70">{emptyText}</p>
      ) : (
        <ProjectItemCard title={item.title || projectItemTypeLabel(item.item_type )} content={item.content} createdAt={item.created_at} />
      )}
    </section>
  );
}
