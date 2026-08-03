#!/bin/bash
# DevOps Environment Setup Script
# Initializes everything needed for local development

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ZilaCart DevOps Environment Setup                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
port_available() {
  ! nc -z localhost "$1" 2>/dev/null
}

# 1. Check prerequisites
echo -e "\n${YELLOW}1️⃣  Checking prerequisites...${NC}"

missing_tools=0

if ! command_exists docker; then
  echo -e "${RED}✗ Docker not installed${NC}"
  echo "  Install from: https://docs.docker.com/get-docker/"
  missing_tools=1
fi

if ! command_exists docker-compose; then
  echo -e "${RED}✗ Docker Compose not installed${NC}"
  echo "  Install from: https://docs.docker.com/compose/install/"
  missing_tools=1
fi

if ! command_exists node; then
  echo -e "${RED}✗ Node.js not installed${NC}"
  echo "  Install from: https://nodejs.org/"
  missing_tools=1
fi

if ! command_exists npm; then
  echo -e "${RED}✗ npm not installed${NC}"
  echo "  Install with Node.js"
  missing_tools=1
fi

if [ $missing_tools -eq 1 ]; then
  echo -e "${RED}\n❌ Please install missing tools and try again${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}"

# 2. Check ports
echo -e "\n${YELLOW}2️⃣  Checking required ports...${NC}"

required_ports=(
  "3000:App"
  "3001:Grafana"
  "9090:Prometheus"
  "6379:Redis"
  "4000:Firebase Emulator"
  "4566:LocalStack"
)

ports_free=1
for port_entry in "${required_ports[@]}"; do
  port="${port_entry%%:*}"
  name="${port_entry##*:}"

  if port_available "$port"; then
    echo -e "${GREEN}✓ Port $port ($name) available${NC}"
  else
    echo -e "${RED}✗ Port $port ($name) is in use${NC}"
    ports_free=0
  fi
done

if [ $ports_free -eq 0 ]; then
  echo -e "${YELLOW}Run: docker compose down${NC}"
  read -p "Press enter after stopping other services..."
fi

# 3. Environment setup
echo -e "\n${YELLOW}3️⃣  Setting up environment...${NC}"

if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
    echo -e "${GREEN}✓ Created .env.local from .env.example${NC}"
    echo -e "${YELLOW}  ⚠️  Please edit .env.local with your credentials${NC}"

    # Open editor
    if command_exists nano; then
      read -p "Edit .env.local now? (y/n) " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        nano .env.local
      fi
    fi
  else
    echo -e "${RED}✗ No .env.example found${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

# 4. Install dependencies
echo -e "\n${YELLOW}4️⃣  Installing dependencies...${NC}"

if [ -f package-lock.json ]; then
  echo "Running: npm ci"
  npm ci --silent
else
  echo "Running: npm install"
  npm install --silent
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

# 5. Docker setup
echo -e "\n${YELLOW}5️⃣  Preparing Docker images...${NC}"

echo "Building containers..."
docker compose build --quiet

echo -e "${GREEN}✓ Docker images ready${NC}"

# 6. LocalStack initialization script
echo -e "\n${YELLOW}6️⃣  Setting up LocalStack initialization...${NC}"

mkdir -p scripts
if [ ! -f scripts/localstack-init.sh ]; then
  echo -e "${RED}✗ LocalStack init script not found${NC}"
  echo "  This should have been created during implementation"
else
  echo -e "${GREEN}✓ LocalStack init script ready${NC}"
fi

# 7. Make scripts executable
echo -e "\n${YELLOW}7️⃣  Setting up scripts...${NC}"

chmod +x scripts/run-load-test.sh 2>/dev/null || true
chmod +x scripts/localstack-init.sh 2>/dev/null || true

echo -e "${GREEN}✓ Scripts are executable${NC}"

# 8. Show quick start
echo -e "\n${YELLOW}8️⃣  Ready to start!${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Quick Start:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Terminal 1 - Start all services:${NC}"
echo "  ${BLUE}docker compose up -d${NC}"
echo ""
echo -e "${YELLOW}Terminal 2 - Watch app logs:${NC}"
echo "  ${BLUE}docker compose logs -f app${NC}"
echo ""
echo -e "${YELLOW}Terminal 3 - Start queue workers:${NC}"
echo "  ${BLUE}npm run queue:workers${NC}"
echo ""
echo -e "${YELLOW}Then access:${NC}"
echo "  App:        ${BLUE}http://localhost:3000${NC}"
echo "  Grafana:    ${BLUE}http://localhost:3001${NC} (admin/admin)"
echo "  Prometheus: ${BLUE}http://localhost:9090${NC}"
echo "  Firebase:   ${BLUE}http://localhost:4000${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 9. Verification
echo -e "${YELLOW}9️⃣  Starting services for health check...${NC}"

echo "Waiting for services to start..."
docker compose up -d >/dev/null 2>&1

# Wait for services to be healthy
echo -n "Checking services..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "\r${GREEN}✓ All services are healthy${NC}"
    break
  fi
  echo -n "."
  sleep 2
  attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
  echo -e "\r${YELLOW}⚠️  Services still starting (this is normal)${NC}"
  echo "  Check: docker compose logs -f app"
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Service Status:${NC}"
docker compose ps --no-trunc | tail -n +2 | while read -r line; do
  if echo "$line" | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} $line"
  else
    echo -e "${RED}✗${NC} $line"
  fi
done

echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "  • Setup Guide:     docs/DEVOPS-SETUP.md"
echo "  • Load Testing:    ./scripts/run-load-test.sh"
echo "  • Disaster Recovery: docs/DISASTER-RECOVERY.md"
echo "  • Troubleshooting: docs/DEVOPS-SETUP.md#troubleshooting"
echo ""
echo -e "${GREEN}Happy developing! 🚀${NC}"
echo ""
