# Testing Guide for Checkout Improvements

This document provides comprehensive testing instructions for all the checkout improvements implemented in this PR.

## Prerequisites

Before testing, ensure all environment variables are properly configured (see `ENVIRONMENT_VARIABLES.md`):

```env
# Required for testing
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
EXCHANGE_RATE_API_KEY=... (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=... (app-specific password)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Test Scenarios

### 🚨 P0 - CRITICAL FIXES

#### 1. Stripe Payment Intent API Endpoint

**Test Case:** Verify Stripe payments work end-to-end

**Steps:**
1. Add products to cart
2. Navigate to checkout
3. Fill in shipping address with valid Kenyan phone number (e.g., `+254712345678` or `0712345678`)
4. Select "Credit/Debit Card" payment method
5. Proceed to order summary
6. Enter Stripe test card: `4242 4242 4242 4242`, any future date, any 3-digit CVC
7. Click "Pay with Card"

**Expected Results:**
- ✅ Payment intent is created successfully (no 404 errors)
- ✅ Loading overlay appears with "Processing Payment..." message
- ✅ Payment completes successfully
- ✅ Order is created
- ✅ Success screen shows with order ID
- ✅ Email confirmation is sent

**Test Failed Payment:**
1. Use declined card: `4000 0000 0000 0002`
2. Verify toast notification appears with error message (not a blocking alert)
3. Verify cart is NOT cleared (items remain)

---

#### 2. Stock Management Race Condition

**Test Case:** Prevent overselling when stock is insufficient

**Setup:**
1. Create a test product with stock = 5
2. Add 10 units to cart

**Steps:**
1. Proceed to checkout
2. Complete payment

**Expected Results:**
- ✅ Order creation fails with clear error message
- ✅ Error shows: "Insufficient stock for [product name]. Available: 5, Requested: 10"
- ✅ Stock is NOT decremented
- ✅ Toast notification shows error (not blocking alert)
- ✅ Cart is NOT cleared (items remain for user to adjust)

**Test Successful Order:**
1. Adjust cart to 3 units
2. Complete payment
3. Verify stock is decremented to 2
4. Verify `lastStockUpdate` timestamp is set

---

#### 3. Cart Clearing Race Condition

**Test Case:** Cart only clears on successful order creation

**Scenario 1: Payment Fails**
1. Use Stripe test card that requires authentication: `4000 0027 6000 3184`
2. Cancel the authentication
3. Verify cart items remain (not cleared)

**Scenario 2: Network Error**
1. Simulate network failure during order creation
2. Verify cart items remain

**Scenario 3: Successful Order**
1. Complete successful payment
2. Verify cart is cleared only after order confirmation
3. Verify success screen appears
4. Verify email is sent

**Expected Results:**
- ✅ Cart clears ONLY when `createdOrder.id` exists
- ✅ If order creation fails, cart remains intact
- ✅ Users can retry failed orders without re-adding items

---

### 🔶 P1 - HIGH PRIORITY IMPROVEMENTS

#### 4. Real-Time Currency Conversion for PayPal

**Test Case:** Verify dynamic currency conversion

**Setup:**
Ensure `EXCHANGE_RATE_API_KEY` is set (or leave blank to test fallback)

**Steps:**
1. Add products totaling KES 10,000 to cart
2. Select PayPal payment method
3. Proceed to checkout

**Expected Results (with API key):**
- ✅ Conversion notice shows current exchange rate
- ✅ USD amount is calculated using live rate
- ✅ Notice format: "Converted at current rate: 0.0077 (1 KES = 0.0077 USD)"
- ✅ PayPal shows correct USD amount

**Expected Results (without API key or API failure):**
- ✅ Conversion uses fallback rate (0.0077)
- ✅ Notice shows: "Converted using fallback rate (API unavailable)..."
- ✅ Console shows warning but payment continues
- ✅ PayPal shows USD amount using fallback rate

**Manual Verification:**
1. Check console logs for conversion details
2. Verify PayPal checkout shows correct USD total
3. Complete payment and verify order total is correct

---

#### 5. Order Confirmation Email System

**Test Case:** Email sent after successful order

**Steps:**
1. Complete a successful order (any payment method)
2. Check email inbox for user's email address

**Expected Results:**
- ✅ Email received within 1-2 minutes
- ✅ Subject line: "Order Confirmation #[ORDER_ID] - ZilaCart"
- ✅ Email contains:
  - Order number
  - Customer name
  - All ordered items with quantities and prices
  - Subtotal, discount (if applied), shipping, tax, total
  - Shipping address
  - Payment method
  - "View Order Details" button linking to order page
- ✅ Email is professionally formatted with brand colors
- ✅ If email fails, error is logged but order still completes

**Test Email Failure:**
1. Set invalid SMTP credentials
2. Complete order
3. Verify order completes successfully even if email fails
4. Check server logs for email error

---

#### 6. Toast Notifications (vs Alert)

**Test Case:** All errors show as toasts, not alerts

**Scenarios to Test:**
1. **Payment Failed:** Use declined card `4000 0000 0000 0002`
   - ✅ Toast appears at top-right with red background
   - ✅ Shows "Payment Failed" title
   - ✅ Shows descriptive error message
   - ✅ Auto-dismisses after a few seconds
   - ✅ No blocking alert() dialog

2. **Order Creation Failed:** Trigger validation error (e.g., insufficient stock)
   - ✅ Toast appears with "Order Failed" title
   - ✅ Shows specific error message
   - ✅ No blocking alert() dialog

3. **Network Error:** Simulate network failure
   - ✅ Toast shows "Order Failed" with generic error message
   - ✅ No blocking alert() dialog

---

### 🔵 P2 - POLISH & UX IMPROVEMENTS

#### 7. Loading Overlay During Payment Processing

**Test Case:** Visual feedback during payment

**Steps:**
1. Proceed to checkout with Stripe payment
2. Click "Pay with Card"

**Expected Results:**
- ✅ Full-screen overlay appears immediately
- ✅ Overlay has dark semi-transparent background with blur effect
- ✅ Centered card shows spinning loader icon
- ✅ Message shows "Processing Payment..." for card payments
- ✅ Message shows "Creating Your Order..." for COD/M-Pesa
- ✅ Warning text: "Please do not close this window or press the back button"
- ✅ Overlay prevents any interaction with page
- ✅ Overlay disappears on success or error

**Test Different Payment Methods:**
1. **Card:** Should show "Processing Payment..."
2. **COD:** Should show "Creating Your Order..."
3. **M-Pesa:** Should show "Creating Your Order..."
4. **PayPal:** Should show "Creating Your Order..."

---

#### 8. Kenya Phone Number Validation

**Test Case:** Phone validation and normalization

**Valid Phone Numbers (should be accepted):**
- `+254712345678` (international format)
- `0712345678` (local format)
- `712345678` (without leading 0)
- `254712345678` (without +)
- `+254 7 1234 5678` (with spaces - will be cleaned)

**Invalid Phone Numbers (should be rejected):**
- `12345` (too short)
- `+254812345678` (wrong operator prefix - must be 7 or 1)
- `+255712345678` (wrong country code)
- `0612345678` (invalid operator - must start with 7 or 1)

**Steps:**
1. Enter each test phone number in checkout form
2. Tab out of the field (trigger validation)

**Expected Results:**
- ✅ Valid numbers are accepted
- ✅ Invalid numbers show error: "Invalid Kenyan phone number. Use format: +254712345678, 0712345678, or 712345678"
- ✅ All accepted numbers are normalized to `+254` format in submission
- ✅ Spaces are automatically removed

**Verification:**
1. Submit order with different phone formats
2. Check order details in database
3. Verify all phone numbers stored as `+254...` format

---

#### 9. Step Progress Indicators with Checkmarks

**Test Case:** Visual feedback for completed steps

**Steps:**
1. Start checkout process
2. Complete address step (click Next)
3. Complete payment method selection (click Next)
4. Observe step indicators at top

**Expected Results:**
- ✅ **Step 1 (Address):** Shows checkmark icon when completed
- ✅ **Step 2 (Payment):** Shows checkmark icon when completed
- ✅ **Step 3 (Summary):** Shows shopping bag icon (current step)
- ✅ Completed steps have green checkmark
- ✅ Current step shows original icon
- ✅ Future steps show original icon in muted color
- ✅ Step labels remain visible on desktop
- ✅ On mobile, only icons are visible (responsive)

---

## Integration Testing

### Complete Checkout Flow

**Test the entire flow from start to finish:**

1. **Setup:**
   - Clear browser cache and cookies
   - Start with empty cart

2. **Shopping:**
   - Add 3 different products to cart
   - Verify cart badge updates
   - Apply a promotion code (if available)

3. **Checkout - Address:**
   - Enter shipping details
   - Test phone validation with different formats
   - Check "Save address for future orders"
   - Verify form validation (try submitting with empty fields)
   - Click Next

4. **Checkout - Payment:**
   - Review all 4 payment options (M-Pesa, Card, PayPal, COD)
   - Select Stripe Card payment
   - Click Next

5. **Checkout - Summary:**
   - Verify all items displayed correctly
   - Verify calculations:
     - Subtotal = sum of (quantity × price)
     - Discount applied correctly
     - Shipping = KES 500 (or 0 if subtotal > 5000)
     - Tax = 16% of subtotal after discount
     - Total = subtotal - discount + shipping + tax
   - Enter Stripe test card details
   - Click "Pay with Card"

6. **Payment Processing:**
   - Verify loading overlay appears
   - Wait for payment to complete
   - Verify success screen shows

7. **Verification:**
   - Check email inbox for confirmation
   - Navigate to /account/orders
   - Verify order appears in list
   - Click on order to view details
   - Verify all information is correct
   - Check database:
     - Product stock decremented
     - Order status is "pending"
     - Phone number in +254 format
     - Email sent (check logs)

---

## Performance Testing

### Load Testing Payment Flow

**Test concurrent order creation:**

1. Simulate 10 users attempting to buy the last 5 items in stock
2. Verify only 5 orders succeed
3. Verify remaining 5 get "Insufficient stock" error
4. Verify stock doesn't go negative

### Email Queue Testing

**Test email reliability:**

1. Create 10 orders in quick succession
2. Verify all 10 confirmation emails are sent
3. Check email service logs for failures
4. Verify orders complete even if email fails

---

## Error Scenarios

### Network Failures

1. **Test offline order:**
   - Disconnect network before submitting order
   - Verify appropriate error toast
   - Reconnect and retry
   - Verify success

2. **Test slow network:**
   - Throttle network to 3G
   - Verify loading overlay stays visible
   - Verify order completes eventually

### Invalid Data

1. **Invalid payment:**
   - Use card `4000 0000 0000 0069` (expired card)
   - Verify error handling

2. **Invalid promotion code:**
   - Apply non-existent code
   - Verify error message

3. **Expired promotion:**
   - Apply expired promotion code
   - Verify no discount applied

---

## Browser Compatibility

Test checkout flow in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Chrome (Android)
- ✅ Mobile Safari (iOS)

---

## Accessibility Testing

1. **Keyboard Navigation:**
   - Tab through entire checkout form
   - Verify all fields are accessible
   - Verify toast notifications are announced

2. **Screen Reader:**
   - Test with screen reader enabled
   - Verify form labels are read correctly
   - Verify error messages are announced

3. **Color Contrast:**
   - Verify error messages are readable
   - Verify loading overlay text is clear

---

## Regression Testing

Ensure existing functionality still works:

- ✅ Cart add/remove/update
- ✅ Promotion code application
- ✅ User authentication
- ✅ Admin order management
- ✅ Vendor dashboard
- ✅ Product browsing
- ✅ Search functionality

---

## Security Testing

1. **Test without authentication:**
   - Attempt to access `/api/payment/stripe/intent` without token
   - Verify 401 Unauthorized response

2. **Test with invalid token:**
   - Use expired or malformed token
   - Verify proper error handling

3. **Test SQL injection in phone field:**
   - Enter `'; DROP TABLE orders; --`
   - Verify it's properly escaped/validated

4. **Test XSS in address fields:**
   - Enter `<script>alert('xss')</script>`
   - Verify it's properly escaped in email

---

## Sign-Off Checklist

Before merging, ensure:

- [ ] All P0 critical fixes tested and working
- [ ] All P1 improvements tested and working
- [ ] All P2 polish features tested and working
- [ ] Email configuration tested with real SMTP
- [ ] Currency conversion tested (both with API and fallback)
- [ ] All payment methods tested (Stripe, PayPal, COD, M-Pesa)
- [ ] Phone validation tested with various formats
- [ ] Loading states work correctly
- [ ] Error handling is user-friendly
- [ ] No console errors in browser
- [ ] No TypeScript errors (existing errors excluded)
- [ ] CodeQL security scan passed
- [ ] Documentation is complete
- [ ] Environment variables documented
- [ ] No new security vulnerabilities introduced

---

**Testing completed by:** _______________
**Date:** _______________
**Environment:** Development / Staging / Production
**Build Version:** _______________

