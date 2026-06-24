import crypto from 'crypto';
import { createApiError, ErrorCodes } from '@/lib/api-errors';

/**
 * Webhook Verification Utilities
 * Verifies authenticity of webhook events from payment providers
 */

export interface StripeWebhookHeaders {
  'stripe-signature': string;
}

export interface PayPalWebhookHeaders {
  'paypal-transmission-id': string;
  'paypal-transmission-time': string;
  'paypal-cert-url': string;
  'paypal-auth-algo': string;
  'paypal-transmission-sig': string;
}

/**
 * Verify Stripe webhook signature
 * Stripe uses HMAC SHA-256 with their secret key
 */
export async function verifyStripeWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Stripe signature format: t=timestamp,v1=signature
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts.t;
    const signedContent = `${timestamp}.${body}`;

    // Calculate expected signature
    const computed = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const expected = parts.v1;
    if (!expected) {
      return false;
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(expected)
    );

    // Check timestamp is recent (within 5 minutes to prevent replay attacks)
    const receivedTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - receivedTime;

    if (timeDiff > 300) {
      console.warn(
        `Stripe webhook timestamp too old: ${timeDiff}s. Possible replay attack.`
      );
      return false;
    }

    return isValid;
  } catch (error) {
    console.error('Stripe webhook verification failed:', error);
    return false;
  }
}

/**
 * Verify PayPal webhook signature
 * PayPal uses RSA SHA-256 signature verification
 * Signature verification string format: transmissionId|transmissionTime|webhookId|bodyHash
 */
export async function verifyPayPalWebhookSignature(
  body: string,
  transmissionId: string,
  transmissionTime: string,
  certUrl: string,
  signature: string,
  webhookId: string
): Promise<boolean> {
  try {
    if (!webhookId) {
      console.warn('PayPal webhook ID not configured. Webhook verification will fail.');
      return false;
    }

    // Build the string that was signed
    const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
    const signatureBase = `${transmissionId}|${transmissionTime}|${webhookId}|${bodyHash}`;

    // Download PayPal's certificate for verification
    // SECURITY: Must be https:// and from PayPal's domain
    if (!certUrl || !certUrl.startsWith('https://api.paypal.com') && !certUrl.startsWith('https://api.sandbox.paypal.com')) {
      console.warn(`Invalid cert URL: ${certUrl}. Only PayPal certificates are allowed.`);
      return false;
    }

    // Fetch the certificate
    const certResponse = await fetch(certUrl);
    if (!certResponse.ok) {
      console.error(`Failed to fetch PayPal certificate: ${certResponse.statusText}`);
      return false;
    }

    const certPem = await certResponse.text();

    // Verify the RSA signature using the public key from the certificate
    // PKCS#1 padding is default for Node.js crypto module
    const verifier = crypto.createVerify('sha256');
    verifier.update(signatureBase);

    const isValid = verifier.verify(certPem, signature, 'base64');

    if (!isValid) {
      console.warn('PayPal webhook signature verification failed.');
      console.warn(`  Signature Base: ${signatureBase}`);
      console.warn(`  Certificate URL: ${certUrl}`);
    }

    // Additional security: Verify timestamp is recent (prevent replay attacks)
    const receivedTime = new Date(transmissionTime).getTime();
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - receivedTime) / 1000; // Convert to seconds

    if (timeDiff > 300) { // 5 minutes tolerance
      console.warn(`PayPal webhook timestamp too old: ${timeDiff}s. Possible replay attack.`);
      return false;
    }

    return isValid;
  } catch (error) {
    console.error('PayPal webhook verification error:', error);
    return false;
  }
}

/**
 * Verify webhook is authentic and hasn't been tampered with
 */
export function throwIfWebhookVerificationFails(isValid: boolean, provider: string): void {
  if (!isValid) {
    throw createApiError(
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      `${provider} webhook verification failed. Request rejected for security.`,
      401
    );
  }
}
