#!/bin/bash
# Load Testing Script
# Usage: ./scripts/run-load-test.sh [vus] [duration] [endpoint]

set -e

# Default values
VUS=${1:-50}
DURATION=${2:-5m}
BASE_URL=${3:-http://localhost:3000}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="load-test-results"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}ZilaCart Load Test${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Configuration:"
echo -e "  Virtual Users (VUs): ${YELLOW}$VUS${NC}"
echo -e "  Duration: ${YELLOW}$DURATION${NC}"
echo -e "  Base URL: ${YELLOW}$BASE_URL${NC}"
echo -e "  Results Directory: ${YELLOW}$RESULTS_DIR${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR/$TIMESTAMP"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed${NC}"
    echo "Install it from: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if app is running
echo -e "${YELLOW}Checking app health...${NC}"
if ! curl -s -f "$BASE_URL/api/health" > /dev/null; then
    echo -e "${RED}❌ App is not running at $BASE_URL${NC}"
    echo "Start the app with: docker compose up"
    exit 1
fi
echo -e "${GREEN}✓ App is healthy${NC}"
echo ""

# Check if Prometheus is running
echo -e "${YELLOW}Checking Prometheus...${NC}"
if ! curl -s -f "http://localhost:9090/-/healthy" > /dev/null; then
    echo -e "${RED}❌ Prometheus is not running${NC}"
    echo "Prometheus should be running in docker-compose"
    exit 1
fi
echo -e "${GREEN}✓ Prometheus is healthy${NC}"
echo ""

# Run the load test
echo -e "${YELLOW}Starting load test...${NC}"
echo ""

k6 run \
  --vus "$VUS" \
  --duration "$DURATION" \
  --out "json=$RESULTS_DIR/$TIMESTAMP/results.json" \
  -e BASE_URL="$BASE_URL" \
  load-tests/k6-load-test.js

# Generate summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Load Test Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Results saved to: ${YELLOW}$RESULTS_DIR/$TIMESTAMP/${NC}"
echo ""

# Print Grafana dashboard link
echo -e "${YELLOW}View metrics in Grafana:${NC}"
echo -e "  http://localhost:3001/d/app-performance"
echo ""

# Print recommendations
echo -e "${YELLOW}Recommendations:${NC}"
echo "  1. Check Grafana dashboard for performance metrics"
echo "  2. Review Prometheus alerts"
echo "  3. Check logs for any errors: docker logs mart-app"
echo "  4. Analyze results: jq . $RESULTS_DIR/$TIMESTAMP/results.json"
echo ""

# Optional: Generate HTML report (if xk6-reporter is installed)
if command -v xk6-reporter &> /dev/null; then
    echo -e "${YELLOW}Generating HTML report...${NC}"
    xk6-reporter -i "$RESULTS_DIR/$TIMESTAMP/results.json" -o "$RESULTS_DIR/$TIMESTAMP/report.html"
    echo -e "${GREEN}✓ Report generated: $RESULTS_DIR/$TIMESTAMP/report.html${NC}"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
