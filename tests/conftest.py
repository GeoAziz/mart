"""Pytest configuration and fixtures"""
import pytest
import logging
from selenium.webdriver.remote.webdriver import WebDriver
from tests.config import CONFIG
from tests.utils.browser_helper import BrowserHelper
from tests.utils.screenshot import ScreenshotManager
from tests.utils.logger import Logger


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


@pytest.fixture(scope="session")
def config():
    """Provide test configuration"""
    return CONFIG


@pytest.fixture(scope="function")
def driver(config) -> WebDriver:
    """Create WebDriver instance for each test"""
    logger = Logger.get_logger("driver_fixture")
    
    logger.info(f"Creating {config.browser.value} WebDriver (headless={config.headless})")
    
    web_driver = BrowserHelper.get_driver(
        browser=config.browser.value,
        headless=config.headless,
        window_width=config.window_width,
        window_height=config.window_height
    )
    
    if web_driver:
        web_driver.implicitly_wait(config.implicit_wait)
        web_driver.set_page_load_timeout(config.page_load_timeout)
    
    yield web_driver
    
    # Cleanup
    if web_driver:
        logger.info("Closing WebDriver")
        BrowserHelper.close_driver(web_driver)


@pytest.fixture(scope="function", autouse=True)
def take_screenshot_on_failure(driver, config, request):
    """Take screenshot on test failure"""
    yield
    
    if request.node.rep_call.failed if hasattr(request.node, "rep_call") else False:
        if config.take_screenshots_on_failure:
            logger = Logger.get_logger("screenshot_on_failure")
            logger.warning(f"Test failed: {request.node.name}. Taking screenshot...")
            
            ScreenshotManager.take_screenshot_on_failure(
                driver,
                config.screenshots_dir,
                request.node.name
            )


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Make test result available to fixtures"""
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)


def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line(
        "markers", "smoke: mark test as smoke test"
    )
    config.addinivalue_line(
        "markers", "regression: mark test as regression test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as end-to-end test"
    )
    config.addinivalue_line(
        "markers", "api: mark test as API test"
    )
