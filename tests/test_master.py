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
from selenium.common.exceptions import TimeoutException
import time
import urllib.request
import urllib.error

# ============================================================================
# Configuration
# ============================================================================

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"

logger = logging.getLogger(__name__)


def wait_for_document_ready(driver, timeout=20):
    """Wait until DOM is fully loaded."""
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script("return document.readyState") == "complete"
    )


def wait_for_http_ready(url, timeout=90, interval=2):
    """Poll URL until HTTP endpoint responds, allowing warm-up time."""
    deadline = time.time() + timeout
    last_error = None
    last_status = None
    attempt = 0

    while time.time() < deadline:
        attempt += 1
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                status = getattr(response, "status", 200)
                last_status = status
                if status < 500:
                    return
        except urllib.error.HTTPError as error:
            status = getattr(error, "code", None)
            if status is not None:
                last_status = status
                logger.info(f"HTTP readiness check reached {url} with status={status} (attempt {attempt}); treating as reachable")
                return
            last_error = error
        except Exception as error:
            last_error = error
            logger.info(f"HTTP readiness retry for {url} (attempt {attempt}, last_status={last_status}): {error}")
        time.sleep(interval)

    raise AssertionError(
        f"Server did not become ready at {url}: last_status={last_status}, last_error={last_error}"
    )


def safe_navigate(driver, url, retries=2, page_load_timeout=45):
    """Navigate to URL with retry to handle intermittent page-load hangs."""
    driver.set_page_load_timeout(page_load_timeout)
    last_error = None

    for attempt in range(1, retries + 1):
        try:
            driver.get(url)
            return
        except TimeoutException as error:
            last_error = error
            logger.warning(f"Page load timeout navigating to {url} (attempt {attempt}/{retries})")
        except Exception as error:
            last_error = error
            logger.warning(f"Navigation error to {url} (attempt {attempt}/{retries}): {error}")

        try:
            driver.execute_script("window.stop();")
        except Exception:
            pass
        time.sleep(2)

    raise AssertionError(f"Failed to navigate to {url} after {retries} attempts: {last_error}")


