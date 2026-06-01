export type UserRole = 'commercial' | 'distributor' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface Department {
  id: string;
  code: string | null;
  name: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status?: UserStatus;
  departments?: Department[];
}

export interface AccessRequest {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: string;
  departments: Department[];
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  company: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  departments: Department[];
  _count: { scans: number; workflows: number };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
