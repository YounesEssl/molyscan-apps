import type { User } from '@/schemas/auth.schema';

export const MOCK_USER: User = {
  id: 'usr-001',
  email: 'marc.dupont@molydal.com',
  firstName: 'Marc',
  lastName: 'Dupont',
  role: 'commercial',
  company: 'Molydal',
  phone: '+33 6 12 34 56 78',
  createdAt: '2024-01-15T09:00:00.000Z',
};

export const MOCK_COMMERCIAL: User = MOCK_USER;

export const MOCK_DISTRIBUTOR: User = {
  id: 'usr-002',
  email: 'sophie.martin@lubritech.fr',
  firstName: 'Sophie',
  lastName: 'Martin',
  role: 'distributor',
  company: 'LubriTech Distribution',
  phone: '+33 6 98 76 54 32',
  createdAt: '2024-02-10T14:30:00.000Z',
};

export const MOCK_ADMIN: User = {
  id: 'usr-003',
  email: 'pierre.leroy@molydal.com',
  firstName: 'Pierre',
  lastName: 'Leroy',
  role: 'admin',
  company: 'Molydal',
  phone: '+33 6 55 44 33 22',
  createdAt: '2023-11-01T08:00:00.000Z',
};
