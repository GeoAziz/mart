#!/usr/bin/env bash
# SDET Test Runner Script

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DIR="$PROJECT_ROOT/tests"
HEADLESS="${HEADLESS:-false}"
MARKER="${1:-}"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         SDET Test Runner${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}❌ pytest is not installed${NC}"
    echo -e "${YELLOW}Install with: pip install -r tests/requirements.txt${NC}"
    exit 1
fi

# Parse arguments
if [[ -z "$MARKER" ]]; then
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ./run_tests.sh all              # Run all tests"
    echo -e "  ./run_tests.sh smoke            # Run smoke tests"
    echo -e "  ./run_tests.sh e2e              # Run E2E tests"
    echo -e "  ./run_tests.sh checkout         # Run checkout tests"
    echo -e "  ./run_tests.sh product          # Run product tests"
    echo -e "  ./run_tests.sh paypal           # Run PayPal tests"
    echo ""
    echo -e "${YELLOW}Environment variables:${NC}"
    echo -e "  HEADLESS=true  # Run in headless mode"
    echo ""
    exit 0
fi

# Prepare environment
echo -e "${BLUE}📋 Loading configuration...${NC}"
export HEADLESS

case "$MARKER" in
    all)
        echo -e "${GREEN}🚀 Running all tests...${NC}"
        pytest "$TEST_DIR" -v --tb=short
        ;;
    smoke)
        echo -e "${GREEN}💨 Running smoke tests...${NC}"
        pytest "$TEST_DIR" -v -m smoke --tb=short
        ;;
    e2e)
        echo -e "${GREEN}🌐 Running E2E tests...${NC}"
        pytest "$TEST_DIR" -v -m e2e --tb=short
        ;;
    checkout)
        echo -e "${GREEN}🛒 Running checkout tests...${NC}"
        pytest "$TEST_DIR/suites/test_checkout.py" -v --tb=short
        ;;
    product)
        echo -e "${GREEN}📦 Running product detail tests...${NC}"
        pytest "$TEST_DIR/suites/test_product_details.py" -v --tb=short
        ;;
    paypal)
        echo -e "${GREEN}💳 Running PayPal tests...${NC}"
        pytest "$TEST_DIR/suites/test_paypal.py" -v --tb=short
        ;;
    parallel)
        echo -e "${GREEN}⚡ Running tests in parallel (4 workers)...${NC}"
        pytest "$TEST_DIR" -v -n 4 --tb=short
        ;;
    coverage)
        echo -e "${GREEN}📊 Running with coverage...${NC}"
        pytest "$TEST_DIR" -v --cov=tests --cov-report=html --tb=short
        echo -e "${GREEN}✅ Coverage report: htmlcov/index.html${NC}"
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $MARKER${NC}"
        echo -e "${YELLOW}Valid options: all, smoke, e2e, checkout, product, paypal, parallel, coverage${NC}"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Tests completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Tests failed!${NC}"
    exit 1
fi
