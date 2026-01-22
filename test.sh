#!/usr/bin/env bash
# Quick test runner

cd "$(dirname "$0")"

echo "🚀 SDET Test Execution"
echo "═════════════════════"
echo ""

# Install minimal deps
echo "📦 Setting up..."
python3 -m pip install -q pytest selenium webdriver-manager python-dotenv 2>/dev/null

# Run tests
echo "🧪 Running tests..."
echo ""

case "${1:-all}" in
    all)
        python3 -m pytest tests/test_master.py -v --tb=short -s
        ;;
    smoke)
        python3 -m pytest tests/test_master.py -m smoke -v --tb=short -s
        ;;
    e2e)
        python3 -m pytest tests/test_master.py -m e2e -v --tb=short -s
        ;;
    checkout)
        python3 -m pytest tests/test_master.py::TestCheckout -v --tb=short -s
        ;;
    pdp)
        python3 -m pytest tests/test_master.py::TestProductDetailsPage -v --tb=short -s
        ;;
    integration)
        python3 -m pytest tests/test_master.py::TestIntegration -v --tb=short -s
        ;;
    *)
        echo "Usage: ./test.sh [all|smoke|e2e|checkout|pdp|integration]"
        exit 1
        ;;
esac
