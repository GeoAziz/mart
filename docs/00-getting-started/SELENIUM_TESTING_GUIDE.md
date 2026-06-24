# PayPal Selenium Testing Guide

## 🎯 What This Test Does

The Selenium test automates the complete PayPal payment flow:

1. ✅ Navigate to products page
2. ✅ Add product to cart
3. ✅ Go to checkout
4. ✅ Fill delivery address
5. ✅ Select PayPal payment method
6. ✅ View order summary
7. ✅ **Verify PayPal button appears** ← Key test point
8. ✅ Click PayPal button
9. ✅ **Verify PayPal modal opens** ← Key test point

## 📦 Setup

### Step 1: Install Dependencies

```bash
# Install Selenium and python-dotenv
pip install selenium python-dotenv

# Verify Selenium is installed
python -m pip show selenium
```

### Step 2: Install ChromeDriver

**Option A: Using system package manager**
```bash
# macOS
brew install chromedriver

# Ubuntu/Debian
sudo apt-get install chromium-chromedriver

# Windows
choco install chromedriver
```

**Option B: Download manually**
- Go to: https://chromedriver.chromium.org/
- Download version matching your Chrome version
- Add to PATH or specify in test

### Step 3: Prepare Test Credentials

Create or update `.env` file in project root:

```env
# Application URL
BASE_URL=http://localhost:3000

# PayPal Sandbox Test Credentials
# Get from: https://developer.paypal.com/dashboard/
# Under Accounts → Sandbox → Buyer/Seller account

# OPTION 1: If you have a test account
PAYPAL_TEST_EMAIL=sb-xxxxx@personal.example.com
PAYPAL_TEST_PASSWORD=your_sandbox_password

# OPTION 2: If you don't have test credentials
# Leave empty and you'll log in manually during test
# PAYPAL_TEST_EMAIL=
# PAYPAL_TEST_PASSWORD=
```

**How to find your PayPal Sandbox credentials:**

1. Go to: https://developer.paypal.com/dashboard/
2. Log in with your PayPal Developer account
3. In left menu, click "Apps & Credentials"
4. Make sure "Sandbox" tab is selected
5. Look for "Default Account" - that's the test buyer account
6. Click "Show" to see email and password

## 🚀 Running the Test

### Step 1: Start Dev Server

```bash
# In one terminal
npm run dev

# Wait for "✓ Ready" message
```

### Step 2: Run the Test

```bash
# In another terminal
python test_paypal_selenium.py
```

### Step 3: Watch the Test

The browser will:
1. Open automatically
2. Navigate to your app
3. Fill in form fields
4. Select PayPal
5. Click the button
6. Show you the results

**Do NOT close the browser** - let the test complete!

## 📊 Expected Output

### ✅ Success Output
```
============================================================
🧪 PayPal Payment Flow Test
============================================================

📍 Step 1: Navigating to products page...
✅ Products page loaded

📍 Step 2: Adding product to cart...
✅ Product added to cart

📍 Step 3: Navigating to checkout...
✅ Checkout page loaded

📍 Step 4: Filling delivery address...
  ✅ Full name entered
  ✅ Address entered
  ✅ City entered
  ✅ Phone entered
✅ Address submitted, moving to payment method

📍 Step 5: Selecting PayPal payment method...
✅ PayPal selected
✅ Moving to order summary

📍 Step 6: Verifying order summary...
✅ Order summary displayed

📍 Step 7: Waiting for PayPal buttons...
✅ PayPal button found and ready

📍 Step 8: Clicking PayPal button...
✅ PayPal button clicked
   Waiting for PayPal modal to open...
✅ PayPal iframe detected - Modal opened successfully!
✅ No console errors detected

📝 Manual Next Steps:
   1. The PayPal modal should now be open in the browser
   2. Log in with your PayPal sandbox test account
   3. Approve the payment

============================================================
✅ TEST PASSED - PayPal flow works!
============================================================
```

### ❌ Failure Output
```
❌ PayPal button not found

🔍 Debugging info:
   Current URL: http://localhost:3000/checkout
   Page title: Checkout - ZilaCart
   Found 0 iframes
```

## 🐛 Troubleshooting

### Issue: "chromedriver not found"
```bash
# Solution 1: Install globally
brew install chromedriver

# Solution 2: Specify path in test
# Edit test file and update:
service = Service('/path/to/chromedriver')
self.driver = webdriver.Chrome(service=service, options=options)
```

### Issue: "Chrome version mismatch"
```
Selenium version and Chrome version must match!

# Check Chrome version:
google-chrome --version  # Linux
chrome --version        # macOS

# Download matching chromedriver from:
https://chromedriver.chromium.org/downloads
```

### Issue: "Address element not found"
```
This means the checkout form structure changed.
Update the XPath selectors in test:

Current:
address_input = self.driver.find_element(By.NAME, "address")

Change to match your HTML:
address_input = self.driver.find_element(By.ID, "street-address")
```

### Issue: "PayPal button not found"
```
This is the KEY test - if this fails:

1. ✅ Check browser console (F12) for JavaScript errors
2. ✅ Verify NEXT_PUBLIC_PAYPAL_CLIENT_ID is set in .env
3. ✅ Check network tab for failed requests
4. ✅ Restart dev server: npm run dev
5. ✅ Try test again
```

### Issue: Test hangs on "Waiting for PayPal modal"
```
This is normal! 

Options:
1. Wait longer (PayPal API might be slow)
2. Check browser - is PayPal modal visible?
3. If visible, you can proceed manually
4. If not visible, check browser console errors
```

## 🔍 Manual Testing (Alternative)

If Selenium isn't working, test manually:

```bash
1. Start dev server: npm run dev
2. Open: http://localhost:3000/products
3. Add item to cart
4. Go to: http://localhost:3000/checkout
5. Fill address, select PayPal, review order
6. Click PayPal button
7. See if modal opens and stays open
8. Open F12 → Console to see any errors
```

## 📈 Test Results Interpretation

| Result | Meaning | Action |
|--------|---------|--------|
| ✅ TEST PASSED | PayPal flow works | No action needed |
| ❌ PayPal button not found | Component not rendering | Check console errors |
| ❌ Modal not opening | Modal click not working | Check JavaScript errors |
| ✅ Modal opens | Integration works | Try manual payment |
| ⚠️ Timeout on wait | API slow or down | Check PayPal status |

## 🔗 Useful Resources

- **Selenium Docs**: https://selenium.dev/documentation/
- **ChromeDriver**: https://chromedriver.chromium.org/
- **PayPal Sandbox**: https://developer.paypal.com/dashboard/
- **Python Selenium**: https://selenium-python.readthedocs.io/

## 📝 Common Selectors to Update

If test fails, check these selectors in your HTML:

```python
# Address form fields
By.NAME, "fullName"      # Update if ID or class changed
By.NAME, "address"
By.NAME, "city"
By.NAME, "phone"

# PayPal radio button
By.ID, "paypal"          # Update if ID changed

# Buttons
By.XPATH, "//button[contains(text(), 'Next')]"
```

## ✨ Next Steps

1. **Run the test**: `python test_paypal_selenium.py`
2. **Watch it execute**: See your app in action
3. **Check results**: Did PayPal button appear? Did modal open?
4. **Manual test**: If modal opens, complete a payment
5. **Verify order**: Check database for order creation

---

**Ready to verify PayPal integration?** Run the test now! 🚀
