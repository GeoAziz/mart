#!/bin/bash

set -e

echo "=========================================="
echo "🚀 COMPLETE E2E JOURNEY TEST RUNNER"
echo "=========================================="
echo ""

# Check if server is running
echo "Checking if server is running on http://localhost:3000..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "⚠️  Server not found. Starting dev server..."
    npm run dev &
    sleep 5
fi

# Check Python and pytest
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found"
    exit 1
fi

if ! python3 -m pytest --version &> /dev/null; then
    echo "Installing pytest..."
    pip install pytest selenium webdriver-manager requests firebase-admin
fi

# Create reports directory
mkdir -p tests/reports/screenshots

# Run the consolidated test
echo ""
echo "Running complete E2E test..."
echo "========================================"
python3 -m pytest tests/test_complete_user_journeys.py::TestCompleteUserJourneys::test_complete_journey_all_users -v -s --tb=short

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ✅ ✅ TEST PASSED ✅ ✅ ✅"
    echo "Reports saved to: tests/reports/"
else
    echo ""
    echo "❌ ❌ ❌ TEST FAILED ❌ ❌ ❌"
    echo "Check screenshots in: tests/reports/screenshots/"
    exit 1
fi
