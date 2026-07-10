import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';

export interface CrmCompany {
  id: string;
  name: string;
}

export interface CrmContact {
  id: string;
  companyId: string | null;
  companyName?: string | null;
  name: string;
}

export interface CrmStatus {
  configured: boolean;
  login: string | null;
}

export const crmService = {
  async getStatus(): Promise<CrmStatus> {
    const response = await api.get(ENDPOINTS.crm.credentialsStatus);
    return response.data;
  },

  async saveCredentials(login: string, password: string): Promise<CrmStatus> {
    const response = await api.post(ENDPOINTS.crm.credentials, { login, password });
    return response.data;
  },

  async deleteCredentials(): Promise<CrmStatus> {
    const response = await api.delete(ENDPOINTS.crm.credentials);
    return response.data;
  },

  async searchCompanies(
    q = '',
  ): Promise<{ items: CrmCompany[]; total: number }> {
    // Recherche côté serveur : on ne reçoit que ≤50 résultats (pas les 17k).
    // Le 1er appel après connexion peut déclencher le fetch CRM (~14s), ensuite
    // c'est servi depuis le cache serveur → timeout large par sécurité.
    const response = await api.get(ENDPOINTS.crm.companies, {
      params: { q },
      timeout: 30000,
    });
    return response.data;
  },

  async searchContacts(
    companyId?: string | null,
    q = '',
  ): Promise<{ items: CrmContact[]; total: number }> {
    const response = await api.get(ENDPOINTS.crm.contacts, {
      params: { ...(companyId ? { companyId } : {}), q },
      timeout: 120000,
    });
    return response.data;
  },
};
