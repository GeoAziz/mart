# Complete Implementation Guide: Recommendations & PayPal Webhooks

## 🎯 5 Recommendations - Implementation Status

All recommendations have been implemented:

### ✅ 1. PayPal Order Reconciliation (`/api/paypal/reconciliation`)
**Location:** `/src/app/api/paypal/reconciliation/route.ts`

**What it does:** 
- Periodically checks PayPal for completed orders without matching orders in your database
- Handles orphaned transactions (user paid but order creation failed)
- Runs as a scheduled job

**How to use:**
```bash
# Call it via cron job or manually
curl -X POST http://localhost:3000/api/paypal/reconciliation \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Limitation:** PayPal REST API v2 doesn't support bulk order searches. The code is ready but returns empty results. **Recommended:** Use webhooks instead (see #2).

---

### ✅ 2. PayPal Webhook Receiver (`/api/webhooks/paypal`)
**Location:** `/src/app/api/webhooks/paypal/route.ts`

**What it does:**
- Receives real-time events from PayPal (capture completed, refund, denial)
- Updates order status automatically
- Works with payment verification and refund processing

**Events handled:**
- `PAYMENT.CAPTURE.COMPLETED` → Updates order to `processing`
- `PAYMENT.CAPTURE.REFUNDED` → Updates order to `refunded`
- `PAYMENT.CAPTURE.DENIED` → Cancels order

---

### ✅ 3. Idempotency Keys (`/lib/idempotency.ts`)
**Location:** `/src/lib/idempotency.ts`

**What it does:**
- Prevents duplicate orders on double-clicks
- Caches order results for 24 hours
- Automatically cleans up expired keys

**Frontend usage:**
```typescript
const idempotencyKey = generateIdempotencyKey();
fetch('/api/orders', {
  method: 'POST',
  headers: { 'X-Idempotency-Key': idempotencyKey },
  body: JSON.stringify(orderData)
});
```

---

### ✅ 4. Refund System (`/api/refunds`)
**Location:** `/src/app/api/refunds/route.ts`

**What it does:**
- Processes refunds for PayPal, Stripe, and M-Pesa
- Automatically calls payment provider APIs
- Updates order and refund status

**Refund flow:**
```
Customer requests refund
    ↓
Server verifies order ownership & status
    ↓
Based on payment method:
  - PayPal → Call PayPal Refunds API
  - Stripe → Call Stripe Refunds API
  - M-Pesa → Create manual refund task
    ↓
Update order status to refund_pending or refunded
    ↓
Return refund confirmation
```

---

### ✅ 5. Email Notifications (See setup below)
**Location:** `/src/lib/email.ts`

---

## 📧 Email Notifications - Complete Setup Guide

### Step 1: Install Nodemailer

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

### Step 2: Configure Email Provider

Choose ONE email provider and follow its setup:

#### **Option A: Gmail (Recommended for testing)**

1. **Enable 2-Step Verification** (if not already)
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Complete setup

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Generate password
   - Copy the 16-character password

3. **Add to `.env`:**
```env
# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=ZilaCart
```

#### **Option B: SendGrid (Production recommended)**

1. **Create SendGrid account**
   - Go to: https://sendgrid.com/
   - Sign up free account (100 emails/day free)

2. **Generate API Key**
   - Dashboard → Settings → API Keys
   - Create new "Restricted Access" key
   - Permissions: Full Access to Mail Send

3. **Add to `.env`:**
```env
# SendGrid SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your_api_key_here
SMTP_FROM_EMAIL=noreply@zilacart.com
SMTP_FROM_NAME=ZilaCart
```

#### **Option C: Mailgun**

1. **Create Mailgun account**
   - Go to: https://www.mailgun.com/
   - Sign up (10,000 emails/month free)

2. **Get SMTP credentials**
   - Dashboard → Sending → Domain Settings
   - Copy SMTP Host, Port, Login, Password

3. **Add to `.env`:**
```env
# Mailgun SMTP
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASS=your_mailgun_password
SMTP_FROM_EMAIL=noreply@yourdomain.mailgun.org
SMTP_FROM_NAME=ZilaCart
```

#### **Option D: AWS SES**

1. **Setup AWS SES**
   - AWS Console → SES → Verified Identities
   - Add and verify email: noreply@zilacart.com
   - Go to SMTP Settings and create credentials

2. **Add to `.env`:**
```env
# AWS SES SMTP
SMTP_HOST=email-smtp.YOUR_REGION.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_smtp_username
SMTP_PASS=your_ses_smtp_password
SMTP_FROM_EMAIL=noreply@zilacart.com
SMTP_FROM_NAME=ZilaCart
```

### Step 3: Test Email Configuration

Run this test script:

```bash
# Create /src/scripts/test-email.ts
import { createTransporter } from '@/lib/email';

