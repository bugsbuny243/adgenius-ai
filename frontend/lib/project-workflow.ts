import { normalizeProjectItemType, type WorkflowProjectItemType } from '@/lib/project-item-types';

export type WorkflowItemRecord = {
  id: string;
  item_type: string;
  title: string | null;
  content: string | null;
  parent_item_id?: string | null;
  metadata?: Record<string, unknown> | null;
  saved_output_id?: string | null;
  created_at: string;
  parent_item_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function groupItemsByType(items: WorkflowItemRecord[]): Record<string, WorkflowItemRecord[]> {
  return items.reduce<Record<string, WorkflowItemRecord[]>>((acc, item) => {
    const type = normalizeProjectItemType(item.item_type);
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});
}

export function findLatestItem(items: WorkflowItemRecord[], type: WorkflowProjectItemType): WorkflowItemRecord | null {
  return filterItemsByType(items, type)[0] ?? null;
}

export function filterItemsByType(items: WorkflowItemRecord[], type: WorkflowProjectItemType): WorkflowItemRecord[] {
  return items.filter((item) => normalizeProjectItemType(item.item_type) === type);
}

export function buildWorkflowTimeline(items: WorkflowItemRecord[]) {
  return [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((item) => ({
      ...item,
      normalizedType: normalizeProjectItemType(item.item_type),
      hasParent: Boolean(item.parent_item_id),
      hasSavedOutput: Boolean(item.saved_output_id)
    }));
}

export function hasWorkflowItemType(items: WorkflowItemRecord[], type: WorkflowProjectItemType): boolean {
  return items.some((item) => normalizeProjectItemType(item.item_type) === type);
}
