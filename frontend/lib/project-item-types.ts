export const WORKFLOW_PROJECT_ITEM_TYPES = [
  'brief',
  'scope',
  'task_plan',
  'draft',
  'revision_note',
  'delivery_note',
  'agent_output'
] as const;

export type WorkflowProjectItemType = (typeof WORKFLOW_PROJECT_ITEM_TYPES)[number];

export function normalizeProjectItemType(value: unknown): WorkflowProjectItemType {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (WORKFLOW_PROJECT_ITEM_TYPES.includes(normalized as WorkflowProjectItemType)) {
    return normalized as WorkflowProjectItemType;
  }
  return 'agent_output';
}

export function projectItemTypeLabel(type: WorkflowProjectItemType | string): string {
  if (type === 'task_plan') return 'Task Plan';
  if (type === 'revision_note') return 'Revision Note';
  if (type === 'delivery_note') return 'Delivery Note';
  if (type === 'agent_output') return 'Agent Output';
  if (type === 'brief') return 'Brief';
  if (type === 'scope') return 'Scope';
  if (type === 'draft') return 'Draft';
  return type;
}
