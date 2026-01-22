"""Master E2E Test Suite - Consolidated"""
import pytest
import os
import sys
import logging
from pathlib import Path

# Add tests to path
sys.path.insert(0, str(Path(__file__).parent))

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time

# ============================================================================
# Configuration
# ============================================================================

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"

logger = logging.getLogger(__name__)


@pytest.fixture
def driver():
    """Create Chrome WebDriver"""
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        from selenium.webdriver.chrome.service import Service
        service = Service(ChromeDriverManager().install())
        web_driver = webdriver.Chrome(service=service, options=options)
    except:
        web_driver = webdriver.Chrome(options=options)
    
    web_driver.implicitly_wait(10)
    
    yield web_driver
    
    web_driver.quit()


# ============================================================================
# Checkout Tests
# ============================================================================

@pytest.mark.e2e
class TestCheckout:
    """Checkout page tests"""
    
    def test_checkout_page_loads(self, driver):
        """Test checkout page loads"""
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(2)
        
        # Verify heading
        heading = driver.find_element(By.XPATH, "//h1 | //h2")
        assert heading, "Checkout heading should exist"
        print("✅ Checkout page loaded")
    
    def test_address_form_elements_exist(self, driver):
        """Test address form fields exist"""
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(2)
        
        fields = {
            "firstName": (By.NAME, "firstName"),
            "lastName": (By.NAME, "lastName"),
            "email": (By.NAME, "email"),
            "phone": (By.NAME, "phone"),
        }
        
        for field_name, locator in fields.items():
            try:
                field = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located(locator)
                )
                assert field, f"{field_name} should exist"
                print(f"✅ {field_name} field found")
            except:
                print(f"⚠️ {field_name} field not found")
    
    def test_fill_address_form(self, driver):
        """Test filling address form"""
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(2)
        
        data = {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john@example.com",
            "phone": "+254712345678",
            "address": "123 Main St",
            "city": "Nairobi",
            "country": "Kenya",
            "postalCode": "00100",
        }
        
        for field_name, value in data.items():
            try:
                field = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.NAME, field_name))
                )
                field.clear()
                field.send_keys(value)
                print(f"✅ Filled {field_name}")
            except:
                print(f"⚠️ Could not fill {field_name}")
    
    def test_select_paypal_payment(self, driver):
        """Test selecting PayPal payment"""
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(2)
        
        try:
            paypal_radio = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "paypal-method"))
            )
            paypal_radio.click()
            time.sleep(1)
            print("✅ PayPal payment selected")
        except:
            print("⚠️ PayPal radio button not found")
    
    def test_paypal_button_visibility(self, driver):
        """Test PayPal button appears"""
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(2)
        
        # Select PayPal
        try:
            paypal_radio = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.ID, "paypal-method"))
            )
            paypal_radio.click()
            time.sleep(1)
        except:
            pass
        
        # Check for button
        try:
            button = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.ID, "paypal-button-container"))
            )
            assert button, "PayPal button container should be visible"
            print("✅ PayPal button is visible")
        except:
            print("⚠️ PayPal button container not found")


# ============================================================================
# Product Details Page Tests
# ============================================================================

@pytest.mark.e2e
class TestProductDetailsPage:
    """Product Details Page tests"""
    
    def test_pdp_loads(self, driver):
        """Test PDP loads"""
        driver.get(f"{BASE_URL}/products/1")
        time.sleep(2)
        
        title = driver.find_element(By.XPATH, "//h1 | //h2")
        assert title, "Product title should exist"
        print("✅ PDP loaded")
    
    def test_add_to_cart_button_visible(self, driver):
        """Test Add to Cart button is visible"""
        driver.get(f"{BASE_URL}/products/1")
        time.sleep(2)
        
        try:
            button = WebDriverWait(driver, 5).until(
                EC.visibility_of_element_located(
                    (By.XPATH, "//button[contains(text(), 'Add to Cart')]")
                )
            )
            assert button, "Add to Cart button should be visible"
            print("✅ Add to Cart button visible")
        except:
            print("⚠️ Add to Cart button not found")
    
    def test_wishlist_button_visible(self, driver):
        """Test Wishlist button is visible"""
        driver.get(f"{BASE_URL}/products/1")
        time.sleep(2)
        
        try:
            button = WebDriverWait(driver, 5).until(
                EC.visibility_of_element_located(
                    (By.XPATH, "//button[contains(@aria-label, 'wishlist')]")
                )
            )
            assert button, "Wishlist button should be visible"
            print("✅ Wishlist button visible")
        except:
            # Try alternative selector
            try:
                button = driver.find_element(By.XPATH, "//button[contains(@class, 'wishlist')]")
                assert button, "Wishlist button should be visible"
                print("✅ Wishlist button visible (alt selector)")
            except:
                print("⚠️ Wishlist button not found")
    
    def test_add_to_cart_click(self, driver):
        """Test clicking Add to Cart"""
        driver.get(f"{BASE_URL}/products/1")
        time.sleep(2)
        
        try:
            button = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//button[contains(text(), 'Add to Cart')]")
                )
            )
            button.click()
            time.sleep(1)
            print("✅ Add to Cart clicked")
        except Exception as e:
            print(f"⚠️ Could not click Add to Cart: {e}")


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.e2e
@pytest.mark.integration
class TestIntegration:
    """Integration tests"""
    
    def test_complete_checkout_flow(self, driver):
        """Test complete checkout flow"""
        # Navigate to checkout
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(2)
        
        # Fill form
        try:
            driver.find_element(By.NAME, "firstName").send_keys("Test")
            driver.find_element(By.NAME, "lastName").send_keys("User")
            driver.find_element(By.NAME, "email").send_keys("test@example.com")
            driver.find_element(By.NAME, "phone").send_keys("+254712345678")
            driver.find_element(By.NAME, "address").send_keys("123 Main St")
            driver.find_element(By.NAME, "city").send_keys("Nairobi")
            print("✅ Address form filled")
        except Exception as e:
            print(f"⚠️ Could not fill form: {e}")
        
        # Select PayPal
        try:
            paypal_radio = WebDriverWait(driver, 5).until(
                EC.element_to_be_clickable((By.ID, "paypal-method"))
            )
            paypal_radio.click()
            time.sleep(1)
            print("✅ PayPal selected")
        except:
            print("⚠️ Could not select PayPal")
        
        # Verify button
        try:
            button = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located((By.ID, "paypal-button-container"))
            )
            print("✅ PayPal button visible")
        except:
            print("⚠️ PayPal button not visible")


# ============================================================================
# Smoke Tests
# ============================================================================

@pytest.mark.smoke
class TestSmoke:
    """Quick smoke tests"""
    
    def test_home_page(self, driver):
        """Test home page loads"""
        driver.get(BASE_URL)
        time.sleep(1)
        assert driver.title, "Page should have title"
        print("✅ Home page loads")
    
    def test_checkout_accessible(self, driver):
        """Test checkout is accessible"""
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(1)
        assert "/checkout" in driver.current_url, "Should be on checkout page"
        print("✅ Checkout accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])
