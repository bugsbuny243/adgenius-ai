export const PROJECT_STATUSES = ['draft', 'in_progress', 'in_revision', 'near_delivery', 'delivered'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function normalizeProjectStatus(value: unknown): ProjectStatus {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (PROJECT_STATUSES.includes(normalized as ProjectStatus)) {
    return normalized as ProjectStatus;
  }
  return 'draft';
}

export function projectStatusLabel(status: ProjectStatus): string {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'in_revision') return 'In Revision';
  if (status === 'near_delivery') return 'Near Delivery';
  if (status === 'delivered') return 'Delivered';
  return 'Draft';
}
