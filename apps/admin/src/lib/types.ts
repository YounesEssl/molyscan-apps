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
  role: UserRole;
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

export interface PriceRequestParty {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: UserRole;
}

export interface PriceRequest {
  id: string;
  productName: string | null;
  molydalRef: string | null;
  clientName: string | null;
  quantity: number | null;
  unit: string;
  status: string;
  routedToAdmins: boolean;
  createdAt: string;
  user: PriceRequestParty;
  routedDepartment: Department | null;
  recipients: PriceRequestParty[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type EquivalenceSource = 'expert' | 'feedback';

export interface ExpertEquivalence {
  id: string;
  competitorBrand: string;
  competitorName: string;
  competitorKey: string;
  molydalEquivalent: string;
  molydalFamily: string | null;
  confidence: number;
  note: string | null;
  validatedBy: string | null;
  source: EquivalenceSource;
  createdAt: string;
  updatedAt: string;
}

export interface PendingEquivalence {
  competitorBrand: string;
  competitorName: string;
  currentGuess: string | null;
  compatibility: number | null;
  scanCount: number;
  lastScanAt: string;
}
