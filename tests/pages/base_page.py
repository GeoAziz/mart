"""Base Page Object Model"""
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from typing import Optional, List
from tests.utils.wait_helper import WaitHelper
from tests.utils.logger import Logger
import logging


class BasePage:
    """Base class for all page objects"""
    
    def __init__(self, driver: WebDriver, base_url: str = "http://localhost:3000"):
        self.driver = driver
        self.base_url = base_url
        self.wait = WaitHelper()
        self.logger = Logger.get_logger(self.__class__.__name__)
    
    # ==================== Navigation ====================
    def navigate_to_page(self, path: str = ""):
        """Navigate to page"""
        url = f"{self.base_url}{path}"
        self.logger.info(f"Navigating to: {url}")
        self.driver.get(url)
    
    def navigate_to_url(self, url: str):
        """Navigate to absolute URL"""
        self.logger.info(f"Navigating to: {url}")
        self.driver.get(url)
    
    def refresh_page(self):
        """Refresh current page"""
        self.driver.refresh()
    
    def go_back(self):
        """Go back to previous page"""
        self.driver.back()
    
    def go_forward(self):
        """Go forward to next page"""
        self.driver.forward()
    
    def get_current_url(self) -> str:
        """Get current URL"""
        return self.driver.current_url
    
    # ==================== Waits ====================
    def wait_for_element(
        self,
        locator: tuple,
        timeout: int = None
    ) -> Optional[WebElement]:
        """Wait for element to be visible"""
        timeout = timeout or 20
        return self.wait.wait_for_element_visible(self.driver, locator, timeout)
    
    def wait_for_elements(
        self,
        locator: tuple,
        timeout: int = None
    ) -> List[WebElement]:
        """Wait for multiple elements to be visible"""
        timeout = timeout or 20
        return self.wait.wait_for_elements_visible(self.driver, locator, timeout)
    
    def wait_for_clickable(
        self,
        locator: tuple,
        timeout: int = None
    ) -> Optional[WebElement]:
        """Wait for element to be clickable"""
        timeout = timeout or 20
        return self.wait.wait_for_element_clickable(self.driver, locator, timeout)
    
    def wait_for_url_contains(self, url_fragment: str, timeout: int = 20) -> bool:
        """Wait for URL to contain fragment"""
        return self.wait.wait_for_url_contains(self.driver, url_fragment, timeout)
    
    def wait_for_invisible(self, locator: tuple, timeout: int = 20) -> bool:
        """Wait for element to be invisible"""
        return self.wait.wait_for_element_invisible(self.driver, locator, timeout)
    
    # ==================== Element Interactions ====================
    def click(self, locator: tuple, timeout: int = 20) -> bool:
        """Click element safely"""
        try:
            element = self.wait_for_clickable(locator, timeout)
            if element:
                element.click()
                self.logger.info(f"Clicked element: {locator}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Failed to click element {locator}: {e}")
            return False
    
    def type_text(self, locator: tuple, text: str, timeout: int = 20) -> bool:
        """Type text into element"""
        try:
            element = self.wait_for_element(locator, timeout)
            if element:
                element.clear()
                element.send_keys(text)
                self.logger.info(f"Typed text '{text}' into {locator}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Failed to type text into {locator}: {e}")
            return False
    
    def get_text(self, locator: tuple, timeout: int = 20) -> Optional[str]:
        """Get element text"""
        try:
            element = self.wait_for_element(locator, timeout)
            if element:
                text = element.text
                self.logger.info(f"Got text '{text}' from {locator}")
                return text
            return None
        except Exception as e:
            self.logger.error(f"Failed to get text from {locator}: {e}")
            return None
    
    def get_attribute(self, locator: tuple, attribute: str, timeout: int = 20) -> Optional[str]:
        """Get element attribute"""
        try:
            element = self.wait_for_element(locator, timeout)
            if element:
                attr_value = element.get_attribute(attribute)
                self.logger.info(f"Got attribute '{attribute}={attr_value}' from {locator}")
                return attr_value
            return None
        except Exception as e:
            self.logger.error(f"Failed to get attribute from {locator}: {e}")
            return None
    
    def is_element_visible(self, locator: tuple, timeout: int = 5) -> bool:
        """Check if element is visible"""
        element = self.wait_for_element(locator, timeout)
        return element is not None
    
    def is_element_present(self, locator: tuple) -> bool:
        """Check if element is present in DOM"""
        try:
            self.driver.find_element(*locator)
            return True
        except:
            return False
    
    # ==================== JavaScript ====================
    def execute_script(self, script: str, *args):
        """Execute JavaScript"""
        return self.driver.execute_script(script, *args)
    
    def scroll_to_element(self, locator: tuple) -> bool:
        """Scroll to element"""
        try:
            element = self.wait_for_element(locator)
            if element:
                self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
                self.logger.info(f"Scrolled to element: {locator}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Failed to scroll to element {locator}: {e}")
            return False
    
    def scroll_to_top(self):
        """Scroll to top of page"""
        self.execute_script("window.scrollTo(0, 0);")
    
    def scroll_to_bottom(self):
        """Scroll to bottom of page"""
        self.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    
    def get_page_title(self) -> str:
        """Get page title"""
        return self.driver.title
    
    def get_page_source(self) -> str:
        """Get page source"""
        return self.driver.page_source
    
    # ==================== Assertions ====================
    def assert_url_contains(self, url_fragment: str) -> bool:
        """Assert URL contains fragment"""
        current_url = self.get_current_url()
        result = url_fragment in current_url
        if result:
            self.logger.info(f"✅ URL contains '{url_fragment}'")
        else:
            self.logger.error(f"❌ URL does not contain '{url_fragment}'. Current URL: {current_url}")
        return result
    
    def assert_element_visible(self, locator: tuple, message: str = "") -> bool:
        """Assert element is visible"""
        visible = self.is_element_visible(locator)
        if visible:
            self.logger.info(f"✅ Element is visible: {locator} {message}")
        else:
            self.logger.error(f"❌ Element is not visible: {locator} {message}")
        return visible
    
    def assert_text_in_element(self, locator: tuple, expected_text: str) -> bool:
        """Assert text is in element"""
        actual_text = self.get_text(locator)
        result = expected_text in (actual_text or "")
        if result:
            self.logger.info(f"✅ Text '{expected_text}' found in element {locator}")
        else:
            self.logger.error(f"❌ Text '{expected_text}' not found. Got: '{actual_text}'")
        return result
