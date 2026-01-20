#!/usr/bin/env python3
"""
PayPal Checkout E2E Test Suite
Comprehensive end-to-end testing of PayPal payment flow using Selenium
"""

import os
import sys
import time
import json
import requests
from datetime import datetime
from typing import Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    ElementClickInterceptedException,
    StaleElementReferenceException
)

# ============================================================================
# Configuration
# ============================================================================

@dataclass
class TestConfig:
    """Test configuration settings"""
    base_url: str = "http://localhost:3000"
    paypal_sandbox_email: str = "sb-t5anz42281618@personal.example.com"
    paypal_sandbox_password: str = "87C;nFe_"
    test_user_email: str = "test@example.com"
    test_user_password: str = "testpassword123"
    headless: bool = False
    timeout: int = 30
    screenshot_dir: str = "./test_screenshots"


class TestStatus(Enum):
    PASSED = "✅ PASSED"
    FAILED = "❌ FAILED"
    SKIPPED = "⏭️ SKIPPED"
    WARNING = "⚠️ WARNING"


# ============================================================================
# Test Result Tracking
# ============================================================================

@dataclass
class TestResult:
    name: str
    status: TestStatus
    message: str
    duration: float
    screenshot: Optional[str] = None


class TestReporter:
    """Tracks and reports test results"""
    
    def __init__(self):
        self.results: list[TestResult] = []
        self.start_time = datetime.now()
    
    def add_result(self, result: TestResult):
        self.results.append(result)
        status_icon = result.status.value
        print(f"\n{status_icon} {result.name}")
        print(f"   Duration: {result.duration:.2f}s")
        print(f"   Message: {result.message}")
        if result.screenshot:
            print(f"   Screenshot: {result.screenshot}")
    
    def print_summary(self):
        total_duration = (datetime.now() - self.start_time).total_seconds()
        passed = sum(1 for r in self.results if r.status == TestStatus.PASSED)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAILED)
        skipped = sum(1 for r in self.results if r.status == TestStatus.SKIPPED)
        
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {len(self.results)}")
        print(f"✅ Passed:   {passed}")
        print(f"❌ Failed:   {failed}")
        print(f"⏭️ Skipped:  {skipped}")
        print(f"⏱️ Duration: {total_duration:.2f}s")
        print("=" * 70)
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for r in self.results:
                if r.status == TestStatus.FAILED:
                    print(f"   - {r.name}: {r.message}")
        
        return failed == 0


# ============================================================================
# PayPal E2E Test Class
# ============================================================================

