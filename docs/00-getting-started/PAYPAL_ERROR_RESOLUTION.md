# PayPal Integration - Error Resolution Guide

## Issue
User clicks "Complete Purchase" on PayPal sandbox page and gets error:
```
https://www.sandbox.paypal.com/checkoutweb/genericError?code=REVGQVVMVA%3D%3D&token=...
```

## Root Causes & Fixes Applied

### 1. ❌ **Missing Return/Cancel URLs** → ✅ **FIXED**
**Problem:** PayPal didn't know where to redirect after payment approval
- PayPal was showing a generic error because it couldn't return to the checkout page

**Fix:** Added proper return URLs to order creation
```typescript
application_context: {
  shipping_preference: 'NO_SHIPPING',
  user_action: 'PAY_NOW',
  return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout`,
}
```

**Status:** ✅ Applied in `/src/app/api/payment/paypal/order/route.ts`

---

### 2. ❌ **Error Throwing in onApprove** → ✅ **FIXED**
**Problem:** When capture endpoint failed, we threw an error in the PayPal SDK callback, which caused PayPal to redirect to error page

**Fix:** Changed to gracefully handle errors without throwing
```typescript
onApprove={async (data: any, actions: any) => {
  try {
    await handlePayPalApprove(data.orderID);
  } catch (err: any) {
    setError(err.message);
    return Promise.resolve();  // Don't throw - prevents PayPal redirect
  }
}}
```

**Status:** ✅ Applied in `/src/components/checkout/PayPalCheckout.tsx`

---

### 3. ❌ **Incorrect SDK Configuration** → ✅ **FIXED**
**Problem:** PayPal SDK wasn't properly configured for the buttons component

**Fix:** Updated SDK options
```typescript
<PayPalScriptProvider options={{
  clientId,
  currency: 'USD',
  intent: 'capture',
  vault: false,
  components: 'buttons',           // ← Specify which component
  'data-client-token': 'true',     // ← Use kebab-case
}}>
```

**Status:** ✅ Applied in `/src/components/checkout/PayPalCheckout.tsx`

---

### 4. ❌ **Poor Error Logging** → ✅ **FIXED**
**Problem:** Difficult to debug what was going wrong when capture failed

**Fix:** Added detailed logging throughout the flow
- Logs full capture response
- Logs error messages clearly
- Logs order IDs at each step

**Status:** ✅ Applied in both checkout components

---

## How to Test

### Option 1: Quick API Test
```bash
python /mnt/devmandrive/projects/mart/test_paypal_api.py
```

### Option 2: Full Integration Test
```bash
python /mnt/devmandrive/projects/mart/test_paypal_integration.py
```

### Option 3: Manual Testing
1. **Restart the Next.js dev server** (changes to `.env` require restart):
   ```bash
   # Kill the existing server
   pkill -f "next dev"
   
   # Start new server
   cd /mnt/devmandrive/projects/mart
   npm run dev
   ```

2. **Go through checkout flow:**
   - Navigate to http://localhost:3000/products
   - Add item to cart
   - Go to checkout
   - Fill address form
   - Select PayPal
   - Click PayPal button
   - Login with: `sb-t5anz42281618@personal.example.com` / `87C;nFe_`
   - Click "Complete Purchase" on PayPal sandbox
   - **Should return to checkout successfully**

---

## Debugging Checklist

If you still see the error, check:

### 1. **Browser Console** (F12 → Console tab)
- Look for PayPal SDK loading errors
- Look for network errors in Network tab
- Check for CORS issues (red requests)

### 2. **PayPal Button Events**
The console should show:
```
🔵 Creating PayPal order for amount: [amount]
✅ PayPal Order Created: [order-id]
✅ PayPal Payment Approved: [order-id]
📡 Calling handlePayPalApprove with order ID: [order-id]
🔐 Capturing PayPal payment for order: [order-id]
```

### 3. **Order Creation Endpoint**
Check that it's returning a valid order ID:
```bash
curl -X POST http://localhost:3000/api/payment/paypal/order \
  -H "Content-Type: application/json" \
  -d '{"amount": 2000, "currency": "KES"}'
```

Expected response:
```json
{
  "id": "71V83481NB0842306",
  "currency": "USD",
  "amount": "15.50"
}
```

### 4. **Environment Variables**
Verify these are set in `.env`:
```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AXm3NURnGpOoK22...
PAYPAL_CLIENT_SECRET=EMcBkAJ8qn3KSR7vw...
PAYPAL_MODE=sandbox
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Common Issues

### Issue: "Failed to load PayPal SDK"
**Solution:** Check NEXT_PUBLIC_PAYPAL_CLIENT_ID is correct in `.env`

### Issue: PayPal redirect to error page on "Complete Purchase"
**Solution:** This should now be fixed! Check that:
- Return URLs are in the order payload ✅
- Error handling in onApprove doesn't throw ✅
- Capture endpoint is reachable ✅

### Issue: "Order not approved" error
**Solution:** Make sure you're actually approving in PayPal sandbox before clicking "Complete Purchase"

### Issue: Capture endpoint returns 422
**Solution:** This is expected if order isn't approved yet. After user approves in PayPal, it should work.

---

## Files Modified

1. **`/src/components/checkout/PayPalCheckout.tsx`**
   - Fixed onApprove error handling
   - Updated SDK configuration
   - Better logging

2. **`/src/app/api/payment/paypal/order/route.ts`**
   - Added return_url and cancel_url
   - Better error logging

3. **`/src/components/checkout/CheckoutWizard.tsx`**
   - Added detailed capture logging
   - Better error messages

4. **`/.env`**
   - Added NEXT_PUBLIC_BASE_URL

---

## Next Steps

1. **Restart the dev server** (critical - env changes require restart)
2. **Test with PayPal sandbox account**
3. **Check browser console for any remaining errors**
4. **Report back with console error messages if issues persist**

---

## PayPal Sandbox Credentials
- Email: `sb-t5anz42281618@personal.example.com`
- Password: `87C;nFe_`

**Note:** These are sandbox credentials for testing only.
