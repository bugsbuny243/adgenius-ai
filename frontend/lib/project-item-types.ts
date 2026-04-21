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

export const PROJECT_ITEM_TYPE_LABELS: Record<WorkflowProjectItemType, string> = {
  brief: 'Brief',
  scope: 'Scope',
  task_plan: 'Task Plan',
  draft: 'Draft',
  revision_note: 'Revision Note',
  delivery_note: 'Delivery Note',
  agent_output: 'Agent Output'
};

export const PROJECT_ITEM_TYPE_DISPLAY: Record<WorkflowProjectItemType, { emoji: string; tone: string }> = {
  brief: { emoji: '🧾', tone: 'text-sky-200' },
  scope: { emoji: '🧭', tone: 'text-indigo-200' },
  task_plan: { emoji: '🗂️', tone: 'text-lilac' },
  draft: { emoji: '✍️', tone: 'text-white' },
  revision_note: { emoji: '🔁', tone: 'text-amber-200' },
  delivery_note: { emoji: '📦', tone: 'text-emerald-200' },
  agent_output: { emoji: '🤖', tone: 'text-neon' }
};

export function normalizeProjectItemType(value: unknown): WorkflowProjectItemType {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (WORKFLOW_PROJECT_ITEM_TYPES.includes(normalized as WorkflowProjectItemType)) {
    return normalized as WorkflowProjectItemType;
  }
  return 'agent_output';
}

export function projectItemTypeLabel(type: WorkflowProjectItemType | string): string {
  if (WORKFLOW_PROJECT_ITEM_TYPES.includes(type as WorkflowProjectItemType)) {
    return PROJECT_ITEM_TYPE_LABELS[type as WorkflowProjectItemType];
  }
  return String(type || 'Item');
}

export function projectItemTypeDisplay(type: WorkflowProjectItemType | string) {
  const normalized = normalizeProjectItemType(type);
  return PROJECT_ITEM_TYPE_DISPLAY[normalized];
}
