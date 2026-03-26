#!/bin/bash
# 🚀 E2E TEST RUNNER - COMPLETE JOURNEY
# ====================================
# Runs the consolidated end-to-end test

set -e

echo "=================================================="
echo "🚀 ZilaCart E2E Test Runner"
echo "=================================================="
echo ""

# Check if environment is set
if [ -z "$BASE_URL" ]; then
    BASE_URL="http://localhost:3000"
    echo "⚠️  BASE_URL not set, using default: $BASE_URL"
fi

echo "Configuration:"
echo "  Base URL: $BASE_URL"
echo "  Test File: tests/test_complete_user_journeys.py"
echo ""

# Create report directories
mkdir -p tests/reports/screenshots
mkdir -p tests/reports/logs

echo "1️⃣  Installing dependencies..."
pip install -q -r tests/requirements_e2e.txt

echo "2️⃣  Running E2E tests..."
BASE_URL=$BASE_URL python -m pytest tests/test_complete_user_journeys.py -m e2e -v --tb=short -s

echo ""
echo "3️⃣  Opening report..."
if [ -f "tests/reports/logs/report.html" ]; then
    echo "✅ Report generated: tests/reports/logs/report.html"
    # Try to open in browser (works on macOS/Linux with xdg-open or open)
    if command -v xdg-open &> /dev/null; then
        xdg-open tests/reports/logs/report.html
    elif command -v open &> /dev/null; then
        open tests/reports/logs/report.html
    fi
else
    echo "⚠️  Report not found"
fi

echo ""
echo "=================================================="
echo "✅ E2E Test Run Complete"
echo "=================================================="
