export type UserRole = 'commercial' | 'distributor' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface Department {
  id: string;
  code: string | null;
  name: string;
  emailNotificationsDisabled: boolean;
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
  noEquivalent: boolean;
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
  requestedBy: PriceRequestParty;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompetitiveIntelligenceRow {
  brand: string;
  product: string | null;
  scanCount: number;
  userCount: number;
  matchedCount: number;
  noMatchCount: number;
  lastScanAt: string;
}

export interface CompetitiveIntelligence
  extends PagedResult<CompetitiveIntelligenceRow> {
  groupBy: 'product' | 'brand';
  summary: { scanCount: number; productCount: number; brandCount: number };
}

export interface ScanFeedback {
  id: string;
  createdAt: string;
  equivalentName: string;
  suggestedName: string | null;
  vote: 'up' | 'down';
  user: PriceRequestParty;
  scan: {
    id: string;
    identifiedBrand: string | null;
    identifiedName: string | null;
    competitorProduct: { brand: string; name: string } | null;
  };
}

export interface ConversationSubmission {
  id: string;
  createdAt: string;
  user: PriceRequestParty;
  conversation: {
    id: string;
    title: string;
    scannedBrand: string | null;
    scannedName: string | null;
    _count: { messages: number };
  };
}

export interface SubmittedMessage {
  id: string;
  role: string;
  text: string;
  timestamp: string;
}
