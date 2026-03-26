# 🚀 E2E TEST QUICK REFERENCE

## ⚡ TL;DR - JUST RUN IT

```bash
# Step 1: Verify ready
python tests/preflight_check.py

# Step 2: Start server (separate terminal)
npm run dev

# Step 3: Run test
bash run_e2e_test.sh
```

**That's it.** Test runs. Reports generated. Screenshots captured.

---

## 📊 WHAT GETS TESTED

| Phase | Duration | What | Status Check |
|-------|----------|------|--------------|
| Bootstrap | 5 min | Server health, Firebase conn | Auto-check |
| Landing | 10 min | Home page, nav, responsive | Screenshots |
| Customer | 25 min | Login→Shop→Cart→Checkout | Firestore validation |
| Vendor | 20 min | Login→Dashboard | Accessible check |
| Admin | 15 min | Login→Dashboard | Accessible check |
| Cleanup | 5 min | Errors, reports, screenshots | Report generated |

**Total: ~80 minutes**

---

## 🎯 PASS/FAIL QUICK CHECK

### ✅ PASS When:
- All 3 users login successfully
- Add to cart works (appears in Firestore)
- Add to wishlist works (appears in Firestore)
- Vendor & Admin dashboards load
- No console errors
- Report generated with all logs
- Screenshots captured

### ❌ FAIL When:
- Any phase doesn't complete
- Backend validation returns false
- Console has SEVERE errors
- Firestore state doesn't match UI
- Test times out

---

## 📍 KEY FILES

| File | Purpose |
|------|---------|
| `tests/test_complete_user_journeys.py` | Main test (817 lines) |
| `tests/utils/backend_validator.py` | Firebase validation |
| `run_e2e_test.sh` | One-command runner |
| `tests/preflight_check.py` | Pre-test verification |

---

## 📸 WHERE OUTPUTS GO

```
tests/reports/
├── e2e_report_<timestamp>.json     # All logs in JSON
└── screenshots/                     # 9-10 PNG files
    ├── landing_page_*.png
    ├── pdp_view_*.png
    ├── customer_journey_complete_*.png
    ├── vendor_dashboard_*.png
    └── admin_dashboard_*.png
```

---

## 🔐 LOGIN CREDENTIALS

All built-in. Just run:

```
Customer: customer1@zilacart.com / password123
Vendor:   vendor1@zilacart.com / password123
Admin:    admin@zilacart.com / password123
```

---

## ⚙️ ENVIRONMENT SETUP

```bash
# One-time setup
pip install -r tests/requirements_e2e.txt

# Before each test run
export BASE_URL=http://localhost:3000
npm run dev  # In separate terminal

# Run test
python -m pytest tests/test_complete_user_journeys.py -v -s
```

---

## 🐛 QUICK TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| Server not running | `npm run dev` |
| Element not found | Check screenshot, update XPath |
| Timeout | Increase wait (15s default) |
| Firestore validation failed | **CRITICAL** - backend issue |
| Chrome not found | `pip install webdriver-manager` |

---

## 📊 EXPECTED OUTPUT

```
========================================
✅ ✅ ✅ COMPLETE E2E TEST PASSED ✅ ✅ ✅
========================================
All 3 user journeys verified successfully!
  - Customer: Login → Browse → Add to Cart → Checkout Ready
  - Vendor: Login → Dashboard Accessible
  - Admin: Login → Dashboard Accessible
========================================

📊 Report saved to: tests/reports/e2e_report_<timestamp>.json
📸 Screenshots in: tests/reports/screenshots/
```

---

## 🎯 MISSION CHECKLIST

- [ ] Run preflight check → PASS
- [ ] Start server → Running
- [ ] Run test → PASS
- [ ] Check report → All logs present
- [ ] Check screenshots → Visually correct
- [ ] Run 2nd time → PASS (stability)
- [ ] Run 3rd time → PASS (stable)
- [ ] Review Firestore → Data correct
- [ ] Get approval → YES
- [ ] Deploy → NOW

---

## 💡 PRO TIPS

### Run faster (skip some validations)
```bash
export SKIP_SCREENSHOTS=true
export SKIP_RESPONSIVE=true
```

### Run headless (CI/CD)
```bash
export HEADLESS=true
```

### Keep browser open on failure
```bash
export KEEP_BROWSER_OPEN=true
```

### Detailed output
```bash
python -m pytest tests/test_complete_user_journeys.py -v -s --tb=long
```

---

## 📚 MORE INFO

- Full guide: `E2E_MISSION_COMPLETE.md`
- Shipping steps: `ACTION_PLAN_SHIPPING.md`
- Test docs: `tests/README_E2E.md`
- Manifest: `E2E_TEST_DELIVERY_MANIFEST.md`

---

## 🚀 YOUR NEXT COMMAND

```bash
python tests/preflight_check.py
```

**Green?** You're ready to ship. ✅

---

**No fluff. Pure execution. Ship it.** 🔥
