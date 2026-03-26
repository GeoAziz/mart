#!/bin/bash
# 🔍 E2E TEST DIAGNOSTICS - PRE-FLIGHT CHECK

echo "=================================================="
echo "🔍 ZilaCart E2E Test Diagnostics"
echo "=================================================="
echo ""

# 1. Check Python
echo "1️⃣  Python Check"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo "   ✅ $PYTHON_VERSION"
else
    echo "   ❌ Python not found"
    exit 1
fi

# 2. Check Chrome
echo ""
echo "2️⃣  Chrome Check"
if command -v google-chrome &> /dev/null; then
    CHROME_VERSION=$(google-chrome --version)
    echo "   ✅ $CHROME_VERSION"
elif command -v chromium-browser &> /dev/null; then
    CHROME_VERSION=$(chromium-browser --version)
    echo "   ✅ $CHROME_VERSION"
elif command -v chrome &> /dev/null; then
    CHROME_VERSION=$(chrome --version)
    echo "   ✅ $CHROME_VERSION"
else
    echo "   ⚠️  Chrome not found (install or set PATH)"
fi

# 3. Check pip packages
echo ""
echo "3️⃣  Required Packages Check"
PACKAGES=("selenium" "pytest" "requests")
for pkg in "${PACKAGES[@]}"; do
    if python3 -c "import $pkg" 2>/dev/null; then
        VERSION=$(python3 -c "import $pkg; print($pkg.__version__ if hasattr($pkg, '__version__') else 'installed')")
        echo "   ✅ $pkg ($VERSION)"
    else
        echo "   ⚠️  $pkg not installed (run: pip install -r tests/requirements_e2e.txt)"
    fi
done

# 4. Check test file
echo ""
echo "4️⃣  Test File Check"
if [ -f "tests/test_complete_user_journeys.py" ]; then
    LINES=$(wc -l < tests/test_complete_user_journeys.py)
    echo "   ✅ tests/test_complete_user_journeys.py ($LINES lines)"
else
    echo "   ❌ tests/test_complete_user_journeys.py not found"
    exit 1
fi

# 5. Check directories
echo ""
echo "5️⃣  Directory Check"
mkdir -p tests/reports/screenshots tests/reports/logs
echo "   ✅ tests/reports/screenshots"
echo "   ✅ tests/reports/logs"

# 6. Check .env
echo ""
echo "6️⃣  Environment Check"
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    if grep -q "FIREBASE_PROJECT_ID\|PAYPAL_CLIENT_ID" .env; then
        echo "   ✅ Firebase/PayPal credentials configured"
    else
        echo "   ⚠️  Missing credentials in .env"
    fi
else
    echo "   ⚠️  .env not found"
fi

# 7. Check server
echo ""
echo "7️⃣  Server Check"
BASE_URL=${BASE_URL:-"http://localhost:3000"}
echo "   Testing: $BASE_URL"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" > /dev/null 2>&1; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
    if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 301 ]; then
        echo "   ✅ Server responding ($STATUS)"
    else
        echo "   ⚠️  Server returned $STATUS (may be starting)"
    fi
else
    echo "   ❌ Server not responding (start with: npm run dev)"
fi

echo ""
echo "=================================================="
echo "✅ Diagnostics Complete"
echo ""
echo "Ready to run? Execute:"
echo "   bash tests/run_e2e.sh"
echo "=================================================="
