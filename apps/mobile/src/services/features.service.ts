import { api } from '@/lib/axios';
import { ENDPOINTS } from '@/constants/api';
import { DISABLED_FEATURES, FeaturesSchema, type Features } from '@/schemas/features.schema';

export const featuresService = {
  async get(signal?: AbortSignal): Promise<Features> {
    try {
      const response = await api.get(ENDPOINTS.features, { signal });
      return FeaturesSchema.parse(response.data);
    } catch {
      // Replace an earlier grant on a failed refresh; never enable a paid
      // feature from stale cache when its current availability is unknown.
      return DISABLED_FEATURES;
    }
  },
};
