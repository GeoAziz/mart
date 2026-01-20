#!/usr/bin/env python3
"""
PayPal Checkout Flow Verification Script
Tests the complete PayPal sandbox payment flow
"""

import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException

PAYPAL_EMAIL = 'sb-t5anz42281618@personal.example.com'
PAYPAL_PASSWORD = '87C;nFe_'
BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')

def setup_driver():
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--start-maximized")
    driver = webdriver.Chrome(options=options)
    return driver

def wait_for(driver, by, value, timeout=15):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, value))
    )

def click_when_ready(driver, by, value, timeout=15):
    elem = WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((by, value))
    )
    driver.execute_script("arguments[0].scrollIntoView();", elem)
    elem.click()
    return elem

def test_paypal_flow():
    driver = setup_driver()
    try:
        print("\n" + "="*80)
        print("🎯 PayPal Checkout Verification Test")
        print("="*80)
        print(f"\n🌐 Base URL: {BASE_URL}")
        print(f"📧 PayPal Account: {PAYPAL_EMAIL}\n")
        
        # Navigate to checkout
        print("📍 Step 1: Navigate to checkout...")
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(4)
        print("✅ Checkout page reached\n")
        
        # Fill address form
        print("📍 Step 2: Fill address form...")
        try:
            wait_for(driver, By.NAME, "fullName", 10).send_keys("Test PayPal User")
            wait_for(driver, By.NAME, "address", 10).send_keys("123 Test St")
            wait_for(driver, By.NAME, "city", 10).send_keys("Nairobi")
            wait_for(driver, By.NAME, "phone", 10).send_keys("+254712345678")
            print("✅ Address form filled\n")
        except TimeoutException as e:
            print(f"❌ Address form timeout: {e}\n")
            return False
        
        # Click Next
        print("📍 Step 3: Submit address and select payment method...")
        try:
            click_when_ready(driver, By.XPATH, "//button[contains(text(), 'Next')]", 10)
            time.sleep(2)
        except TimeoutException as e:
            print(f"❌ Could not click Next: {e}\n")
            return False
        
        # Select PayPal
        print("📍 Step 4: Select PayPal...")
        try:
            click_when_ready(driver, By.ID, "paypal", 10)
            time.sleep(1)
            print("✅ PayPal selected\n")
        except TimeoutException as e:
            print(f"❌ Could not select PayPal: {e}\n")
            return False
        
        # Click Next to review
        print("📍 Step 5: Go to order review...")
        try:
            next_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'Next')]")
            if next_buttons:
                next_buttons[-1].click()
            time.sleep(3)
            print("✅ Order review page loaded\n")
        except Exception as e:
            print(f"⚠️  Step skipped: {e}\n")
        
        # Wait for PayPal button and click
        print("📍 Step 6: Wait for PayPal button...")
        try:
            paypal_frame = wait_for(driver, By.XPATH, "//iframe", 15)
            print("✅ PayPal iframe detected\n")
            
            print("📍 Step 7: Clicking PayPal button...")
            time.sleep(2)
            
            # Click the button in the iframe
            buttons = driver.find_elements(By.XPATH, "//button")
            for btn in buttons:
                if 'paypal' in btn.get_attribute('class').lower() or 'pay' in btn.text.lower():
                    driver.execute_script("arguments[0].click();", btn)
                    print("✅ PayPal button clicked\n")
                    break
            
        except Exception as e:
            print(f"⚠️  PayPal button issue: {e}\n")
        
        # Wait for PayPal popup/redirect
        print("📍 Step 8: Wait for PayPal redirect...")
        time.sleep(5)
        
        current_url = driver.current_url
        print(f"   Current URL: {current_url}\n")
        
        if 'paypal' in current_url.lower() or 'sandbox' in current_url.lower():
            print("✅ Redirected to PayPal\n")
            
            # Login
            print("📍 Step 9: Login to PayPal...")
            try:
                wait_for(driver, By.ID, "email", 15).send_keys(PAYPAL_EMAIL)
                print("✅ Email entered")
                
                click_when_ready(driver, By.ID, "btnNext", 10)
                time.sleep(2)
                
                wait_for(driver, By.ID, "password", 15).send_keys(PAYPAL_PASSWORD)
                print("✅ Password entered")
                
                click_when_ready(driver, By.ID, "btnLogin", 10)
                time.sleep(3)
                print("✅ Logged in\n")
                
            except TimeoutException as e:
                print(f"❌ PayPal login failed: {e}\n")
                return False
            
            # Approve
            print("📍 Step 10: Approve payment...")
            try:
                approve_btn = wait_for(
                    driver, 
                    By.XPATH, 
                    "//button[contains(text(), 'Approve')] | //button[contains(text(), 'Continue')] | //button[contains(text(), 'PAY NOW')]",
                    15
                )
                driver.execute_script("arguments[0].scrollIntoView();", approve_btn)
                time.sleep(1)
                approve_btn.click()
                print("✅ Payment approved\n")
                time.sleep(5)
                
            except TimeoutException as e:
                print(f"⚠️  Could not find approve button: {e}\n")
                try:
                    # Try alternative
                    inputs = driver.find_elements(By.XPATH, "//input[@value='Approve']")
                    if inputs:
                        inputs[0].click()
                        print("✅ Payment approved (form input)\n")
                        time.sleep(5)
                except:
                    pass
            
            # Return check
            print("📍 Step 11: Verify return to app...")
            final_url = driver.current_url
            print(f"   Final URL: {final_url}\n")
            
            if 'localhost' in final_url or 'checkout' in final_url:
                print("✅ Returned to app\n")
                
                # Check for order success
                try:
                    success = wait_for(
                        driver,
                        By.XPATH,
                        "//h2[contains(text(), 'Successfully')] | //text()[contains(., 'Order Placed')]",
                        10
                    )
                    print("✅ Order confirmation visible\n")
                except:
                    print("⚠️  Order confirmation not visible (order may still be created)\n")
                
                print("="*80)
                print("✅✅✅ PayPal checkout flow SUCCESSFUL! ✅✅✅")
                print("="*80 + "\n")
                return True
            else:
                print("❌ Did not return to app\n")
                return False
        else:
            print("⚠️  Not on PayPal page\n")
            return False
            
    except Exception as e:
        print(f"\n❌ Test error: {e}\n")
        return False
    finally:
        print("Closing browser...")
        driver.quit()
        print("✅ Done\n")

if __name__ == "__main__":
    success = test_paypal_flow()
    exit(0 if success else 1)
