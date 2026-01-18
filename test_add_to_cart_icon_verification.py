#!/usr/bin/env python3
"""
Professional Selenium Test Suite: Add to Cart Button Icon Verification
Tests the visibility, color, and functionality of the shopping cart icon on mobile and desktop
"""

import time
import sys
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

class ShoppingCartIconTest:
    """Test class for Add to Cart icon verification"""
    
    def __init__(self, product_url="http://localhost:3000/products/KRmdS9LCeZvURKx6NbvI"):
        self.product_url = product_url
        self.driver = None
        self.test_results = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "details": []
        }
    
    def setup_driver(self, headless=False):
        """Initialize the Chrome WebDriver"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless")
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument("--disable-notifications")
        chrome_options.add_argument("--disable-popup-blocking")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Allow running as root in Docker
        if os.geteuid() == 0:
            chrome_options.add_argument("--disable-gpu")
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
    
    def log_test(self, test_name, passed, message=""):
        """Log test result"""
        self.test_results["total"] += 1
        if passed:
            self.test_results["passed"] += 1
            status = "✓ PASS"
        else:
            self.test_results["failed"] += 1
            status = "✗ FAIL"
        
        result = f"{status}: {test_name}"
        if message:
            result += f" | {message}"
        
        self.test_results["details"].append(result)
        print(f"    {result}")
    
    def test_page_load(self):
        """Test 1: Verify page loads successfully"""
        print("\n[TEST 1] Page Load Verification")
        try:
            self.driver.get(self.product_url)
            wait = WebDriverWait(self.driver, 15)
            wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "button")))
            time.sleep(3)  # Extra time for JS rendering
            self.log_test("Page loads successfully", True, f"URL: {self.product_url}")
            return True
        except Exception as e:
            self.log_test("Page loads successfully", False, str(e))
            return False
    
    def test_add_to_cart_button_exists(self):
        """Test 2: Verify Add to Cart button exists"""
        print("\n[TEST 2] Add to Cart Button Existence")
        try:
            buttons = self.driver.find_elements(By.XPATH, "//button[@aria-label='Add to Cart']")
            self.log_test("Add to Cart button found", len(buttons) > 0, f"Found {len(buttons)} buttons")
            return len(buttons) > 0
        except Exception as e:
            self.log_test("Add to Cart button found", False, str(e))
            return False
    
    def test_shopping_cart_icon_rendered(self):
        """Test 3: Verify Shopping Cart icon is rendered"""
        print("\n[TEST 3] Shopping Cart Icon Rendering")
        try:
            # Look for SVG elements within Add to Cart buttons
            buttons = self.driver.find_elements(By.XPATH, "//button[@aria-label='Add to Cart']")
            icon_found = False
            
            for button in buttons:
                # Check if button contains SVG (icon)
                svg_elements = button.find_elements(By.TAG_NAME, "svg")
                if svg_elements:
                    icon_found = True
                    # Check button visibility
                    is_visible = button.is_displayed()
                    self.log_test("Shopping Cart icon rendered and visible", is_visible, 
                                f"SVGs found: {len(svg_elements)}, Button visible: {is_visible}")
                    return is_visible
            
            if not icon_found:
                self.log_test("Shopping Cart icon rendered and visible", False, "No SVG icons found in button")
                return False
        except Exception as e:
            self.log_test("Shopping Cart icon rendered and visible", False, str(e))
            return False
    
    def test_icon_color(self):
        """Test 4: Verify icon has proper color"""
        print("\n[TEST 4] Icon Color Verification")
        try:
            # Get Add to Cart button and check computed style
            buttons = self.driver.find_elements(By.XPATH, "//button[@aria-label='Add to Cart']")
            
            for button in buttons:
                # Check for color classes in button or icon
                button_class = button.get_attribute("class")
                icon_elements = button.find_elements(By.CSS_SELECTOR, "svg")
                
                has_color = False
                for icon in icon_elements:
                    icon_class = icon.get_attribute("class")
                    # Check if icon has color classes (text-primary-foreground, text-white, etc)
                    if any(color in str(icon_class).lower() for color in ["text-", "color", "white", "foreground"]):
                        has_color = True
                        break
                
                color_info = f"Button classes: {button_class[:50]}..."
                self.log_test("Icon has proper color styling", has_color or "text-" in button_class, color_info)
                return has_color or "text-" in button_class
            
            self.log_test("Icon has proper color styling", False, "No buttons found")
            return False
        except Exception as e:
            self.log_test("Icon has proper color styling", False, str(e))
            return False
    
    def test_button_clickable(self):
        """Test 5: Verify Add to Cart button is clickable"""
        print("\n[TEST 5] Button Clickability")
        try:
            buttons = self.driver.find_elements(By.XPATH, "//button[@aria-label='Add to Cart']")
            
            for button in buttons:
                is_enabled = button.get_attribute("disabled") is None
                is_visible = button.is_displayed()
                
                self.log_test("Add to Cart button is clickable", is_enabled and is_visible,
                            f"Enabled: {is_enabled}, Visible: {is_visible}")
                return is_enabled and is_visible
            
            self.log_test("Add to Cart button is clickable", False, "No buttons found")
            return False
        except Exception as e:
            self.log_test("Add to Cart button is clickable", False, str(e))
            return False
    
    def test_mobile_view(self):
        """Test 6: Verify icon appears in mobile view"""
        print("\n[TEST 6] Mobile View Verification")
        try:
            # Set mobile viewport
            self.driver.set_window_size(375, 667)  # iPhone 8 size
            time.sleep(2)
            
            buttons = self.driver.find_elements(By.XPATH, "//button[@aria-label='Add to Cart']")
            if buttons:
                button = buttons[0]
                is_visible = button.is_displayed()
                svg_elements = button.find_elements(By.TAG_NAME, "svg")
                
                self.log_test("Icon visible in mobile view", is_visible and len(svg_elements) > 0,
                            f"Button visible: {is_visible}, Icons: {len(svg_elements)}")
                return is_visible
            else:
                self.log_test("Icon visible in mobile view", False, "No Add to Cart button found")
                return False
        except Exception as e:
            self.log_test("Icon visible in mobile view", False, str(e))
            return False
    
    def test_desktop_view(self):
        """Test 7: Verify icon and text appear in desktop view"""
        print("\n[TEST 7] Desktop View Verification")
        try:
            # Set desktop viewport
            self.driver.set_window_size(1920, 1080)
            time.sleep(2)
            
            buttons = self.driver.find_elements(By.XPATH, "//button[@aria-label='Add to Cart']")
            if buttons:
                button = buttons[0]
                is_visible = button.is_displayed()
                svg_elements = button.find_elements(By.TAG_NAME, "svg")
                button_text = button.text.strip()
                
                has_text = len(button_text) > 0
                self.log_test("Icon and text visible in desktop view", 
                            is_visible and len(svg_elements) > 0 and has_text,
                            f"Icon visible: {is_visible}, SVGs: {len(svg_elements)}, Text: '{button_text}'")
                return is_visible and len(svg_elements) > 0
            else:
                self.log_test("Icon and text visible in desktop view", False, "No Add to Cart button found")
                return False
        except Exception as e:
            self.log_test("Icon and text visible in desktop view", False, str(e))
            return False
    
    def test_wishlist_button(self):
        """Test 8: Verify Wishlist button with heart icon"""
        print("\n[TEST 8] Wishlist Button Verification")
        try:
            wishlist_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@aria-label, 'Wishlist')]")
            
            if wishlist_buttons:
                button = wishlist_buttons[0]
                is_visible = button.is_displayed()
                svg_elements = button.find_elements(By.TAG_NAME, "svg")
                
                self.log_test("Wishlist button with heart icon visible", 
                            is_visible and len(svg_elements) > 0,
                            f"Button visible: {is_visible}, SVGs: {len(svg_elements)}")
                return is_visible and len(svg_elements) > 0
            else:
                self.log_test("Wishlist button with heart icon visible", False, "No Wishlist button found")
                return False
        except Exception as e:
            self.log_test("Wishlist button with heart icon visible", False, str(e))
            return False
    
    def test_screenshot(self):
        """Test 9: Take screenshots for visual verification"""
        print("\n[TEST 9] Screenshot Capture")
        try:
            # Desktop screenshot
            self.driver.set_window_size(1920, 1080)
            self.driver.save_screenshot("/tmp/add_to_cart_desktop.png")
            
            # Mobile screenshot
            self.driver.set_window_size(375, 667)
            self.driver.save_screenshot("/tmp/add_to_cart_mobile.png")
            
            self.log_test("Screenshots captured successfully", True, 
                        "Desktop: /tmp/add_to_cart_desktop.png, Mobile: /tmp/add_to_cart_mobile.png")
            return True
        except Exception as e:
            self.log_test("Screenshots captured successfully", False, str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "=" * 90)
        print("PROFESSIONAL SELENIUM TEST SUITE: Add to Cart Icon Verification")
        print("=" * 90)
        print(f"Product URL: {self.product_url}")
        print(f"Test started at: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        try:
            self.setup_driver(headless=False)
            
            # Run all tests
            self.test_page_load()
            self.test_add_to_cart_button_exists()
            self.test_shopping_cart_icon_rendered()
            self.test_icon_color()
            self.test_button_clickable()
            self.test_mobile_view()
            self.test_desktop_view()
            self.test_wishlist_button()
            self.test_screenshot()
            
        except Exception as e:
            self.log_test("Test suite execution", False, str(e))
        finally:
            if self.driver:
                time.sleep(1)
                self.driver.quit()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 90)
        print("TEST SUMMARY")
        print("=" * 90)
        
        for detail in self.test_results["details"]:
            print(detail)
        
        print("\n" + "-" * 90)
        print(f"Total Tests: {self.test_results['total']}")
        print(f"Passed: {self.test_results['passed']} ✓")
        print(f"Failed: {self.test_results['failed']} ✗")
        
        if self.test_results["failed"] == 0:
            print("\n🎉 ALL TESTS PASSED! The Add to Cart icon is properly implemented.")
        else:
            print(f"\n⚠️  {self.test_results['failed']} test(s) failed. Please review the issues above.")
        
        print("=" * 90 + "\n")
        
        return self.test_results["failed"] == 0

if __name__ == "__main__":
    test_suite = ShoppingCartIconTest()
    success = test_suite.run_all_tests()
    sys.exit(0 if success else 1)
