#!/usr/bin/env python3
"""
🔍 PRE-FLIGHT CHECK: Verify all E2E test dependencies are ready
Run this BEFORE running the main test to catch issues early
"""

import sys
import os
from pathlib import Path

print("🔍 E2E TEST PRE-FLIGHT CHECK")
print("=" * 80 + "\n")

# Track results
checks = []

def check(name, func):
    """Helper to check and report"""
    try:
        func()
        print(f"✅ {name}")
        checks.append((name, True))
    except Exception as e:
        print(f"❌ {name}: {str(e)}")
        checks.append((name, False))

# ============================================================================
# CHECKS
# ============================================================================

# 1. Python packages
def check_packages():
    import selenium
    import pytest
    import requests
    from selenium import webdriver
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

check("Python packages (selenium, pytest, requests)", check_packages)

# 2. Firebase Admin
def check_firebase():
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        print("   (Firebase will be lazy-loaded during test)")
    except ImportError:
        pass  # Will be loaded on demand

check("Firebase Admin SDK available", check_firebase)

# 3. Chrome/Chromedriver
def check_chrome():
    from webdriver_manager.chrome import ChromeDriverManager
    ChromeDriverManager().install()

check("Chrome WebDriver", check_chrome)

# 4. Server connectivity
def check_server():
    import requests
    base_url = os.getenv("BASE_URL", "http://localhost:3000")
    try:
        response = requests.get(base_url, timeout=5)
        if response.status_code in [200, 404, 500]:  # Any response = server is up
            return
        raise Exception(f"Unexpected status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        raise Exception(f"Server not running at {base_url}")

check("Server running (http://localhost:3000)", check_server)

# 5. Test file exists
def check_test_file():
    test_file = Path("tests/test_complete_user_journeys.py")
    if not test_file.exists():
        raise Exception(f"Test file not found: {test_file}")
    lines = test_file.read_text().count('\n')
    if lines < 100:
        raise Exception(f"Test file too small: {lines} lines")

check("Master E2E test file exists", check_test_file)

# 6. Backend validator exists
def check_validator():
    validator_file = Path("tests/utils/backend_validator.py")
    if not validator_file.exists():
        raise Exception(f"Validator not found: {validator_file}")

check("Backend validator module", check_validator)

# 7. Credentials configured
def check_credentials():
    from tests.test_complete_user_journeys import (
        CUSTOMER_EMAIL, VENDOR_EMAIL, ADMIN_EMAIL,
        PAYPAL_EMAIL, BASE_URL
    )
    assert CUSTOMER_EMAIL == "customer1@zilacart.com"
    assert VENDOR_EMAIL == "vendor1@zilacart.com"
    assert ADMIN_EMAIL == "admin@zilacart.com"
    assert PAYPAL_EMAIL == "sb-t5anz42281618@personal.example.com"

check("Test credentials configured", check_credentials)

# 8. Reports directory
def check_reports_dir():
    reports_dir = Path("tests/reports/screenshots")
    reports_dir.mkdir(parents=True, exist_ok=True)
    if not reports_dir.exists():
        raise Exception(f"Cannot create reports directory")

check("Reports directory writable", check_reports_dir)

# 9. Service account key (optional)
def check_service_account():
    if Path("serviceAccountKey.json").exists():
        return
    # Check if env vars are set
    if os.getenv("FIREBASE_PROJECT_ID"):
        return
    print("   (Warning: Firebase backend validation may be limited)")

check("Firebase service account OR env vars", check_service_account)

# ============================================================================
# SUMMARY
# ============================================================================

print("\n" + "=" * 80)
passed = sum(1 for _, result in checks if result)
total = len(checks)

if passed == total:
    print(f"✅ ALL CHECKS PASSED ({passed}/{total})")
    print("=" * 80)
    print("\n🚀 Ready to run E2E test!")
    print("\nExecute:")
    print("  python -m pytest tests/test_complete_user_journeys.py -v -s")
    print("\nOr use the convenience script:")
    print("  bash run_e2e_test.sh")
    sys.exit(0)
else:
    print(f"❌ SOME CHECKS FAILED ({passed}/{total})")
    print("=" * 80)
    print("\n⚠️  Fix the issues above before running the test\n")
    sys.exit(1)
