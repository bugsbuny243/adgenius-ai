export const PROJECT_STATUSES = ['draft', 'in_progress', 'revision', 'delivered'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  revision: 'Revision',
  delivered: 'Delivered'
};

export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  draft: ['in_progress', 'revision', 'delivered'],
  in_progress: ['revision', 'delivered'],
  revision: ['in_progress', 'delivered'],
  delivered: []
};

export function normalizeProjectStatus(value: unknown): ProjectStatus {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (PROJECT_STATUSES.includes(normalized as ProjectStatus)) {
    return normalized as ProjectStatus;
  }
  return 'draft';
}

export function projectStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status] ?? PROJECT_STATUS_LABELS.draft;
}

export function canTransitionProjectStatus(current: unknown, next: unknown): boolean {
  const currentStatus = normalizeProjectStatus(current);
  const nextStatus = normalizeProjectStatus(next);
  return currentStatus === nextStatus || PROJECT_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}
