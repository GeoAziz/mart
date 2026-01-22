# 🚀 ZilaCart E2E Test Suite

**Complete end-to-end automation testing all user types with backend validation.**

## 📦 What's Here

### Main Test
- **`test_complete_user_journeys.py`** (581 lines)
  - Master consolidated E2E test
  - Covers: Landing → Customer → Vendor → Admin
  - Backend validation included
  - ~80 minute execution

### Validation Layer
- **`utils/backend_validator.py`** (280+ lines)
  - Firestore state validation
  - REST API validation
  - User role verification
  - Cart & wishlist validation
  - Order & stock validation

### Utilities
- **`utils/logger.py`** - Centralized logging
- **`utils/wait_helper.py`** - Smart wait strategies
- **`utils/screenshot.py`** - Automatic screenshots
- **`utils/browser_helper.py`** - WebDriver management
- **`utils/api_client.py`** - API calls

### Configuration
- **`config.py`** - Test configuration
- **`base_test.py`** - Base test class
- **`conftest.py`** - Pytest fixtures
- **`requirements_e2e.txt`** - Dependencies

### Scripts
- **`preflight_check.py`** - Pre-test verification
- **`../run_e2e_test.sh`** - One-command runner
- **`../COMPLETE_E2E_EXECUTION.sh`** - Full docs

---

## 🚀 Quick Start

### 1. Pre-Flight Check
```bash
python tests/preflight_check.py
```

### 2. Install Dependencies
```bash
pip install -r tests/requirements_e2e.txt
```

### 3. Start Server (separate terminal)
```bash
npm run dev
```

### 4. Run Test
```bash
bash run_e2e_test.sh
```

OR:
```bash
python -m pytest tests/test_complete_user_journeys.py::TestCompleteUserJourneys::test_complete_journey_all_users -v -s
```

---

## 📊 Test Flow

```
PHASE 0: Bootstrap (5 min)
  ├─ Server health check
  ├─ Firebase connectivity
  └─ Dependency validation

PHASE 1: Landing Page (10 min)
  ├─ Navigate to /
  ├─ Check header & nav
  ├─ Test 3 viewports (desktop, tablet, mobile)
  └─ Screenshot: landing_page.png

PHASE 2: Customer Journey (25 min)
  ├─ Login as customer1@zilacart.com
  ├─ Browse products
  ├─ View product details
  ├─ Add to cart → BACKEND VALIDATION
  ├─ Add to wishlist → BACKEND VALIDATION
  ├─ View cart
  ├─ Checkout form
  └─ Screenshot: customer_journey_complete.png

PHASE 3: Vendor Journey (20 min)
  ├─ Login as vendor1@zilacart.com
  ├─ View vendor dashboard
  └─ Screenshot: vendor_dashboard.png

PHASE 4: Admin Journey (15 min)
  ├─ Login as admin@zilacart.com
  ├─ View admin dashboard
  └─ Screenshot: admin_dashboard.png

PHASE 5: Cleanup (5 min)
  ├─ Console error check
  ├─ Report generation
  └─ Success summary
```

---

## 🎯 Success Criteria

✅ All phases complete without errors  
✅ All 3 user types login successfully  
✅ Firestore state validates after each action  
✅ No console errors during execution  
✅ Screenshots generated  
✅ JSON report created  

---

## 📸 Output Artifacts

```
tests/reports/
├── e2e_report_<timestamp>.json          # Complete test log
├── screenshots/
│   ├── landing_page_<ts>.png
│   ├── pdp_view_<ts>.png
│   ├── product_added_to_cart_<ts>.png
│   ├── cart_view_<ts>.png
│   ├── checkout_form_filled_<ts>.png
│   ├── customer_journey_complete_<ts>.png
│   ├── vendor_logged_in_<ts>.png
│   ├── vendor_dashboard_<ts>.png
│   ├── admin_logged_in_<ts>.png
│   └── admin_dashboard_<ts>.png
```

---

## 🔐 Test Credentials

All built-in - no setup needed:

| Role | Email | Password |
|------|-------|----------|
| Customer | customer1@zilacart.com | password123 |
| Vendor | vendor1@zilacart.com | password123 |
| Admin | admin@zilacart.com | password123 |

---

## ⚡ Execution Time

- **Total:** ~80 minutes (includes all phases)
- **Can optimize to:** ~40 minutes (skip screenshots, headless mode)

---

## 🔧 Environment Variables

```bash
BASE_URL=http://localhost:3000
HEADLESS=false              # Set to true for CI/CD
```

---

## 📝 What Gets Validated

### UI Validation
- ✅ Page loads & elements visible
- ✅ Navigation works
- ✅ Forms fillable
- ✅ Buttons clickable
- ✅ Redirects correct

### Backend Validation
- ✅ User profiles correct in Firestore
- ✅ User roles assigned properly
- ✅ Cart items persisted in database
- ✅ Wishlist items persisted in database
- ✅ Product stock valid
- ✅ Orders created atomically
- ✅ No orphaned data

### Responsiveness
- ✅ Desktop (1920x1080) layout works
- ✅ Tablet (1024x768) layout works
- ✅ Mobile (375x667) layout works

---

## 🚨 Troubleshooting

### "Server not running"
```bash
npm run dev
```

### "Element not found"
- Check screenshot in `tests/reports/screenshots/`
- Update XPath in test if UI changed
- Increase timeout (already 15s default)

### "Firestore validation failed"
- **CRITICAL** - backend code issue
- Check Firebase console
- Debug application

### "Timeout"
- Network slow
- Increase wait timeout
- Usually passes on retry

---

## 📚 Documentation

- **`E2E_MISSION_COMPLETE.md`** - Full mission details
- **`ACTION_PLAN_SHIPPING.md`** - Shipping checklist
- **`COMPLETE_E2E_EXECUTION.sh`** - Execution guide

---

## 🎯 Ready to Ship

When test passes 3x in a row:
- ✅ All user journeys validated
- ✅ Backend state correct
- ✅ UI/UX working
- ✅ No blockers

**You're ready to deploy.** 🚀

---

**Test built for shipping. Zero fluff. Pure execution.** ✅
