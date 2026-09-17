import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { featuresService } from '@/services/features.service';
import { DISABLED_FEATURES, type Features } from '@/schemas/features.schema';

export const featuresQueryKey = (userId: string | undefined) => ['features', userId] as const;

export function featuresQueryOptions(userId: string | undefined) {
  return queryOptions({
    queryKey: featuresQueryKey(userId),
    queryFn: ({ signal }) => userId ? featuresService.get(signal) : Promise.resolve(DISABLED_FEATURES),
    enabled: Boolean(userId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    networkMode: 'always',
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });
}

export async function refreshFeatures(client: QueryClient, userId: string | undefined): Promise<Features> {
  if (!userId) return DISABLED_FEATURES;
  try {
    return await client.fetchQuery(featuresQueryOptions(userId));
  } catch {
    client.setQueryData(featuresQueryKey(userId), DISABLED_FEATURES);
    return DISABLED_FEATURES;
  }
}
