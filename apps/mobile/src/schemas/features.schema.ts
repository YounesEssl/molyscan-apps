import { z } from 'zod';

export const FeaturesSchema = z.object({
  crmHistoryEditingEnabled: z.boolean().default(false),
});

export type Features = z.infer<typeof FeaturesSchema>;

export const DISABLED_FEATURES: Features = Object.freeze({ crmHistoryEditingEnabled: false });