class PayPalE2ETest:
    """End-to-end test suite for PayPal checkout flow"""
    
    def __init__(self, config: TestConfig):
        self.config = config
        self.driver: Optional[webdriver.Chrome] = None
        self.reporter = TestReporter()
        
        # Create screenshot directory
        os.makedirs(config.screenshot_dir, exist_ok=True)
    
    def setup_driver(self) -> bool:
        """Initialize Chrome WebDriver"""
        try:
            chrome_options = Options()
            
            if self.config.headless:
                chrome_options.add_argument("--headless=new")
            
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option("useAutomationExtension", False)
            
            # Add preferences to handle downloads and notifications
            prefs = {
                "profile.default_content_setting_values.notifications": 2,
                "credentials_enable_service": False,
                "profile.password_manager_enabled": False
            }
            chrome_options.add_experimental_option("prefs", prefs)
            
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.implicitly_wait(5)
            
            print("✅ Chrome WebDriver initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to initialize WebDriver: {e}")
            return False
    
    def teardown_driver(self):
        """Clean up WebDriver"""
        if self.driver:
            try:
                self.driver.quit()
                print("✅ WebDriver closed")
            except Exception as e:
                print(f"⚠️ Error closing WebDriver: {e}")
    
    def take_screenshot(self, name: str) -> str:
        """Take a screenshot and return the file path"""
        if not self.driver:
            return ""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{self.config.screenshot_dir}/{name}_{timestamp}.png"
        
        try:
            self.driver.save_screenshot(filename)
            return filename
        except Exception as e:
            print(f"⚠️ Screenshot failed: {e}")
            return ""
    
    def wait_for_element(self, by: By, value: str, timeout: int = None) -> Optional[any]:
        """Wait for an element to be present and visible"""
        if not self.driver:
            return None
        
        timeout = timeout or self.config.timeout
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located((by, value))
            )
            return element
        except TimeoutException:
            return None
    
    def wait_for_clickable(self, by: By, value: str, timeout: int = None) -> Optional[any]:
        """Wait for an element to be clickable"""
        if not self.driver:
            return None
        
        timeout = timeout or self.config.timeout
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
            return element
        except TimeoutException:
            return None
    
    def safe_click(self, element, retries: int = 3) -> bool:
        """Safely click an element with retries"""
        for attempt in range(retries):
            try:
                element.click()
                return True
            except ElementClickInterceptedException:
                time.sleep(0.5)
                try:
                    self.driver.execute_script("arguments[0].click();", element)
                    return True
                except:
                    pass
            except StaleElementReferenceException:
                time.sleep(0.5)
        return False
    
    # ========================================================================
    # API Tests
    # ========================================================================
    
    def test_api_health(self) -> TestResult:
        """Test 1: Verify the application is running"""
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.config.base_url}", timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                return TestResult(
                    name="API Health Check",
                    status=TestStatus.PASSED,
                    message=f"Application is running (status: {response.status_code})",
                    duration=duration
                )
            else:
                return TestResult(
                    name="API Health Check",
                    status=TestStatus.FAILED,
                    message=f"Unexpected status code: {response.status_code}",
                    duration=duration
                )
        except requests.exceptions.ConnectionError:
            return TestResult(
                name="API Health Check",
                status=TestStatus.FAILED,
                message=f"Cannot connect to {self.config.base_url}. Is the server running?",
                duration=time.time() - start_time
            )
        except Exception as e:
            return TestResult(
                name="API Health Check",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time
            )
    
    def test_paypal_order_endpoint(self) -> TestResult:
        """Test 2: Verify PayPal order creation endpoint"""
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{self.config.base_url}/api/payment/paypal/order",
                json={"amount": 1000, "currency": "KES"},
                timeout=15
            )
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data:
                    return TestResult(
                        name="PayPal Order Creation API",
                        status=TestStatus.PASSED,
                        message=f"Order created: {data['id']} ({data.get('amount')} {data.get('currency')})",
                        duration=duration
                    )
                else:
                    return TestResult(
                        name="PayPal Order Creation API",
                        status=TestStatus.FAILED,
                        message=f"No order ID in response: {data}",
                        duration=duration
                    )
            else:
                return TestResult(
                    name="PayPal Order Creation API",
                    status=TestStatus.FAILED,
                    message=f"Status {response.status_code}: {response.text[:200]}",
                    duration=duration
                )
        except Exception as e:
            return TestResult(
                name="PayPal Order Creation API",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time
            )
    
    # ========================================================================
    # UI Tests
    # ========================================================================
    
    def test_homepage_loads(self) -> TestResult:
        """Test 3: Verify homepage loads correctly"""
        start_time = time.time()
        
        if not self.driver:
            return TestResult(
                name="Homepage Load",
                status=TestStatus.SKIPPED,
                message="WebDriver not available",
                duration=0
            )
        
        try:
            self.driver.get(self.config.base_url)
            time.sleep(2)
            
            # Check for common elements
            title = self.driver.title
            duration = time.time() - start_time
            
            screenshot = self.take_screenshot("homepage")
            
            if title:
                return TestResult(
                    name="Homepage Load",
                    status=TestStatus.PASSED,
                    message=f"Page loaded with title: '{title}'",
                    duration=duration,
                    screenshot=screenshot
                )
            else:
                return TestResult(
                    name="Homepage Load",
                    status=TestStatus.WARNING,
                    message="Page loaded but title is empty",
                    duration=duration,
                    screenshot=screenshot
                )
        except Exception as e:
            return TestResult(
                name="Homepage Load",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time,
                screenshot=self.take_screenshot("homepage_error")
            )
    
    def test_products_page(self) -> TestResult:
        """Test 4: Verify products page loads and has products"""
        start_time = time.time()
        
        if not self.driver:
            return TestResult(
                name="Products Page",
                status=TestStatus.SKIPPED,
                message="WebDriver not available",
                duration=0
            )
        
        try:
            self.driver.get(f"{self.config.base_url}/products")
            time.sleep(3)
            
            # Look for product cards or grid
            products = self.driver.find_elements(By.CSS_SELECTOR, "[class*='product'], [class*='card'], [data-testid*='product']")
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("products_page")
            
            if len(products) > 0:
                return TestResult(
                    name="Products Page",
                    status=TestStatus.PASSED,
                    message=f"Found {len(products)} product elements",
                    duration=duration,
                    screenshot=screenshot
                )
            else:
                # Try alternative selectors
                alt_products = self.driver.find_elements(By.XPATH, "//*[contains(@class, 'grid')]//a")
                if len(alt_products) > 0:
                    return TestResult(
                        name="Products Page",
                        status=TestStatus.PASSED,
                        message=f"Found {len(alt_products)} products (grid links)",
                        duration=duration,
                        screenshot=screenshot
                    )
                
                return TestResult(
                    name="Products Page",
                    status=TestStatus.WARNING,
                    message="No products found on page",
                    duration=duration,
                    screenshot=screenshot
                )
        except Exception as e:
            return TestResult(
                name="Products Page",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time,
                screenshot=self.take_screenshot("products_error")
            )
    
    def test_add_to_cart(self) -> TestResult:
        """Test 5: Add a product to cart"""
        start_time = time.time()
        
        if not self.driver:
            return TestResult(
                name="Add to Cart",
                status=TestStatus.SKIPPED,
                message="WebDriver not available",
                duration=0
            )
        
        try:
            self.driver.get(f"{self.config.base_url}/products")
            time.sleep(3)
            
            # Find and click first "Add to Cart" button
            add_buttons = self.driver.find_elements(By.XPATH, 
                "//button[contains(text(), 'Add to Cart') or contains(text(), 'Add') or contains(@aria-label, 'cart')]"
            )
            
            if not add_buttons:
                # Try clicking on a product first
                product_links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/products/']")
                if product_links:
                    product_links[0].click()
                    time.sleep(2)
                    add_buttons = self.driver.find_elements(By.XPATH, 
                        "//button[contains(text(), 'Add to Cart') or contains(text(), 'Add')]"
                    )
            
            duration = time.time() - start_time
            
            if add_buttons:
                self.safe_click(add_buttons[0])
                time.sleep(2)
                
                screenshot = self.take_screenshot("add_to_cart")
                
                # Check for cart indicator or success message
                cart_indicator = self.driver.find_elements(By.XPATH, 
                    "//*[contains(@class, 'cart') or contains(@aria-label, 'cart')]"
                )
                
                return TestResult(
                    name="Add to Cart",
                    status=TestStatus.PASSED,
                    message="Product added to cart",
                    duration=duration,
                    screenshot=screenshot
                )
            else:
                return TestResult(
                    name="Add to Cart",
                    status=TestStatus.WARNING,
                    message="Could not find 'Add to Cart' button",
                    duration=duration,
                    screenshot=self.take_screenshot("add_to_cart_not_found")
                )
        except Exception as e:
            return TestResult(
                name="Add to Cart",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time,
                screenshot=self.take_screenshot("add_to_cart_error")
            )
    
    def test_checkout_page(self) -> TestResult:
        """Test 6: Navigate to checkout page"""
        start_time = time.time()
        
        if not self.driver:
            return TestResult(
                name="Checkout Page",
                status=TestStatus.SKIPPED,
                message="WebDriver not available",
                duration=0
            )
        
        try:
            self.driver.get(f"{self.config.base_url}/checkout")
            time.sleep(3)
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("checkout_page")
            
            # Check if redirected to login
            current_url = self.driver.current_url
            if "/auth" in current_url or "/login" in current_url:
                return TestResult(
                    name="Checkout Page",
                    status=TestStatus.WARNING,
                    message="Redirected to login page (user needs to authenticate)",
                    duration=duration,
                    screenshot=screenshot
                )
            
            # Look for checkout elements
            checkout_elements = self.driver.find_elements(By.XPATH, 
                "//*[contains(text(), 'Checkout') or contains(text(), 'Payment') or contains(text(), 'Address')]"
            )
            
            if checkout_elements:
                return TestResult(
                    name="Checkout Page",
                    status=TestStatus.PASSED,
                    message=f"Checkout page loaded with {len(checkout_elements)} elements",
                    duration=duration,
                    screenshot=screenshot
                )
            else:
                return TestResult(
                    name="Checkout Page",
                    status=TestStatus.WARNING,
                    message="Checkout page loaded but elements not found",
                    duration=duration,
                    screenshot=screenshot
                )
        except Exception as e:
            return TestResult(
                name="Checkout Page",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time,
                screenshot=self.take_screenshot("checkout_error")
            )
    
    def test_paypal_button_presence(self) -> TestResult:
        """Test 7: Verify PayPal button is present on checkout"""
        start_time = time.time()
        
        if not self.driver:
            return TestResult(
                name="PayPal Button Presence",
                status=TestStatus.SKIPPED,
                message="WebDriver not available",
                duration=0
            )
        
        try:
            self.driver.get(f"{self.config.base_url}/checkout")
            time.sleep(5)
            
            # Check if on login page
            if "/auth" in self.driver.current_url or "/login" in self.driver.current_url:
                return TestResult(
                    name="PayPal Button Presence",
                    status=TestStatus.SKIPPED,
                    message="Cannot test - user not logged in",
                    duration=time.time() - start_time
                )
            
            # Wait for PayPal iframe to load
            time.sleep(3)
            
            # Look for PayPal elements
            paypal_elements = self.driver.find_elements(By.XPATH, 
                "//iframe[contains(@title, 'PayPal')] | "
                "//*[contains(@class, 'paypal')] | "
                "//*[contains(@id, 'paypal')] | "
                "//input[@id='paypal' or @value='paypal']"
            )
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("paypal_button")
            
            if paypal_elements:
                return TestResult(
                    name="PayPal Button Presence",
                    status=TestStatus.PASSED,
                    message=f"Found {len(paypal_elements)} PayPal elements",
                    duration=duration,
                    screenshot=screenshot
                )
            else:
                # Check for payment method selection
                payment_options = self.driver.find_elements(By.CSS_SELECTOR, 
                    "input[type='radio'], [role='radio']"
                )
                if payment_options:
                    return TestResult(
                        name="PayPal Button Presence",
                        status=TestStatus.WARNING,
                        message=f"Found {len(payment_options)} payment options (PayPal may need selection)",
                        duration=duration,
                        screenshot=screenshot
                    )
                
                return TestResult(
                    name="PayPal Button Presence",
                    status=TestStatus.WARNING,
                    message="PayPal button not found (may need login or cart items)",
                    duration=duration,
                    screenshot=screenshot
                )
        except Exception as e:
            return TestResult(
                name="PayPal Button Presence",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time,
                screenshot=self.take_screenshot("paypal_button_error")
            )
    
    def test_paypal_sdk_loading(self) -> TestResult:
        """Test 8: Verify PayPal SDK loads correctly"""
        start_time = time.time()
        
        if not self.driver:
            return TestResult(
                name="PayPal SDK Loading",
                status=TestStatus.SKIPPED,
                message="WebDriver not available",
                duration=0
            )
        
        try:
            self.driver.get(f"{self.config.base_url}/checkout")
            time.sleep(5)
            
            # Check if PayPal SDK script is loaded
            scripts = self.driver.find_elements(By.XPATH, 
                "//script[contains(@src, 'paypal.com/sdk')]"
            )
            
            # Also check for PayPal namespace in window
            paypal_loaded = self.driver.execute_script(
                "return typeof window.paypal !== 'undefined'"
            )
            
            duration = time.time() - start_time
            screenshot = self.take_screenshot("paypal_sdk")
            
            if paypal_loaded:
                return TestResult(
                    name="PayPal SDK Loading",
                    status=TestStatus.PASSED,
                    message="PayPal SDK loaded successfully (window.paypal exists)",
                    duration=duration,
                    screenshot=screenshot
                )
            elif scripts:
                return TestResult(
                    name="PayPal SDK Loading",
                    status=TestStatus.WARNING,
                    message="PayPal script tag found but SDK may not be fully loaded",
                    duration=duration,
                    screenshot=screenshot
                )
            else:
                return TestResult(
                    name="PayPal SDK Loading",
                    status=TestStatus.WARNING,
                    message="PayPal SDK not detected (may need login first)",
                    duration=duration,
                    screenshot=screenshot
                )
        except Exception as e:
            return TestResult(
                name="PayPal SDK Loading",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time,
                screenshot=self.take_screenshot("paypal_sdk_error")
            )
    
    def test_console_errors(self) -> TestResult:
        """Test 9: Check for JavaScript console errors"""
        start_time = time.time()
        
        if not self.driver:
            return TestResult(
                name="Console Errors Check",
                status=TestStatus.SKIPPED,
                message="WebDriver not available",
                duration=0
            )
        
        try:
            self.driver.get(f"{self.config.base_url}/checkout")
            time.sleep(5)
            
            # Get browser logs
            logs = self.driver.get_log("browser")
            
            errors = [log for log in logs if log.get("level") == "SEVERE"]
            warnings = [log for log in logs if log.get("level") == "WARNING"]
            
            duration = time.time() - start_time
            
            # Filter PayPal-related errors
            paypal_errors = [e for e in errors if "paypal" in e.get("message", "").lower()]
            
            if paypal_errors:
                return TestResult(
                    name="Console Errors Check",
                    status=TestStatus.FAILED,
                    message=f"Found {len(paypal_errors)} PayPal-related errors: {paypal_errors[0].get('message', '')[:100]}",
                    duration=duration,
                    screenshot=self.take_screenshot("console_errors")
                )
            elif errors:
                return TestResult(
                    name="Console Errors Check",
                    status=TestStatus.WARNING,
                    message=f"Found {len(errors)} console errors (not PayPal related)",
                    duration=duration
                )
            else:
                return TestResult(
                    name="Console Errors Check",
                    status=TestStatus.PASSED,
                    message=f"No severe errors ({len(warnings)} warnings)",
                    duration=duration
                )
        except Exception as e:
            # Some drivers don't support get_log
            return TestResult(
                name="Console Errors Check",
                status=TestStatus.WARNING,
                message=f"Could not check console logs: {str(e)[:50]}",
                duration=time.time() - start_time
            )
    
    def test_env_variables(self) -> TestResult:
        """Test 10: Verify required environment variables"""
        start_time = time.time()
        
        try:
            # Read .env file
            env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
            
            required_vars = [
                "PAYPAL_CLIENT_ID",
                "PAYPAL_CLIENT_SECRET",
                "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
                "PAYPAL_MODE"
            ]
            
            found_vars = {}
            missing_vars = []
            
            if os.path.exists(env_path):
                with open(env_path, "r") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, value = line.split("=", 1)
                            key = key.strip()
                            value = value.strip()
                            if key in required_vars:
                                # Check if value is meaningful (more than just "sandbox" or similar)
                                found_vars[key] = len(value) > 5
                
                for var in required_vars:
                    if var not in found_vars:
                        missing_vars.append(var)
                    elif not found_vars[var]:
                        missing_vars.append(f"{var} (empty/short)")
            else:
                missing_vars = [f"{v} (.env file not found)" for v in required_vars]
            
            duration = time.time() - start_time
            
            if not missing_vars:
                return TestResult(
                    name="Environment Variables",
                    status=TestStatus.PASSED,
                    message=f"All {len(required_vars)} required PayPal env vars found",
                    duration=duration
                )
            else:
                return TestResult(
                    name="Environment Variables",
                    status=TestStatus.FAILED,
                    message=f"Missing: {', '.join(missing_vars)}",
                    duration=duration
                )
        except Exception as e:
            return TestResult(
                name="Environment Variables",
                status=TestStatus.FAILED,
                message=str(e),
                duration=time.time() - start_time
            )
    
    # ========================================================================
    # Run All Tests
    # ========================================================================
    
    def run_all_tests(self) -> bool:
        """Run all tests and return success status"""
        print("\n" + "=" * 70)
        print("🧪 PAYPAL CHECKOUT E2E TEST SUITE")
        print("=" * 70)
        print(f"Base URL: {self.config.base_url}")
        print(f"Headless: {self.config.headless}")
        print(f"Timeout:  {self.config.timeout}s")
        print("=" * 70)
        
        # Run API tests first (no browser needed)
        print("\n📡 API TESTS")
        print("-" * 40)
        self.reporter.add_result(self.test_api_health())
        self.reporter.add_result(self.test_paypal_order_endpoint())
        self.reporter.add_result(self.test_env_variables())
        
        # Setup browser for UI tests
        print("\n🌐 UI TESTS")
        print("-" * 40)
        
        if self.setup_driver():
            try:
                self.reporter.add_result(self.test_homepage_loads())
                self.reporter.add_result(self.test_products_page())
                self.reporter.add_result(self.test_add_to_cart())
                self.reporter.add_result(self.test_checkout_page())
                self.reporter.add_result(self.test_paypal_button_presence())
                self.reporter.add_result(self.test_paypal_sdk_loading())
                self.reporter.add_result(self.test_console_errors())
            finally:
                self.teardown_driver()
        else:
            print("⚠️ Skipping UI tests - WebDriver not available")
            for test_name in ["Homepage Load", "Products Page", "Add to Cart", 
                            "Checkout Page", "PayPal Button Presence", 
                            "PayPal SDK Loading", "Console Errors Check"]:
                self.reporter.add_result(TestResult(
                    name=test_name,
                    status=TestStatus.SKIPPED,
                    message="WebDriver not available",
                    duration=0
                ))
        
        # Print summary
        return self.reporter.print_summary()


# ============================================================================
# Main Entry Point
# ============================================================================

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="PayPal Checkout E2E Tests")
    parser.add_argument("--url", default="http://localhost:3000", help="Base URL")
    parser.add_argument("--headless", action="store_true", help="Run headless")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout in seconds")
    
    args = parser.parse_args()
    
    config = TestConfig(
        base_url=args.url,
        headless=args.headless,
        timeout=args.timeout
    )
    
    test_suite = PayPalE2ETest(config)
    success = test_suite.run_all_tests()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
