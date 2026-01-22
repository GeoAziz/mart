#!/bin/bash

# 🚀 COMPLETE E2E TEST RUNNER
# ============================
# Consolidated test for all user types: Customer → Vendor → Admin

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

echo -e "${BLUE}🚀 COMPLETE E2E TEST RUNNER${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if server is running
echo -e "${YELLOW}Checking server availability...${NC}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

if ! curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server not running at $BASE_URL${NC}"
    echo -e "${YELLOW}Start the dev server first:${NC}"
    echo -e "  npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}\n"

# Check Python dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
pip_packages=(
    "selenium>=4.0"
    "pytest>=7.0"
    "requests"
    "firebase-admin"
    "webdriver-manager"
)

for package in "${pip_packages[@]}"; do
    pip install -q "$package"
done

echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# ============================================================================
# RUN TEST
# ============================================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running: Complete User Journeys E2E Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Create reports directory
mkdir -p tests/reports/screenshots

# Run the test
python -m pytest tests/test_complete_user_journeys.py::TestCompleteUserJourneys::test_complete_journey_all_users -v -s --tb=short

TEST_RESULT=$?

# ============================================================================
# RESULTS
# ============================================================================

echo -e "\n${BLUE}========================================${NC}"

if [ $TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ ✅ ✅ E2E TEST PASSED ✅ ✅ ✅${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All user journeys verified successfully!${NC}\n"
    
    # Show report location
    LATEST_REPORT=$(ls -t tests/reports/e2e_report_*.json 2>/dev/null | head -1)
    if [ -n "$LATEST_REPORT" ]; then
        echo -e "${GREEN}📊 Report: $LATEST_REPORT${NC}"
    fi
    
    echo -e "${GREEN}📸 Screenshots: tests/reports/screenshots/${NC}\n"
else
    echo -e "${RED}❌ E2E TEST FAILED${NC}"
    echo -e "${RED}========================================${NC}\n"
    echo -e "${YELLOW}Check logs for details:${NC}"
    echo -e "  - tests/reports/screenshots/ (failure screenshots)"
    echo -e "  - pytest output above"
    exit 1
fi
