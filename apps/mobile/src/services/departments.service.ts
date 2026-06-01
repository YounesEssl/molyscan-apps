import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import {
  DepartmentsResponseSchema,
  type Department,
} from '@/schemas/auth.schema';

export const departmentsService = {
  // Liste publique des départements (sélection à l'inscription distributeur).
  list: async (config?: { signal?: AbortSignal }): Promise<Department[]> => {
    const { data } = await api.get(ENDPOINTS.departments.list, config);
    return DepartmentsResponseSchema.parse(data);
  },
} as const;
