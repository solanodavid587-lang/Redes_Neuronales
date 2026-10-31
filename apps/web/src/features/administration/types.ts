export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'AI_ENGINEER' | 'REVIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  target: string;
  ip: string;
  timestamp: string;
}