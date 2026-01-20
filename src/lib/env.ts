import { z } from 'zod';

const envSchema = z.object({
  PAYPAL_CLIENT_ID: z.string().min(1, 'PAYPAL_CLIENT_ID is required'),
  PAYPAL_CLIENT_SECRET: z.string().min(1, 'PAYPAL_CLIENT_SECRET is required'),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
});

// Parse environment variables with proper error handling
function parseEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Environment validation failed:');
    result.error.issues.forEach(issue => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    
    // Return fallback for development to prevent crashes
    // In production, you may want to throw instead
    return {
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
      PAYPAL_MODE: (process.env.PAYPAL_MODE as 'sandbox' | 'live') || 'sandbox',
    };
  }
  
  return result.data;
}

export const env = parseEnv();