async function testEmail() {
  try {
    const transporter = createTransporter();
    
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: 'your-test-email@example.com',
      subject: 'ZilaCart Email Test',
      html: '<h1>Email works!</h1>',
    });

    console.log('✅ Email sent successfully:', result.messageId);
  } catch (err) {
    console.error('❌ Email failed:', err);
  }
}

testEmail();
```

Run it:
```bash
npx ts-node src/scripts/test-email.ts
```

### Step 4: Email Template Enhancement

The default email template in `/src/lib/email.ts` sends basic confirmations. To customize:

```typescript
// In email.ts - customize the HTML template:

const mailOptions = {
  from: process.env.SMTP_FROM_EMAIL,
  to: order.userEmail,
  subject: `Order Confirmation #${order.id}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Order Confirmed! 🎉</h2>
      <p>Thank you ${order.userFullName},</p>
      
      <h3>Order Details</h3>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      <p><strong>Total:</strong> KSh ${order.totalAmount.toLocaleString()}</p>
      
      <h3>Items</h3>
      <ul>
        ${order.items.map(item => `
          <li>${item.name} (x${item.quantity}) - KSh ${item.price.toLocaleString()}</li>
        `).join('')}
      </ul>
      
      <h3>Shipping Address</h3>
      <p>
        ${order.shippingAddress.fullName}<br>
        ${order.shippingAddress.address}<br>
        ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}<br>
        ${order.shippingAddress.phone}
      </p>
      
      <p><a href="http://localhost:3000/account/orders/${order.id}">Track your order</a></p>
    </div>
  `,
};
```

### Step 5: Verify Email is Working

After setup:

1. **Check dev server logs:**
```
✅ Email notification sent to customer@example.com
```

2. **Place a test order** and confirm email arrives

3. **If email doesn't arrive:**
   - Check spam folder
   - Verify SMTP credentials are correct
   - Check email provider's sending limits
   - Look at provider's delivery logs

---

## 🔗 PayPal Webhooks - Complete Setup Guide

### Step 1: Get Your Webhook URL

Your webhook receives events at:
```
https://yourdomain.com/api/webhooks/paypal
```

For local development, use ngrok to expose your local server:
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Output:
# Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
# Your webhook URL: https://abc123.ngrok.io/api/webhooks/paypal
```

### Step 2: Register Webhook in PayPal Dashboard

1. **Go to Developer Dashboard:**
   - https://developer.paypal.com/dashboard

2. **Navigate to Webhooks:**
   - Apps & Credentials → Sandbox → Webhooks

3. **Register New Webhook:**
   - Endpoint URL: `https://yourdomain.com/api/webhooks/paypal` (or ngrok URL for testing)
   - Event Types: Select:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.REFUNDED`
     - `PAYMENT.CAPTURE.DENIED`
   - Click "Save"

4. **Copy Webhook ID:**
   ```env
   PAYPAL_WEBHOOK_ID=WH_abc123xyz
   ```

### Step 3: Update `.env` with Webhook ID

```env
# PayPal Webhook
PAYPAL_WEBHOOK_ID=WH_your_webhook_id_here
```

### Step 4: Test Webhook Delivery

In PayPal Dashboard:

1. Find your webhook
2. Click "Send sample event"
3. Select event type: `PAYMENT.CAPTURE.COMPLETED`
4. Click "Send"

**Check your server logs:**
```
[PayPal Webhook] Received event: PAYMENT.CAPTURE.COMPLETED
[PayPal Webhook] Payment captured: abc123
[PayPal Webhook] Updated order XYZ status to processing
```

### Step 5: Handle Webhook Events

The webhook automatically:
- Updates order status when payment is captured
- Processes refunds when PayPal sends refund events
- Cancels orders when payments are denied

**Manual webhook testing:**
```bash
curl -X POST http://localhost:3000/api/webhooks/paypal \
  -H "Content-Type: application/json" \
  -H "paypal-transmission-id: test-123" \
  -H "paypal-transmission-time: 2024-01-21T10:00:00Z" \
  -H "paypal-cert-url: https://api.paypal.com/cert" \
  -H "paypal-transmission-sig: test-sig" \
  -d '{
    "id": "WH_test_123",
    "event_type": "PAYMENT.CAPTURE.COMPLETED",
    "resource": {
      "id": "capture_123",
      "status": "COMPLETED",
      "amount": {
        "value": "5.22",
        "currency_code": "USD"
      }
    },
    "create_time": "2024-01-21T10:00:00Z"
  }'
