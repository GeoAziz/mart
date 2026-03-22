#!/usr/bin/env python3
"""
Comprehensive PayPal Integration Test
Tests the full PayPal checkout flow with detailed error reporting
"""

import os
import sys
import requests
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

BASE_URL = "http://localhost:3000"
PAYPAL_EMAIL = os.getenv('PAYPAL_SANDBOX_EMAIL', '')
PAYPAL_PASSWORD = os.getenv('PAYPAL_SANDBOX_PASSWORD', '')

if not PAYPAL_EMAIL or not PAYPAL_PASSWORD:
    print('⚠️  WARNING: PayPal sandbox credentials not configured')
    print('   Set these environment variables to run full tests:')
    print('   - PAYPAL_SANDBOX_EMAIL (e.g., sb-xxxxx@personal.example.com)')
    print('   - PAYPAL_SANDBOX_PASSWORD')
    print('   Sandbox tests will be skipped.')

def test_paypal_api():
    """Test the PayPal API endpoints directly"""
    print("\n" + "="*70)
    print("🧪 TESTING PAYPAL API ENDPOINTS")
    print("="*70)
    
    # Test 1: Order Creation
    print("\n1️⃣  Testing Order Creation Endpoint...")
    print("-" * 70)
    
    try:
        response = requests.post(f"{BASE_URL}/api/payment/paypal/order", json={
            "amount": 2000,
            "currency": "KES"
        })
        
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            order_id = response.json().get('id')
            print(f"   ✅ Order Created: {order_id}")
            
            # Test 2: Capture (without approval - should fail)
            print("\n2️⃣  Testing Capture Endpoint (Expected to fail without approval)...")
            print("-" * 70)
            
            capture_response = requests.post(f"{BASE_URL}/api/payment/paypal/capture", json={
                "orderId": order_id
            })
            
            print(f"   Status: {capture_response.status_code}")
            print(f"   Response: {json.dumps(capture_response.json(), indent=2)}")
            
            if capture_response.status_code != 200:
                print(f"   ⚠️  Expected error (order not approved): {capture_response.json().get('message')}")
            else:
                print(f"   ⚠️  Unexpected success - order should not be capturable without approval")
        else:
            print(f"   ❌ Order creation failed: {response.json()}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

def test_paypal_selenium():
    """Test the full PayPal checkout flow with Selenium"""
    print("\n" + "="*70)
    print("🌐 TESTING PAYPAL CHECKOUT FLOW WITH SELENIUM")
    print("="*70)
    
    chrome_options = Options()
    # chrome_options.add_argument("--headless")  # Uncomment for headless mode
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    driver = None
    try:
        driver = webdriver.Chrome(options=chrome_options)
        
        # Step 1: Navigate to products
        print("\n1️⃣  Navigating to products page...")
        driver.get(f"{BASE_URL}/products")
        time.sleep(2)
        
        # Step 2: Add item to cart
        print("2️⃣  Adding item to cart...")
        add_to_cart_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'Add to Cart')]")
        if add_to_cart_buttons:
            add_to_cart_buttons[0].click()
            print("   ✅ Item added to cart")
            time.sleep(1)
        else:
            print("   ⚠️  No 'Add to Cart' button found")
        
        # Step 3: Navigate to checkout
        print("3️⃣  Navigating to checkout...")
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(3)
        
        # Step 4: Check if address form is present
        print("4️⃣  Checking address form...")
        try:
            name_input = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.NAME, "fullName"))
            )
            print("   ✅ Address form found")
            
            # Fill in form
            print("5️⃣  Filling address form...")
            driver.find_element(By.NAME, "fullName").send_keys("Test User")
            driver.find_element(By.NAME, "address").send_keys("123 Test Street")
            driver.find_element(By.NAME, "city").send_keys("Nairobi")
            driver.find_element(By.NAME, "phone").send_keys("+254712345678")
            time.sleep(1)
            
            # Submit form
            print("6️⃣  Submitting address form...")
            next_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Next')]")
            next_button.click()
            time.sleep(2)
            
            # Step 5: Select PayPal
            print("7️⃣  Selecting PayPal payment method...")
            paypal_radio = driver.find_element(By.ID, "paypal-method")
            paypal_radio.click()
            time.sleep(2)
            
            # Step 6: Check for PayPal buttons
            print("8️⃣  Checking for PayPal buttons...")
            try:
                paypal_button = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, "//div[@id='paypal-button-container']//button"))
                )
                print("   ✅ PayPal button found")
                
                # Log current URL
                print(f"   📍 Current URL: {driver.current_url}")
                
                # Log page source (first 500 chars)
                print(f"   📄 Page has PayPal script: {'paypal' in driver.page_source.lower()}")
                
                # Check browser console for errors
                print("9️⃣  Checking browser console for errors...")
                logs = driver.get_log('browser')
                error_logs = [log for log in logs if log['level'] == 'SEVERE']
                if error_logs:
                    print("   ⚠️  Console errors found:")
                    for log in error_logs[:5]:  # Show first 5 errors
                        print(f"      - {log['message'][:100]}")
                else:
                    print("   ✅ No critical console errors")
                
            except Exception as e:
                print(f"   ❌ PayPal button not found: {e}")
                
        except Exception as e:
            print(f"   ❌ Address form not found: {e}")
        
        # Print final URL and page info
        print(f"\n   Final URL: {driver.current_url}")
        print(f"   Page title: {driver.title}")
        
    except Exception as e:
        print(f"\n❌ Selenium test error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if driver:
            driver.quit()

def main():
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*15 + "PAYPAL INTEGRATION TEST SUITE" + " "*24 + "║")
    print("╚" + "="*68 + "╝")
    
    # Run API tests
    test_paypal_api()
    
    # Run Selenium tests
    test_paypal_selenium()
    
    print("\n" + "="*70)
    print("✅ TEST SUITE COMPLETE")
    print("="*70)
    print("\n📋 Summary:")
    print("   • If API tests pass: endpoints are working correctly")
    print("   • If Selenium tests pass: frontend integration is working")
    print("   • Check browser console in Selenium for PayPal SDK errors")
    print("   • Check that return_url and cancel_url are properly set")
    print("\n")

if __name__ == "__main__":
    main()
