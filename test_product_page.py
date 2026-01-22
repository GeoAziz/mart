#!/usr/bin/env python3
"""
Test the product page directly in browser to see the error
"""
import time
import os
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
TEST_PRODUCT_ID = "KRmdS9LCeZvURKx6NbvI"

options = Options()
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)

try:
    print("\n" + "="*70)
    print("🔍 TESTING PRODUCT PAGE")
    print("="*70)
    
    # Test URL
    product_url = f"{BASE_URL}/products/{TEST_PRODUCT_ID}"
    print(f"\n📝 Testing: {product_url}\n")
    
    # Load page
    print("1️⃣ Loading product page...")
    driver.get(product_url)
    time.sleep(5)  # Wait for page to load
    
    # Get current URL
    current_url = driver.current_url
    print(f"   Current URL: {current_url}")
    
    # Check for error messages
    print("\n2️⃣ Checking for error messages...")
    try:
        error_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'not found') or contains(text(), 'error') or contains(text(), 'Error') or contains(text(), 'NOT FOUND')]")
        if error_elements:
            print(f"   Found {len(error_elements)} error messages:")
            for i, el in enumerate(error_elements[:5], 1):
                text = el.text.strip()
                if text:
                    print(f"   {i}. {text[:100]}")
        else:
            print("   ✅ No error messages found")
    except:
        pass
    
    # Check page title
    print("\n3️⃣ Page title:")
    print(f"   {driver.title}")
    
    # Look for product info
    print("\n4️⃣ Checking for product elements...")
    checks = [
        ("//h1", "Product title (h1)"),
        ("//h2", "Product title (h2)"),
        ("//button[contains(text(), 'Add')]", "Add to Cart button"),
        ("//img", "Product image"),
        ("//span[contains(., '$')]", "Price"),
    ]
    
    for xpath, label in checks:
        try:
            elements = driver.find_elements(By.XPATH, xpath)
            if elements:
                print(f"   ✅ Found: {label}")
                if label.endswith("title"):
                    print(f"      Text: {elements[0].text[:50]}")
            else:
                print(f"   ❌ Missing: {label}")
        except:
            print(f"   ❌ Error checking: {label}")
    
    # Get page source snippet
    print("\n5️⃣ Page HTML snippet (first 500 chars of body):")
    html = driver.page_source
    body_start = html.find("<body")
    if body_start > 0:
        snippet = html[body_start:body_start+500]
        print(f"   {snippet}...")
    
    # Take screenshot
    print("\n6️⃣ Taking screenshot...")
    ss_path = Path("tests/reports/screenshots/product_page_check.png")
    ss_path.parent.mkdir(parents=True, exist_ok=True)
    driver.save_screenshot(str(ss_path))
    print(f"   ✅ Saved to {ss_path}")
    
    print("\n" + "="*70)
    
finally:
    driver.quit()
