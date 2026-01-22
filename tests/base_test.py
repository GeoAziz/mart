"""Base Test Class"""
import pytest
import logging
from selenium.webdriver.remote.webdriver import WebDriver
from tests.config import CONFIG, TestConfig
from tests.utils.browser_helper import BrowserHelper
from tests.utils.screenshot import ScreenshotManager
from tests.utils.logger import Logger
from tests.pages import BasePage, CheckoutPage, ProductDetailsPage


class BaseTest:
    """Base class for all test classes"""
    
    # Will be set by pytest fixtures
    driver: WebDriver
    config: TestConfig
    logger: logging.Logger
    
    # Page objects
    base_page: BasePage
    checkout_page: CheckoutPage
    product_details_page: ProductDetailsPage
    
    @classmethod
    def setup_class(cls):
        """Setup for test class"""
        cls.config = CONFIG
        cls.logger = Logger.get_logger(cls.__name__)
        cls.logger.info(f"Setting up test class: {cls.__name__}")
    
    def setup_method(self, method):
        """Setup before each test"""
        self.logger.info(f"\n{'='*70}")
        self.logger.info(f"Starting test: {method.__name__}")
        self.logger.info(f"{'='*70}")
        
        # Initialize page objects
        self.base_page = BasePage(self.driver, self.config.base_url)
        self.checkout_page = CheckoutPage(self.driver, self.config.base_url)
        self.product_details_page = ProductDetailsPage(self.driver, self.config.base_url)
    
    def teardown_method(self, method):
        """Cleanup after each test"""
        self.logger.info(f"Completed test: {method.__name__}")
    
    @classmethod
    def teardown_class(cls):
        """Cleanup for test class"""
        cls.logger.info(f"Tearing down test class: {cls.__name__}")
    
    # ==================== Helper Methods ====================
    def take_screenshot(self, name: str = "screenshot") -> str:
        """Take screenshot"""
        return ScreenshotManager.take_screenshot(
            self.driver,
            self.config.screenshots_dir,
            name
        )
    
    def take_failure_screenshot(self, test_name: str) -> str:
        """Take screenshot on failure"""
        return ScreenshotManager.take_screenshot_on_failure(
            self.driver,
            self.config.screenshots_dir,
            test_name
        )
    
    def navigate_to(self, path: str):
        """Navigate to page"""
        url = f"{self.config.base_url}{path}"
        self.logger.info(f"Navigating to: {url}")
        self.driver.get(url)
    
    def refresh_page(self):
        """Refresh current page"""
        self.driver.refresh()
    
    def wait(self, seconds: float):
        """Wait for specified seconds"""
        import time
        time.sleep(seconds)
    
    def log_step(self, step_num: int, message: str):
        """Log test step"""
        Logger.log_step(self.logger, step_num, message)
    
    def log_success(self, message: str):
        """Log success"""
        Logger.log_success(self.logger, message)
    
    def log_error(self, message: str):
        """Log error"""
        Logger.log_error(self.logger, message)
    
    def log_warning(self, message: str):
        """Log warning"""
        Logger.log_warning(self.logger, message)
