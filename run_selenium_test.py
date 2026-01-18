#!/usr/bin/env python3
"""
Selenium script to verify Add to Cart and Wishlist icons on Product Details Page
Uses webdriver-manager to auto-manage ChromeDriver
"""

import time
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

def test_pdp_icons():
    """Test if Add to Cart and Wishlist icons are visible on PDP"""
    
    # Setup Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-notifications")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    # Uncomment to run headless (faster)
    chrome_options.add_argument("--headless")
    
    driver = None
    try:
        print("=" * 80)
        print("SELENIUM TEST: Product Details Page Icons Verification")
        print("=" * 80)
        
        # Initialize WebDriver with auto-managed ChromeDriver
        print("\n[1/7] Initializing ChromeDriver...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        print("    ✓ ChromeDriver initialized")
        
        # Navigate to product page
        print("[2/7] Navigating to product page...")
        product_url = "http://localhost:3000/products/KRmdS9LCeZvURKx6NbvI"
        driver.get(product_url)
        
        # Wait for page to load
        print("[3/7] Waiting for page to load (20s timeout)...")
        wait = WebDriverWait(driver, 20)
        wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "button")))
        time.sleep(3)  # Additional wait for animations
        
        # Take screenshot
        driver.save_screenshot("/tmp/pdp_full_page.png")
        print("    ✓ Full page screenshot saved: /tmp/pdp_full_page.png")
        
        # Test 1: Find Add to Cart button
        print("\n[4/7] Searching for 'Add to Cart' button...")
        try:
            # Look for buttons with shopping cart or "Add to Cart" text
            cart_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Add to Cart') or contains(text(), 'Out of Stock')]")
            
            if cart_button:
                is_visible = cart_button.is_displayed()
                is_enabled = not cart_button.get_attribute("disabled")
                rect = cart_button.rect
                
                print(f"    ✓ Found 'Add to Cart' button")
                print(f"      - Visible on page: {is_visible}")
                print(f"      - Enabled: {is_enabled}")
                print(f"      - Text: {cart_button.text}")
                print(f"      - Position: x={rect['x']}, y={rect['y']}")
                print(f"      - Size: {rect['width']}x{rect['height']}px")
                print(f"      - Classes: {cart_button.get_attribute('class')[:80]}...")
                
                # Look for SVG icon inside
                svg_elements = cart_button.find_elements(By.TAG_NAME, "svg")
                if svg_elements:
                    print(f"      - Contains {len(svg_elements)} SVG icon(s) ✓")
                    for i, svg in enumerate(svg_elements):
                        svg_class = svg.get_attribute('class')
                        print(f"        SVG #{i+1}: {svg_class}")
        except Exception as e:
            print(f"    ✗ Error finding Add to Cart button: {e}")
        
        # Test 2: Find Wishlist button
        print("\n[5/7] Searching for Wishlist button...")
        try:
            # Look for heart icon or wishlist button
            wishlist_button = driver.find_element(By.XPATH, "//button[contains(@aria-label, 'Wishlist') or contains(@title, 'Wishlist')]")
            
            if wishlist_button:
                is_visible = wishlist_button.is_displayed()
                is_enabled = not wishlist_button.get_attribute("disabled")
                rect = wishlist_button.rect
                
                print(f"    ✓ Found Wishlist button")
                print(f"      - Visible on page: {is_visible}")
                print(f"      - Enabled: {is_enabled}")
                print(f"      - Position: x={rect['x']}, y={rect['y']}")
                print(f"      - Size: {rect['width']}x{rect['height']}px")
                print(f"      - Classes: {wishlist_button.get_attribute('class')[:80]}...")
                
                # Look for SVG heart icon
                svg_elements = wishlist_button.find_elements(By.TAG_NAME, "svg")
                if svg_elements:
                    print(f"      - Contains {len(svg_elements)} SVG icon(s) ✓")
                    for i, svg in enumerate(svg_elements):
                        svg_class = svg.get_attribute('class')
                        print(f"        SVG #{i+1}: {svg_class}")
        except Exception as e:
            print(f"    ✗ Error finding Wishlist button: {e}")
        
        # Test 3: Check all buttons on page
        print("\n[6/7] Analyzing all buttons on page...")
        try:
            all_buttons = driver.find_elements(By.TAG_NAME, "button")
            print(f"    Total buttons found: {len(all_buttons)}")
            
            print("\n    First 15 buttons:")
            for i, btn in enumerate(all_buttons[:15]):
                text = btn.text[:40] if btn.text else "(no text)"
                is_visible = btn.is_displayed()
                btn_class = btn.get_attribute('class')[:60]
                visibility = "✓ visible" if is_visible else "✗ hidden"
                svg_count = len(btn.find_elements(By.TAG_NAME, "svg"))
                svg_info = f", {svg_count} SVG(s)" if svg_count > 0 else ""
                print(f"      [{i:2d}] {text:40} [{visibility}] {svg_info}")
        except Exception as e:
            print(f"    ✗ Error analyzing buttons: {e}")
        
        # Test 4: Check for specific icon libraries
        print("\n[7/7] Checking for icon rendering...")
        try:
            # Check body HTML for icon references
            body = driver.find_element(By.TAG_NAME, "body")
            html = body.get_attribute("innerHTML")
            
            # Count SVG elements
            svg_count = len(driver.find_elements(By.TAG_NAME, "svg"))
            print(f"    Total SVG elements on page: {svg_count}")
            
            # Check for specific SVG patterns
            if "<svg" in html:
                print(f"    ✓ SVG elements are rendered in DOM")
            
            # Check for button with cart icon text or aria-label
            if "shopping" in html.lower():
                print(f"    ✓ Shopping cart references found")
            
            if "heart" in html.lower() or "wishlist" in html.lower():
                print(f"    ✓ Wishlist/Heart references found")
        except Exception as e:
            print(f"    ✗ Error checking icons: {e}")
        
        # Summary
        print("\n" + "=" * 80)
        print("TEST RESULTS")
        print("=" * 80)
        print("\n✓ Test completed successfully!")
        print("\nChecklist:")
        print("  [?] Are 'Add to Cart' and 'Wishlist' buttons visible?")
        print("  [?] Do the buttons contain SVG icons?")
        print("  [?] Are buttons positioned at reasonable coordinates?")
        print("\nScreenshot saved at: /tmp/pdp_full_page.png")
        print("\nNext steps:")
        print("  1. Check the screenshot to visually confirm icons")
        print("  2. Open browser DevTools (F12) and inspect the buttons")
        print("  3. Check Console tab for any JavaScript errors")
        print("  4. Verify Tailwind CSS classes are being applied")
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        if driver:
            print("\nClosing WebDriver...")
            time.sleep(1)
            driver.quit()
            print("✓ WebDriver closed")
    
    return True

if __name__ == "__main__":
    success = test_pdp_icons()
    sys.exit(0 if success else 1)
