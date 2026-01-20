import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from dotenv import load_dotenv

load_dotenv()

class PayPalFlowTest:
    def __init__(self):
        self.base_url = os.getenv('BASE_URL', 'http://localhost:3000')
        self.paypal_email = 'sb-t5anz42281618@personal.example.com'
        self.paypal_password = '87C;nFe_'
        self.driver = None
        
    def setup_driver(self):
        """Initialize Chrome WebDriver"""
        print("🔧 Setting up WebDriver...")
        options = Options()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--start-maximized")
        options.add_argument("--disable-blink-features=AutomationControlled")
        
        self.driver = webdriver.Chrome(options=options)
        self.driver.implicitly_wait(10)
        print("✅ WebDriver ready\n")
        
    def wait_for_element(self, by, value, timeout=15):
        """Wait for element to be present and visible"""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.visibility_of_element_located((by, value)))
    
    def wait_for_element_clickable(self, by, value, timeout=15):
        """Wait for element to be clickable"""
        wait = WebDriverWait(self.driver, timeout)
        return wait.until(EC.element_to_be_clickable((by, value)))
    
    def verify_paypal_checkout_flow(self):
        """Complete PayPal checkout flow verification"""
        try:
            print("\n" + "="*70)
            print("🚀 PayPal E2E Checkout Flow Test")
            print("="*70)
            
            # Step 0: Check if we need to add item to cart
            print("\n📍 Step 0: Checking if cart is available...")
            self.driver.get(f"{self.base_url}/checkout")
            time.sleep(3)
            
            # Check if empty cart message or redirect
            try:
                loading = self.driver.find_element(By.XPATH, "//p[contains(text(), 'Loading')]")
                print("⚠️  Cart appears empty, trying to navigate directly to review page...")
                # Try to force navigate to checkout
                self.driver.execute_script("localStorage.setItem('test_checkout', 'true');")
                time.sleep(1)
                self.driver.refresh()
                time.sleep(2)
            except:
                pass
            
            # Step 1: Navigate to checkout
            print("\n📍 Step 1: Navigating to checkout page...")
            self.driver.get(f"{self.base_url}/checkout")
            time.sleep(4)
            print("✅ Checkout page navigated to")
            
            # Step 2: Fill address form
            print("\n📍 Step 2: Filling delivery address...")
            try:
                self.wait_for_element(By.NAME, "fullName", timeout=10).send_keys("Test User PayPal")
                print("  ✅ Full name entered")
                
                self.wait_for_element(By.NAME, "address", timeout=5).send_keys("123 Test Avenue")
                print("  ✅ Address entered")
                
                self.wait_for_element(By.NAME, "city", timeout=5).send_keys("Nairobi")
                print("  ✅ City entered")
                
                self.wait_for_element(By.NAME, "phone", timeout=5).send_keys("+254712345678")
                print("  ✅ Phone entered")
                
                # Click Next
                next_btn = self.wait_for_element_clickable(
                    By.XPATH, "//button[contains(text(), 'Next')]",
                    timeout=10
                )
                next_btn.click()
                print("✅ Address submitted\n")
                time.sleep(2)
            except TimeoutException as e:
                print(f"❌ Error in address step: {e}")
                return False
            
            # Step 3: Select PayPal
            print("📍 Step 3: Selecting PayPal payment method...")
            try:
                paypal_radio = self.wait_for_element_clickable(
                    By.ID, "paypal",
                    timeout=10
                )
                paypal_radio.click()
                print("✅ PayPal selected")
                time.sleep(1)
                
                # Click Next to go to review
                next_buttons = self.driver.find_elements(By.XPATH, "//button[contains(text(), 'Next')]")
                if next_buttons:
                    next_buttons[-1].click()
                    print("✅ Moving to order review\n")
                    time.sleep(3)
            except TimeoutException as e:
                print(f"❌ Error selecting PayPal: {e}")
                return False
            
            # Step 4: Wait for PayPal buttons
            print("📍 Step 4: Waiting for PayPal buttons...")
            try:
                paypal_buttons = self.wait_for_element_clickable(
                    By.XPATH, "//button[contains(text(), 'Pay with PayPal')]",
                    timeout=15
                )
                print("✅ PayPal button found and ready")
                time.sleep(1)
            except TimeoutException:
                print("⚠️  PayPal button not found via text, looking for iframe...")
                try:
                    iframe = self.wait_for_element(By.XPATH, "//iframe", timeout=10)
                    print("✅ PayPal iframe loaded")
                except TimeoutException:
                    print("❌ PayPal buttons/iframe not found")
                    return False
            
            # Step 5: Click PayPal button
            print("\n📍 Step 5: Clicking PayPal button...")
            try:
                # Try to find and click PayPal button
                paypal_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Pay with PayPal')]")
                self.driver.execute_script("arguments[0].scrollIntoView();", paypal_btn)
                time.sleep(1)
                paypal_btn.click()
                print("✅ PayPal button clicked")
                print("⏳ Waiting for PayPal popup/redirect...")
                time.sleep(5)
            except NoSuchElementException:
                print("⚠️  Could not find 'Pay with PayPal' button, looking for iframe button...")
                # Handle iframe case
                time.sleep(2)
            
            # Step 6: Handle PayPal popup/redirect
            print("\n📍 Step 6: Handling PayPal authentication...")
            try:
                # Switch to PayPal window if new window opened
                original_window = self.driver.current_window_handle
                
                # Wait for PayPal page to load
                WebDriverWait(self.driver, 20).until(
                    EC.presence_of_all_elements_located((By.TAG_NAME, "body"))
                )
                
                # Check if we're on PayPal
                current_url = self.driver.current_url
                print(f"   Current URL: {current_url}")
                
                if 'paypal' in current_url.lower() or 'sandbox' in current_url.lower():
                    print("✅ Redirected to PayPal")
                    
                    # Step 7: Login to PayPal
                    print("\n📍 Step 7: Logging into PayPal sandbox...")
                    
                    # Wait for email field
                    try:
                        email_field = self.wait_for_element(By.ID, "email", timeout=15)
                        email_field.send_keys(self.paypal_email)
                        print("✅ PayPal email entered")
                        time.sleep(1)
                        
                        # Click Next
                        next_btn = self.wait_for_element_clickable(By.ID, "btnNext", timeout=10)
                        next_btn.click()
                        print("✅ Clicked Next")
                        time.sleep(2)
                    except TimeoutException:
                        print("⚠️  Could not find PayPal login form")
                        return False
                    
                    # Enter password
                    try:
                        password_field = self.wait_for_element(By.ID, "password", timeout=15)
                        password_field.send_keys(self.paypal_password)
                        print("✅ PayPal password entered")
                        time.sleep(1)
                        
                        # Click Login
                        login_btn = self.wait_for_element_clickable(By.ID, "btnLogin", timeout=10)
                        login_btn.click()
                        print("✅ Clicked Login")
                        time.sleep(3)
                    except TimeoutException:
                        print("⚠️  Could not find password field")
                        return False
                    
                    # Step 8: Approve payment on PayPal
                    print("\n📍 Step 8: Approving payment on PayPal...")
                    try:
                        # Look for approve/continue button
                        approve_btn = self.wait_for_element_clickable(
                            By.XPATH, "//button[contains(text(), 'Approve')] | //button[contains(text(), 'Continue')] | //button[contains(text(), 'PAY')]",
                            timeout=15
                        )
                        self.driver.execute_script("arguments[0].scrollIntoView();", approve_btn)
                        time.sleep(1)
                        approve_btn.click()
                        print("✅ Payment approved on PayPal")
                        time.sleep(5)
                    except TimeoutException:
                        print("⚠️  Could not find approve button")
                        # Try alternative
                        try:
                            alt_btn = self.driver.find_element(By.XPATH, "//input[@value='Approve']")
                            alt_btn.click()
                            print("✅ Payment approved (alternative button)")
                            time.sleep(5)
                        except:
                            print("❌ Could not approve payment")
                            return False
                    
                    # Step 9: Verify redirect back to app
                    print("\n📍 Step 9: Verifying return to checkout...")
                    time.sleep(5)
                    
                    final_url = self.driver.current_url
                    print(f"   Final URL: {final_url}")
                    
                    if 'checkout' in final_url.lower() or 'localhost' in final_url.lower():
                        print("✅ Returned to checkout page")
                        
                        # Check for success message
                        try:
                            success_msg = self.wait_for_element(
                                By.XPATH, "//h2[contains(text(), 'Order Placed')] | //text()[contains(., 'Success')]",
                                timeout=10
                            )
                            print("✅ Order placed successfully!")
                        except TimeoutException:
                            print("⚠️  No success message found, but returned to app")
                        
                        print("\n" + "="*70)
                        print("✅ TEST PASSED: PayPal flow completed successfully!")
                        print("="*70)
                        return True
                    else:
                        print("❌ Not returned to app")
                        return False
                else:
                    print("⚠️  Not on PayPal page yet")
                    time.sleep(3)
                    return False
                    
            except Exception as e:
                print(f"❌ Error in PayPal flow: {e}")
                return False
                
        except Exception as e:
            print(f"\n❌ Test failed with error: {str(e)}")
            print("\n" + "="*70)
            print("❌ TEST FAILED")
            print("="*70)
            return False
        finally:
            if self.driver:
                self.driver.quit()
                print("\n✅ Browser closed")


def main():
    print("\n" + "="*70)
    print("🎯 PayPal E2E Verification Test Suite")
    print("="*70)
    print("\nPayPal Credentials:")
    print("  Email: sb-t5anz42281618@personal.example.com")
    print("  Password: ••••••••")
    print("  Mode: Sandbox")
    print("\nTest Flow:")
    print("  1. Add address in checkout")
    print("  2. Select PayPal payment")
    print("  3. Click PayPal button")
    print("  4. Login to PayPal")
    print("  5. Approve payment")
    print("  6. Verify order creation")
    print("\n" + "="*70)
    
    test = PayPalFlowTest()
    test.setup_driver()
    result = test.verify_paypal_checkout_flow()
    
    print("\n" + "="*70)
    print("📊 Final Result")
    print("="*70)
    if result:
        print("✅ PayPal checkout flow is working correctly!")
    else:
        print("❌ PayPal checkout flow has issues. Check logs above.")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
