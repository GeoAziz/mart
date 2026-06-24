# Environment Variables Configuration

This document outlines all environment variables required for the ZilaCart application, including the newly added features for checkout improvements.

## Required Environment Variables

### Firebase Configuration
```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Stripe Payment Configuration
```env
# Stripe Public Key (Client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Stripe Secret Key (Server-side) - **CRITICAL FIX #1**
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

**Important:** 
- The Stripe payment intent endpoint requires `STRIPE_SECRET_KEY` to be set
- Without this, all card payments will fail
- Use test keys for development (`pk_test_` and `sk_test_`)
- Use live keys for production (`pk_live_` and `sk_live_`)

### PayPal Payment Configuration
```env
# PayPal Client ID (used client-side in PayPal buttons)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id

# PayPal Secret (Server-side)
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# PayPal Mode (sandbox or live)
PAYPAL_MODE=sandbox
```

### Email Configuration (SMTP) - **NEW FEATURE #5**
```env
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Base URL for email links
NEXT_PUBLIC_BASE_URL=https://mart-blond.vercel.app
```

**Email Service Notes:**
- For Gmail, you need to create an App Password (not your regular password)
  1. Go to Google Account settings
  2. Security → 2-Step Verification → App passwords
  3. Generate a new app password for "Mail"
  4. Use this password in `SMTP_PASS`
- For other email providers:
  - **Outlook/Hotmail:** `smtp.office365.com:587`
  - **Yahoo:** `smtp.mail.yahoo.com:587`
  - **SendGrid:** `smtp.sendgrid.net:587` (use API key as password)

### Currency Conversion API - **NEW FEATURE #4**
```env
# Exchange Rate API Key (for real-time KES to USD conversion)
EXCHANGE_RATE_API_KEY=your_exchangerate_api_key
```

**Currency Conversion Notes:**
- Get a free API key from https://www.exchangerate-api.com/
- Free tier includes 1,500 requests/month
- If the API is unavailable, system falls back to conservative rate (0.0077 USD per KES)
- Rates are cached for 1 hour to minimize API usage

### Application Configuration
```env
# Next.js Base URL
NEXT_PUBLIC_BASE_URL=https://mart-blond.vercel.app

# Node Environment
NODE_ENV=development
```

## Environment Setup Instructions

### Development Setup

1. Create a `.env.local` file in the project root:
```bash
cp .env.example .env.local
```

2. Fill in all required values from the sections above

3. Restart your development server:
```bash
npm run dev
```

### Production Setup (Vercel)

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add each variable listed above
4. Deploy your application

**Security Notes:**
- Never commit `.env.local` or `.env.production` to version control
- Keep `.env.example` updated with variable names (but not values)
- Rotate API keys and secrets regularly
- Use different keys for development and production

## Testing Your Configuration

### Test Stripe Integration
```bash
# Test with Stripe test card numbers
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# Requires Auth: 4000 0027 6000 3184
```

### Test PayPal Integration
Use PayPal sandbox accounts:
- Login to https://developer.paypal.com/
- Create sandbox test accounts for buyer/seller

### Test Email Sending
```bash
# In development, check console logs
# Emails will be sent via configured SMTP
```

### Test Currency Conversion
```bash
# Monitor logs for currency conversion
# Should show current exchange rate or fallback notice
```

## Troubleshooting

### Stripe Errors
- **Error:** "No such API key"
  - **Solution:** Check `STRIPE_SECRET_KEY` is set and starts with `sk_test_` or `sk_live_`

### Email Errors
- **Error:** "Invalid login"
  - **Solution:** For Gmail, ensure you're using an App Password, not your regular password
- **Error:** "Connection timeout"
  - **Solution:** Check firewall settings, try port 465 with `secure: true`

### PayPal Errors
- **Error:** "Currency not supported"
  - **Solution:** System now auto-converts KES to USD using real-time rates

### Currency Conversion Errors
- **Error:** API request failed
  - **Solution:** System automatically falls back to conservative rate (0.0077)
  - Check if `EXCHANGE_RATE_API_KEY` is valid

## Security Checklist

- [ ] All secrets are set as environment variables (not hardcoded)
- [ ] `.env.local` is in `.gitignore`
- [ ] Different API keys for development/production
- [ ] SMTP credentials use app-specific passwords
- [ ] Firebase service account key is properly escaped
- [ ] All `NEXT_PUBLIC_*` variables contain only non-sensitive data

## Support

For issues with environment configuration:
1. Check console logs for specific error messages
2. Verify all required variables are set
3. Test each integration independently
4. Check provider-specific documentation for API keys

---

**Last Updated:** 2026-01-20
**Related:** Checkout improvements, Payment processing fixes
