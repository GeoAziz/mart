import { z } from 'zod';

const envSchema = z.object({
  PAYPAL_CLIENT_ID: z.string(),
  PAYPAL_CLIENT_SECRET: z.string(),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
});

export const env = envSchema.parse(process.env);