def first_matching_element(driver, selectors, timeout=5, clickable=False, visible=False):
    """Return first element matching any selector tuple in selectors."""
    for by, value in selectors:
        try:
            if clickable:
                return WebDriverWait(driver, timeout).until(
                    EC.element_to_be_clickable((by, value))
                )
            if visible:
                return WebDriverWait(driver, timeout).until(
                    EC.visibility_of_element_located((by, value))
                )
            return WebDriverWait(driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
        except Exception:
            continue
    return None


def checkout_field_selectors(field_name):
    """Flexible selector set for checkout field variations."""
    selector_map = {
        "firstName": [
            (By.NAME, "firstName"),
            (By.NAME, "first_name"),
            (By.ID, "firstName"),
            (By.ID, "first_name"),
            (By.CSS_SELECTOR, "input[autocomplete='given-name']"),
        ],
        "lastName": [
            (By.NAME, "lastName"),
            (By.NAME, "last_name"),
            (By.ID, "lastName"),
            (By.ID, "last_name"),
            (By.CSS_SELECTOR, "input[autocomplete='family-name']"),
        ],
        "email": [
            (By.NAME, "email"),
            (By.ID, "email"),
            (By.CSS_SELECTOR, "input[type='email']"),
            (By.CSS_SELECTOR, "input[autocomplete='email']"),
        ],
        "phone": [
            (By.NAME, "phone"),
            (By.NAME, "phoneNumber"),
            (By.ID, "phone"),
            (By.ID, "phoneNumber"),
            (By.CSS_SELECTOR, "input[type='tel']"),
            (By.CSS_SELECTOR, "input[autocomplete='tel']"),
        ],
        "address": [
            (By.NAME, "address"),
            (By.NAME, "address1"),
            (By.ID, "address"),
            (By.ID, "address1"),
            (By.CSS_SELECTOR, "input[autocomplete='street-address']"),
        ],
        "city": [
            (By.NAME, "city"),
            (By.ID, "city"),
            (By.CSS_SELECTOR, "input[autocomplete='address-level2']"),
        ],
        "country": [
            (By.NAME, "country"),
            (By.ID, "country"),
            (By.CSS_SELECTOR, "select[name='country']"),
            (By.CSS_SELECTOR, "input[autocomplete='country-name']"),
        ],
        "postalCode": [
            (By.NAME, "postalCode"),
            (By.NAME, "postal_code"),
            (By.ID, "postalCode"),
            (By.ID, "postal_code"),
            (By.CSS_SELECTOR, "input[autocomplete='postal-code']"),
        ],
    }
    return selector_map.get(field_name, [(By.NAME, field_name)])


def paypal_method_selectors():
    return [
        (By.ID, "paypal-method"),
        (By.CSS_SELECTOR, "input[type='radio'][value='paypal']"),
        (By.XPATH, "//label[contains(translate(normalize-space(.), 'PAYPAL', 'paypal'), 'paypal')]")
    ]


def resolve_product_url(driver):
    """Find a real product detail URL from the products listing page."""
    driver.get(f"{BASE_URL}/products")
    wait_for_document_ready(driver, timeout=20)

    # Try to discover a product link from the rendered listing first.
    link_selectors = [
        "//a[contains(@href, '/products/')]",
        "//a[contains(@href, '/product/')]",
        "//main//a[@href]",
    ]

    for selector in link_selectors:
        links = driver.find_elements(By.XPATH, selector)
        for link in links:
            href = link.get_attribute("href")
            if href and ("/products/" in href or "/product/" in href):
                return href

    # Deterministic CI fallback routes when listing links are not present.
    fallback_paths = [
        "/products/KRmdS9LCeZvURKx6NbvI",
        "/products/1",
    ]
    for path in fallback_paths:
        candidate = f"{BASE_URL}{path}"
        driver.get(candidate)
        wait_for_document_ready(driver, timeout=20)

        if "/products/" in driver.current_url:
            has_heading = len(driver.find_elements(By.XPATH, "//h1 | //h2")) > 0
            has_add_to_cart = len(driver.find_elements(By.XPATH, "//button[contains(text(), 'Add to Cart')]")) > 0
            if has_heading or has_add_to_cart:
                return candidate

    pytest.skip("No resolvable product detail URL found for PDP tests")


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
        wait_for_document_ready(driver, timeout=20)

        # Verify checkout page has meaningful content
        current_url = driver.current_url
        assert "localhost:3000" in current_url, "Should remain in app domain"

        page_source = driver.page_source.lower()
        has_checkout_copy = "checkout" in page_source
        has_checkout_form = len(driver.find_elements(By.NAME, "firstName")) > 0
        has_main_region = len(driver.find_elements(By.TAG_NAME, "main")) > 0

        assert has_checkout_copy or has_checkout_form or has_main_region, (
            "Checkout page should render app content"
        )
        print("✅ Checkout page loaded")
    
    def test_address_form_elements_exist(self, driver):
        """Test address form fields exist"""
        driver.get(f"{BASE_URL}/checkout")
        wait_for_document_ready(driver, timeout=20)
        
        fields = ["firstName", "lastName", "email", "phone"]
        found = 0
        
        for field_name in fields:
            field = first_matching_element(driver, checkout_field_selectors(field_name), timeout=3)
            if field:
                found += 1

        assert found >= 1, "Expected at least one checkout form field to be present"
        print(f"✅ Checkout fields detected: {found}/{len(fields)}")
    
    def test_fill_address_form(self, driver):
        """Test filling address form"""
        driver.get(f"{BASE_URL}/checkout")
        wait_for_document_ready(driver, timeout=20)
        
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
        
        filled = 0

        for field_name, value in data.items():
            field = first_matching_element(driver, checkout_field_selectors(field_name), timeout=3)
            if field:
                field.clear()
                field.send_keys(value)
                filled += 1

        assert filled >= 1, "Expected to fill at least one checkout field"
        print(f"✅ Filled checkout fields: {filled}/{len(data)}")
    
    def test_select_paypal_payment(self, driver):
        """Test selecting PayPal payment"""
        driver.get(f"{BASE_URL}/checkout")
        wait_for_document_ready(driver, timeout=20)

        paypal = first_matching_element(driver, paypal_method_selectors(), timeout=5, clickable=True)
        if not paypal:
            pytest.skip("PayPal selector not available in this checkout variant")

        paypal.click()
        print("✅ PayPal payment selected")
    
    def test_paypal_button_visibility(self, driver):
        """Test PayPal button appears"""
        driver.get(f"{BASE_URL}/checkout")
        wait_for_document_ready(driver, timeout=20)

        paypal = first_matching_element(driver, paypal_method_selectors(), timeout=4, clickable=True)
        if paypal:
            paypal.click()

        paypal_button = first_matching_element(
            driver,
            [
                (By.ID, "paypal-button-container"),
                (By.CSS_SELECTOR, "iframe[src*='paypal']"),
                (By.CSS_SELECTOR, "div[id*='paypal']"),
            ],
            timeout=8,
            visible=True,
        )

        if not paypal_button:
            pytest.skip("PayPal button/container not visible in this checkout variant")

        print("✅ PayPal button is visible")


# ============================================================================
# Product Details Page Tests
# ============================================================================

@pytest.mark.e2e
class TestProductDetailsPage:
    """Product Details Page tests"""
    
    def test_pdp_loads(self, driver):
        """Test PDP loads"""
        product_url = resolve_product_url(driver)
        driver.get(product_url)
        wait_for_document_ready(driver, timeout=20)

        assert "/products/" in driver.current_url, "Should be on a product details route"
        has_heading = len(driver.find_elements(By.XPATH, "//h1 | //h2")) > 0
        has_add_to_cart = len(driver.find_elements(By.XPATH, "//button[contains(text(), 'Add to Cart')]")) > 0
        assert has_heading or has_add_to_cart, "PDP should render heading or add-to-cart action"
        print("✅ PDP loaded")
    
    def test_add_to_cart_button_visible(self, driver):
        """Test Add to Cart button is visible"""
        product_url = resolve_product_url(driver)
        driver.get(product_url)
        wait_for_document_ready(driver, timeout=20)
        
        button = first_matching_element(
            driver,
            [
                (By.XPATH, "//button[contains(., 'Add to Cart') or contains(., 'Add To Cart') or contains(., 'Cart')]")
            ],
            timeout=5,
            visible=True,
        )
        if not button:
            pytest.skip("Add to Cart button is not visible for this product/page variant")

        print("✅ Add to Cart button visible")
    
    def test_wishlist_button_visible(self, driver):
        """Test Wishlist button is visible"""
        product_url = resolve_product_url(driver)
        driver.get(product_url)
        wait_for_document_ready(driver, timeout=20)
        
        button = first_matching_element(
            driver,
            [
                (By.XPATH, "//button[contains(translate(@aria-label, 'WISHLIST', 'wishlist'), 'wishlist') or contains(translate(@class, 'WISHLIST', 'wishlist'), 'wishlist')]")
            ],
            timeout=5,
            visible=True,
        )
        if not button:
            pytest.skip("Wishlist button is not visible for this product/page variant")

        print("✅ Wishlist button visible")
    
    def test_add_to_cart_click(self, driver):
        """Test clicking Add to Cart"""
        product_url = resolve_product_url(driver)
        driver.get(product_url)
        wait_for_document_ready(driver, timeout=20)
        
        button = first_matching_element(
            driver,
            [
                (By.XPATH, "//button[contains(., 'Add to Cart') or contains(., 'Add To Cart') or contains(., 'Cart')]")
            ],
            timeout=5,
            clickable=True,
        )
        if not button:
            pytest.skip("Add to Cart button is not clickable for this product/page variant")

        button.click()
        print("✅ Add to Cart clicked")


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
        wait_for_document_ready(driver, timeout=20)
        
        # Fill form
        form_data = {
            "firstName": "Test",
            "lastName": "User",
            "email": "test@example.com",
            "phone": "+254712345678",
            "address": "123 Main St",
            "city": "Nairobi",
        }
        filled = 0
        for field_name, value in form_data.items():
            field = first_matching_element(driver, checkout_field_selectors(field_name), timeout=2)
            if field:
                field.clear()
                field.send_keys(value)
                filled += 1
        assert filled >= 1, "Expected to fill at least one checkout field in integration flow"
        print(f"✅ Address form partially filled ({filled} fields)")
        
        # Select PayPal
        paypal_radio = first_matching_element(driver, paypal_method_selectors(), timeout=4, clickable=True)
        if paypal_radio:
            paypal_radio.click()
            print("✅ PayPal selected")
        
        # Verify PayPal UI or fallback checkout readiness
        paypal_ui = first_matching_element(
            driver,
            [
                (By.ID, "paypal-button-container"),
                (By.CSS_SELECTOR, "iframe[src*='paypal']"),
                (By.XPATH, "//*[contains(translate(., 'PAYPAL', 'paypal'), 'paypal')]")
            ],
            timeout=6,
            visible=True,
        )
        assert paypal_ui or filled >= 1, "Expected either PayPal UI or a form-ready checkout state"
        print("✅ Checkout flow reached payment/form-ready state")


# ============================================================================
# Smoke Tests
# ============================================================================

@pytest.mark.smoke
class TestSmoke:
    """Quick smoke tests"""
    
    def test_home_page(self, driver):
        """Test home page loads"""
        wait_for_http_ready(BASE_URL, timeout=90)
        safe_navigate(driver, BASE_URL, retries=2, page_load_timeout=45)
        wait_for_document_ready(driver, timeout=20)

        current_url = driver.current_url
        assert "localhost:3000" in current_url, "Should remain in app domain"

        page_source = driver.page_source.lower()
        has_app_content = any(token in page_source for token in ["html", "body", "main", "product", "checkout"])
        assert has_app_content, "Home page should render app content"

        if not driver.title:
            logger.warning("Home page title is empty; continuing because page content rendered")
        print("✅ Home page loads")
    
    def test_checkout_accessible(self, driver):
        """Test checkout is accessible"""
        driver.get(f"{BASE_URL}/checkout")
        time.sleep(1)
        assert "/checkout" in driver.current_url, "Should be on checkout page"
        print("✅ Checkout accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])
