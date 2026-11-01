export type AppRole = 'ADMIN' | 'PROJECT_MANAGER' | 'AI_ENGINEER' | 'REVIEWER';

export function canManageProjects(role?: string): boolean {
  return role === 'ADMIN' || role === 'PROJECT_MANAGER';
}

export function canDeleteProjects(role?: string): boolean {
  return role === 'ADMIN';
}

export function canManageDatasets(role?: string): boolean {
  return role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'AI_ENGINEER';
}

export function canDesignArchitectures(role?: string): boolean {
  return role === 'ADMIN' || role === 'AI_ENGINEER';
}

export function canQueueTraining(role?: string): boolean {
  return role === 'ADMIN' || role === 'AI_ENGINEER';
}

export function canRegisterModels(role?: string): boolean {
  return role === 'ADMIN' || role === 'AI_ENGINEER';
}

export function canReviewModels(role?: string): boolean {
  return role === 'ADMIN' || role === 'REVIEWER';
}

export function canRequestReports(role?: string): boolean {
  return role === 'ADMIN'
    || role === 'PROJECT_MANAGER'
    || role === 'AI_ENGINEER'
    || role === 'REVIEWER';
}
