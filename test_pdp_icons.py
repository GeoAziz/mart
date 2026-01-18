#!/usr/bin/env python3
"""
Selenium script to verify Add to Cart and Wishlist icons on Product Details Page
"""

import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

def test_pdp_icons():
    """Test if Add to Cart and Wishlist icons are visible on PDP"""
    
    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-notifications")
    # Uncomment to run headless
    # chrome_options.add_argument("--headless")
    
    driver = None
    try:
        print("=" * 80)
        print("SELENIUM TEST: Product Details Page Icons Verification")
        print("=" * 80)
        
        # Initialize WebDriver
        print("\n[1/6] Initializing WebDriver...")
        driver = webdriver.Chrome(options=chrome_options)
        
        # Navigate to product page
        print("[2/6] Navigating to product page...")
        product_url = "http://localhost:3000/products/KRmdS9LCeZvURKx6NbvI"
        driver.get(product_url)
        
        # Wait for page to load
        print("[3/6] Waiting for page to load (15s timeout)...")
        wait = WebDriverWait(driver, 15)
        wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "button")))
        
        # Take screenshot of page
        time.sleep(2)
        driver.save_screenshot("/tmp/pdp_full_page.png")
        print("    ✓ Screenshot saved: /tmp/pdp_full_page.png")
        
        # Test 1: Find Add to Cart button with ShoppingCart icon
        print("\n[4/6] Looking for 'Add to Cart' button with shopping cart icon...")
        try:
            # Look for button containing ShoppingCart icon (SVG with aria-label or title)
            cart_buttons = driver.find_elements(By.XPATH, "//button[contains(@aria-label, 'Add to Cart') or @title='Add to Cart']")
            
            if cart_buttons:
                for i, btn in enumerate(cart_buttons):
                    is_visible = btn.is_displayed()
                    is_enabled = not btn.get_attribute("disabled")
                    print(f"    ✓ Found 'Add to Cart' button #{i+1}")
                    print(f"      - Visible: {is_visible}")
                    print(f"      - Enabled: {is_enabled}")
                    print(f"      - Text: {btn.text}")
                    print(f"      - Classes: {btn.get_attribute('class')}")
                    
                    # Try to find SVG icon inside
                    svg_icons = btn.find_elements(By.TAG_NAME, "svg")
                    if svg_icons:
                        print(f"      - Contains {len(svg_icons)} SVG icon(s)")
            else:
                print("    ✗ No 'Add to Cart' button found by aria-label")
                # Try alternate selector
                all_buttons = driver.find_elements(By.TAG_NAME, "button")
                print(f"    Total buttons on page: {len(all_buttons)}")
                for i, btn in enumerate(all_buttons[:10]):
                    print(f"      Button {i}: {btn.text[:50] if btn.text else '(no text)'}")
        except Exception as e:
            print(f"    ✗ Error finding Add to Cart: {e}")
        
        # Test 2: Find Wishlist/Heart button
        print("\n[5/6] Looking for 'Add to Wishlist' button with heart icon...")
        try:
            wishlist_buttons = driver.find_elements(By.XPATH, "//button[contains(@aria-label, 'Wishlist') or contains(@title, 'Wishlist')]")
            
            if wishlist_buttons:
                for i, btn in enumerate(wishlist_buttons):
                    is_visible = btn.is_displayed()
                    is_enabled = not btn.get_attribute("disabled")
                    print(f"    ✓ Found Wishlist button #{i+1}")
                    print(f"      - Visible: {is_visible}")
                    print(f"      - Enabled: {is_enabled}")
                    print(f"      - Classes: {btn.get_attribute('class')}")
                    
                    # Check for SVG
                    svg_icons = btn.find_elements(By.TAG_NAME, "svg")
                    if svg_icons:
                        print(f"      - Contains {len(svg_icons)} SVG icon(s)")
            else:
                print("    ✗ No Wishlist button found by aria-label")
        except Exception as e:
            print(f"    ✗ Error finding Wishlist: {e}")
        
        # Test 3: Check HTML structure
        print("\n[6/6] Checking HTML structure for buttons...")
        try:
            # Get all buttons in the product info section
            body_html = driver.find_element(By.TAG_NAME, "body").get_attribute("innerHTML")
            
            # Check for shopping cart icon reference
            if "ShoppingCart" in body_html or "shopping-cart" in body_html.lower():
                print("    ✓ ShoppingCart icon reference found in HTML")
            else:
                print("    ℹ ShoppingCart icon reference not found - checking for SVG elements...")
            
            # Check for heart icon reference
            if "Heart" in body_html or "heart" in body_html.lower():
                print("    ✓ Heart icon reference found in HTML")
            else:
                print("    ℹ Heart icon reference not found in HTML")
            
            # Find all visible buttons
            visible_buttons = driver.find_elements(By.CSS_SELECTOR, "button:not([style*='display: none'])")
            print(f"    Total visible buttons: {len(visible_buttons)}")
        except Exception as e:
            print(f"    ✗ Error checking structure: {e}")
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST COMPLETE")
        print("=" * 80)
        print("\nIf icons are not visible:")
        print("1. Check if ShoppingCart and Heart icons are imported from lucide-react")
        print("2. Verify button elements have proper classes and are not hidden")
        print("3. Check browser console for any JavaScript errors")
        print("4. Verify CSS is loading correctly (check Network tab)")
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        if driver:
            print("\nClosing WebDriver...")
            time.sleep(2)
            driver.quit()
    
    return True

if __name__ == "__main__":
    success = test_pdp_icons()
    sys.exit(0 if success else 1)
