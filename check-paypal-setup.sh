#!/bin/bash
# Quick PayPal Setup Check

echo "🔍 PayPal Setup Verification"
echo "=============================="
echo ""

# Check environment variables
echo "1️⃣  Checking environment variables..."
if grep -q "PAYPAL_CLIENT_ID" .env; then
  echo "   ✅ PAYPAL_CLIENT_ID found"
else
  echo "   ❌ PAYPAL_CLIENT_ID missing"
fi

if grep -q "PAYPAL_CLIENT_SECRET" .env; then
  echo "   ✅ PAYPAL_CLIENT_SECRET found"
else
  echo "   ❌ PAYPAL_CLIENT_SECRET missing"
fi

if grep -q "NEXT_PUBLIC_PAYPAL_CLIENT_ID" .env; then
  echo "   ✅ NEXT_PUBLIC_PAYPAL_CLIENT_ID found"
else
  echo "   ❌ NEXT_PUBLIC_PAYPAL_CLIENT_ID missing"
fi

if grep -q "PAYPAL_MODE=sandbox" .env; then
  echo "   ✅ PAYPAL_MODE=sandbox"
else
  echo "   ⚠️  PAYPAL_MODE not set to sandbox"
fi

echo ""
echo "2️⃣  Checking PayPal files..."

if [ -f "src/components/checkout/PayPalCheckout.tsx" ]; then
  echo "   ✅ PayPalCheckout.tsx exists"
else
  echo "   ❌ PayPalCheckout.tsx missing"
fi

if [ -f "src/app/api/payment/paypal/order/route.ts" ]; then
  echo "   ✅ Order route exists"
else
  echo "   ❌ Order route missing"
fi

if [ -f "src/app/api/payment/paypal/capture/route.ts" ]; then
  echo "   ✅ Capture route exists"
else
  echo "   ❌ Capture route missing"
fi

echo ""
echo "3️⃣  Quick Test"
echo ""
echo "To test PayPal:"
echo "  1. Start dev server: npm run dev"
echo "  2. Go to: http://localhost:3000/products"
echo "  3. Add item to cart"
echo "  4. Go to: http://localhost:3000/checkout"
echo "  5. Fill address and select PayPal"
echo "  6. Click PayPal button (should stay open!)"
echo "  7. Login with sandbox PayPal account"
echo ""