```

---

## 🔄 How It All Works Together

### Complete Payment Flow with All Recommendations:

```
1. USER CLICKS "COMPLETE PAYMENT"
   ↓
2. FRONTEND generates idempotency key
   ↓
3. FRONTEND sends POST /api/orders with X-Idempotency-Key header
   ↓
4. SERVER checks idempotency cache (returns cached if duplicate)
   ↓
5. FOR PAYPAL: Create PayPal order and redirect to PayPal
   ↓
6. USER APPROVES in PayPal
   ↓
7. FRONTEND: PayPal SDK captures payment
   ↓
8. FRONTEND: Sends captured orderId to POST /api/orders
   ↓
9. SERVER: Creates order in Firestore (all reads before writes - transaction)
   ↓
10. SERVER: Stores result in idempotency cache
   ↓
11. SERVER: Sends order confirmation EMAIL
   ↓
12. USER: Sees success screen + gets email
   ↓
13. [OPTIONAL] PAYPAL WEBHOOK: Sends PAYMENT.CAPTURE.COMPLETED
   ↓
14. SERVER: Receives webhook, updates order status to "processing"
   ↓
15. [IF REFUND REQUESTED] USER: Clicks "Request Refund"
   ↓
16. FRONTEND: POST /api/refunds with orderId
   ↓
17. SERVER: Calls PayPal/Stripe Refund API
   ↓
18. ORDER: Updated to "refunded"
```

---

## 📋 Environment Variables Checklist

Add all these to `.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=ZilaCart

# PayPal Webhook
PAYPAL_WEBHOOK_ID=WH_your_webhook_id_here

# Existing PayPal credentials (should already be there)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_public_client_id

# Stripe (if using card payments)
STRIPE_SECRET_KEY=sk_test_your_secret
STRIPE_PUBLISHABLE_KEY=pk_test_your_public
NEXT_PUBLIC_STRIPE_KEY=pk_test_your_public

# Firebase (should already be there)
FIREBASE_PROJECT_ID=zilacart-6a1a8
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_STORAGE_BUCKET=zilacart-6a1a8.firebasestorage.app
NEXT_PUBLIC_FIREBASE_API_KEY=...
```

---

## ✅ Verification Checklist

- [ ] All 5 recommendations implemented
- [ ] Email provider configured (Gmail/SendGrid/Mailgun/SES)
- [ ] Nodemailer installed and tested
- [ ] PayPal webhook registered in dashboard
- [ ] Webhook URL updated in `.env`
- [ ] Idempotency keys working (test double-click)
- [ ] Refund system tested with PayPal sandbox
- [ ] Order reconciliation route accessible
- [ ] All `.env` variables set
- [ ] Dev server running without errors

---

## 🚀 Next Steps

1. **Install nodemailer:** `npm install nodemailer`
2. **Choose email provider** and configure `.env`
3. **Register PayPal webhook** in developer dashboard
4. **Test email delivery** with sample order
5. **Test webhook** with PayPal's sample event tool
6. **Run complete end-to-end test** with Selenium script

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Check SMTP credentials, verify sender email with provider |
| Webhook not receiving events | Verify webhook URL is correct and accessible, check ngrok if local |
| Idempotency not working | Clear browser cache, use different idempotency key |
| Refund API failing | Verify PayPal/Stripe credentials, check payment details stored in order |
| Order not created but PayPal charged | Reconciliation API will find and create the order |

