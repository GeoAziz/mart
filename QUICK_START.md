# ⚡ QUICK START CARD - E2E TESTING

## 🎬 EXECUTE IN 3 STEPS

### Step 1️⃣ : Start Server
```bash
npm run dev
# Wait for: "ready - started server on 0.0.0.0:3000"
```

### Step 2️⃣ : Run Test
```bash
bash tests/run_e2e.sh
```

### Step 3️⃣ : View Results
```bash
# Report opens automatically in browser
# Or open manually: tests/reports/logs/report.html
# Screenshots: tests/reports/screenshots/
```

---

## 🔧 ONE-TIME SETUP
```bash
pip install -r tests/requirements_e2e.txt
```

---

## 📊 WHAT GETS TESTED

✅ Landing page & navigation  
✅ Customer login & shopping  
✅ Add to cart & wishlist  
✅ Checkout flow  
✅ Vendor login & dashboard  
✅ Admin login & management  
✅ System health checks  

---

## 📍 EXPECTED RESULT

```
✅ All 4 phases passed
✅ 50+ steps completed  
✅ 0 errors
✅ ~45 minutes duration
✅ Ready to ship
```

---

## 🔍 DIAGNOSE ISSUES
```bash
bash tests/diagnose.sh
```

---

## 🐛 DEBUG SINGLE PHASE

Example: Run only customer journey
```bash
BASE_URL=http://localhost:3000 python -m pytest \
  tests/test_complete_journey.py::TestCompleteUserJourney::test_phase_2_customer_journey \
  -v -s
```

---

## 🔑 TEST CREDENTIALS

| Role | Email | Password |
|------|-------|----------|
| Customer | customer1@zilacart.com | password123 |
| Vendor | vendor1@zilacart.com | password123 |
| Admin | admin@zilacart.com | password123 |

---

## 📂 FILES

```
tests/test_complete_journey.py   ← Main test (850 lines)
tests/run_e2e.sh                 ← Runner script
tests/diagnose.sh                ← Pre-flight checks
tests/requirements_e2e.txt       ← Dependencies
E2E_EXECUTION_GUIDE.md           ← Detailed how-to
E2E_MISSION_SUMMARY.md           ← Full documentation
QUICK_START.md                   ← This file
```

---

## ✨ KEY FEATURES

🎬 Real browser automation (watch it run)  
📸 Screenshots on every step  
📊 HTML report with timing  
🔐 All 3 user types tested  
⚡ 40-50 min total duration  
🚀 One command to execute  

---

## 🚨 COMMON ISSUES

| Issue | Fix |
|-------|-----|
| Chrome not found | Install: `brew install chromedriver` |
| Port 3000 taken | Kill: `lsof -ti:3000 \| xargs kill -9` |
| Connection refused | Start dev server first |
| Login fails | Check `CREDENTIALS.md` |
| Timeout | Increase wait time in test |

---

## ✅ SUCCESS CHECKLIST

- [ ] Dev server running (`npm run dev`)
- [ ] Dependencies installed (`pip install -r tests/requirements_e2e.txt`)
- [ ] Test script executable (`chmod +x tests/run_e2e.sh`)
- [ ] Chrome installed (`chrome --version`)
- [ ] `.env` configured (Firebase + PayPal)

---

## 🎯 SHIP GATE

All pass? Ready to ship:
```bash
✅ 3 consecutive passes
✅ <50 min total time
✅ 0 errors
✅ HTML report generated
✅ All phases complete
```

---

## 📞 QUICK HELP

```bash
# View logs
cat tests/reports/logs/report.html

# View screenshots
ls tests/reports/screenshots/

# Run specific test
python -m pytest tests/test_complete_journey.py::TestCompleteUserJourney::test_phase_2_customer_journey -v

# Run with verbose output
BASE_URL=http://localhost:3000 pytest tests/test_complete_journey.py -vv -s

# Run headless (no browser window)
HEADLESS=true bash tests/run_e2e.sh
```

---

## 🚀 READY?

```bash
npm run dev &
sleep 2
bash tests/run_e2e.sh
```

**That's it. Execute. Ship. Celebrate. 🎉**

---

**Duration**: ~45 minutes  
**User Journeys**: 3 (Customer, Vendor, Admin)  
**Test Steps**: 50+  
**Success Rate Target**: 100%  
**Status**: ✅ READY  
