#!/bin/bash
# Quick Selenium Setup Script

echo "🚀 PayPal Selenium Testing Setup"
echo "=================================="
echo ""

# Check Python
echo "1️⃣  Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "   ✅ $PYTHON_VERSION"
else
    echo "   ❌ Python not found. Install Python 3.8+"
    exit 1
fi

# Check pip
echo ""
echo "2️⃣  Checking pip..."
if command -v pip3 &> /dev/null; then
    echo "   ✅ pip installed"
else
    echo "   ❌ pip not found"
    exit 1
fi

# Install Selenium
echo ""
echo "3️⃣  Installing Selenium..."
pip3 install selenium python-dotenv

# Check ChromeDriver
echo ""
echo "4️⃣  Checking ChromeDriver..."
if command -v chromedriver &> /dev/null; then
    CHROMEDRIVER_VERSION=$(chromedriver --version)
    echo "   ✅ $CHROMEDRIVER_VERSION"
else
    echo "   ⚠️  ChromeDriver not found"
    echo "   Install with:"
    echo "      macOS: brew install chromedriver"
    echo "      Ubuntu: sudo apt-get install chromium-chromedriver"
    echo "      Windows: choco install chromedriver"
fi

# Check Chrome
echo ""
echo "5️⃣  Checking Chrome..."
if command -v google-chrome &> /dev/null; then
    CHROME_VERSION=$(google-chrome --version)
    echo "   ✅ $CHROME_VERSION"
elif command -v chrome &> /dev/null; then
    CHROME_VERSION=$(chrome --version)
    echo "   ✅ $CHROME_VERSION"
elif command -v chromium &> /dev/null; then
    CHROME_VERSION=$(chromium --version)
    echo "   ✅ $CHROME_VERSION"
else
    echo "   ❌ Chrome not found. Install Chrome or Chromium"
    exit 1
fi

# Check .env file
echo ""
echo "6️⃣  Checking .env file..."
if [ -f ".env" ]; then
    if grep -q "PAYPAL_CLIENT_ID" .env; then
        echo "   ✅ .env exists with PayPal config"
    else
        echo "   ⚠️  .env exists but missing PayPal config"
    fi
else
    echo "   ⚠️  .env not found. Test will work but manual PayPal login needed"
fi

# Summary
echo ""
echo "=================================="
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Start dev server: npm run dev"
echo "  2. Run test: python3 test_paypal_selenium.py"
echo "  3. Watch browser execute test automatically"
echo ""
echo "Get more help: cat SELENIUM_TESTING_GUIDE.md"
echo "=================================="
