# SDET Test Framework Setup

## Requirements

```bash
pip install selenium pytest pytest-xdist pytest-timeout webdriver-manager python-dotenv requests
```

## Project Structure

```
tests/
├── __init__.py
├── config.py                # Test configuration
├── base_test.py             # Base test class
├── conftest.py              # Pytest fixtures & hooks
├── pages/                   # Page Objects
│   ├── __init__.py
│   ├── base_page.py         # Base page class
│   ├── checkout_page.py     # Checkout PO
│   └── product_details_page.py  # PDP PO
├── utils/                   # Utilities
│   ├── __init__.py
│   ├── logger.py            # Logging
│   ├── wait_helper.py       # Wait strategies
│   ├── screenshot.py        # Screenshots
│   └── browser_helper.py    # Browser management
├── fixtures/                # Test data fixtures
│   ├── __init__.py
│   ├── test_user.py         # User fixtures
│   ├── test_products.py     # Product fixtures
│   └── test_data.py         # Test data
├── suites/                  # Test suites
│   ├── __init__.py
│   ├── test_checkout.py     # Checkout tests
│   ├── test_product_details.py  # PDP tests
│   └── test_paypal.py       # PayPal tests
└── reports/                 # Reports
    ├── screenshots/         # Test screenshots
    └── logs/                # Test logs
```

## Configuration

Configure via `.env` file:

```
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000/api
HEADLESS=false
PAYPAL_EMAIL=sb-t5anz42281618@personal.example.com
PAYPAL_PASSWORD=87C;nFe_
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_SECRET=your_secret
TEST_EMAIL=test@example.com
TEST_PASSWORD=Test@12345
```

## Running Tests

### Run all tests
```bash
pytest tests/
```

### Run specific test suite
```bash
pytest tests/suites/test_checkout.py
```

### Run specific test
```bash
pytest tests/suites/test_checkout.py::TestCheckoutFlow::test_checkout_page_loads
```

### Run smoke tests only
```bash
pytest tests/ -m smoke
```

### Run E2E tests
```bash
pytest tests/ -m e2e
```

### Run in headless mode
```bash
HEADLESS=true pytest tests/
```

### Run with screenshots on failure
```bash
pytest tests/ --tb=short
```

### Parallel execution (4 workers)
```bash
pytest tests/ -n 4
```

### With coverage report
```bash
pytest tests/ --cov=tests --cov-report=html
```

## Test Markers

- `@pytest.mark.smoke` - Quick smoke tests
- `@pytest.mark.regression` - Full regression tests
- `@pytest.mark.e2e` - End-to-end tests
- `@pytest.mark.api` - API tests
- `@pytest.mark.integration` - Integration tests

## Page Object Model

All pages inherit from `BasePage` which provides:

```python
# Navigation
navigate_to_page(path)
navigate_to_url(url)

# Waits
wait_for_element(locator, timeout)
wait_for_clickable(locator, timeout)
wait_for_url_contains(url_fragment, timeout)

# Interactions
click(locator, timeout)
type_text(locator, text, timeout)
get_text(locator, timeout)
get_attribute(locator, attribute, timeout)

# Assertions
assert_url_contains(url_fragment)
assert_element_visible(locator)
assert_text_in_element(locator, text)
```

## Creating New Tests

```python
import pytest
from tests.base_test import BaseTest

@pytest.mark.e2e
class TestNewFeature(BaseTest):
    """New feature tests"""
    
    def test_something(self):
        """Test description"""
        self.log_step(1, "Do something")
        self.checkout_page.navigate_to_checkout()
        
        self.log_step(2, "Verify something")
        assert self.checkout_page.assert_checkout_page_loaded()
        
        self.log_success("Test passed")
```

## Logging

All tests use a centralized logger:

```python
self.log_step(1, "Step description")
self.log_success("Success message")
self.log_error("Error message")
self.log_warning("Warning message")
```

## Screenshots

Automatic screenshots on failure, or manual:

```python
self.take_screenshot("my_screenshot")
self.take_failure_screenshot("test_name")
```

Screenshots saved to: `tests/reports/screenshots/`

## Best Practices

1. **Use Page Objects** - All interactions through page objects
2. **Explicit Waits** - Always use wait helpers, not sleeps
3. **Descriptive Names** - Clear test and method names
4. **Single Responsibility** - One assertion per test
5. **Setup/Teardown** - Use fixtures for setup
6. **Logging** - Log all steps for debugging
7. **Markers** - Use pytest markers for test organization
8. **DRY** - Extract common patterns to base classes

## Troubleshooting

### WebDriver not found
```bash
# webdriver-manager handles this automatically
# Or manually install ChromeDriver
pip install webdriver-manager
```

### Timeouts
Increase timeout in `config.py`:
```python
explicit_wait: int = 30  # Increase from 20
```

### Tests failing in headless
Some elements may not render properly. Check with:
```bash
HEADLESS=false pytest tests/suites/test_checkout.py::TestCheckoutFlow::test_name
```

### Screenshots not saving
Check directory permissions:
```bash
mkdir -p tests/reports/screenshots tests/reports/logs
```

## Advanced Features

### Custom Wait Conditions
```python
from tests.utils.wait_helper import WaitHelper

WaitHelper.wait_for_condition(
    self.driver,
    lambda driver: driver.find_element(...).is_displayed()
)
```

### Browser Helpers
```python
from tests.utils.browser_helper import BrowserHelper

# Get driver with custom options
driver = BrowserHelper.get_driver(
    browser="chrome",
    headless=True,
    window_width=1920,
    window_height=1080
)
```

### Logging
```python
from tests.utils.logger import Logger

logger = Logger.get_logger("my_module")
Logger.log_step(logger, 1, "Step description")
Logger.log_success(logger, "Success!")
```

---

**Happy Testing!** 🚀
