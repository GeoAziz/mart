#!/bin/bash
# ✅ E2E TEST - FINAL VALIDATION

echo "=================================================="
echo "✅ E2E AUTOMATION - FINAL VALIDATION"
echo "=================================================="
echo ""

# Check all files exist
echo "📋 Checking Files..."
FILES=(
  "tests/test_complete_user_journeys.py"
  "tests/run_e2e.sh"
  "tests/diagnose.sh"
  "tests/requirements_e2e.txt"
  "E2E_EXECUTION_GUIDE.md"
  "E2E_MISSION_SUMMARY.md"
  "QUICK_START.md"
)

ALL_EXIST=true
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    SIZE=$(wc -c < "$file" | numfmt --to=iec 2>/dev/null || wc -c < "$file")
    echo "✅ $file ($SIZE)"
  else
    echo "❌ $file MISSING"
    ALL_EXIST=false
  fi
done

echo ""

# Check directory structure
echo "📁 Checking Directories..."
DIRS=(
  "tests"
  "tests/reports"
  "tests/reports/screenshots"
  "tests/reports/logs"
)

for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "✅ $dir"
  else
    mkdir -p "$dir"
    echo "📝 Created: $dir"
  fi
done

echo ""

# Check Python packages
echo "📦 Checking Python Packages..."
PACKAGES=("selenium" "pytest" "requests")
for pkg in "${PACKAGES[@]}"; do
  if python3 -c "import $pkg" 2>/dev/null; then
    echo "✅ $pkg"
  else
    echo "⚠️  $pkg not installed"
  fi
done

echo ""

# Summary
echo "=================================================="
if [ "$ALL_EXIST" = true ]; then
  echo "✅ ALL FILES PRESENT - READY TO EXECUTE"
  echo ""
  echo "Quick Start:"
  echo "  1. npm run dev"
  echo "  2. bash tests/run_e2e.sh"
  echo ""
else
  echo "⚠️  SOME FILES MISSING - CHECK ABOVE"
fi
echo "=================================================="
